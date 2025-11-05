# SSE & Webhook Debugging Guide

## Vấn đề: SSE không nhận được event từ webhook

### Nguyên nhân chính

**Serverless Architecture trên Vercel:**

- Mỗi function invocation có thể chạy trên một serverless instance khác nhau
- Client kết nối SSE đến instance A
- Webhook nhận được ở instance B
- Instance B broadcast event, nhưng client đang subscribe trên instance A → **KHÔNG nhận được event!**

### Luồng hiện tại

```
1. User tạo topup → Init API (Instance 1)
2. Client kết nối SSE → /api/topup/stream (Instance 2)
   - BroadcastManager trên Instance 2 lưu connection
3. PayOS gửi webhook → /api/payos/webhook (Instance 3)
   - BroadcastManager trên Instance 3 broadcast event
   - ❌ Client không nhận được vì đang ở Instance 2 khác!
```

## Giải pháp đã implement

### 1. **Logging để debug**

- Log khi SSE connection được establish
- Log số lượng connections khi broadcast
- Log khi webhook nhận được và broadcast
- Log khi client nhận được SSE events

### 2. **Fallback Polling**

- Nếu SSE không kết nối được sau 5 giây → bắt đầu polling
- Poll mỗi 3 giây trong tối đa 3 phút
- Đảm bảo client vẫn nhận được update ngay cả khi SSE fail

### 3. **Connection Status Display**

- Hiển thị trạng thái kết nối SSE trên UI
- User có thể thấy nếu SSE đang hoạt động

## Cách kiểm tra

### 1. Kiểm tra logs trên Vercel

**Khi client kết nối SSE:**

```
SSE connection established for tx_ref: TFT_xxx, user: user_id, total connections: 1
```

**Khi webhook nhận được:**

```
Broadcasting SSE event for tx_ref: TFT_xxx
Active SSE connections for tx_ref: TFT_xxx = 0  ← NẾU = 0 thì không có client nào đang listen!
```

**Khi broadcast:**

```
Broadcasting status-update to 1 connection(s) for tx_ref: TFT_xxx
Successfully broadcasted to 1/1 connection(s) for tx_ref: TFT_xxx
```

### 2. Kiểm tra trong browser console

**Khi SSE kết nối:**

```
SSE connection opened for tx_ref: TFT_xxx
```

**Khi nhận được event:**

```
SSE status-update received: { tx_ref: "TFT_xxx", status: "confirmed", ... }
SSE status update received in topup page: { ... }
```

**Nếu SSE không kết nối:**

```
SSE not connected, starting fallback polling for tx_ref: TFT_xxx
Polling status check result: { status: "confirmed", ... }
```

## Giải pháp dài hạn (Future)

### Option 1: Redis Pub/Sub (Recommended)

- Sử dụng Redis để broadcast events giữa các instances
- Khi webhook nhận được → publish vào Redis channel
- Tất cả SSE instances subscribe → broadcast đến clients của mình

### Option 2: Database Polling

- SSE endpoint poll database mỗi vài giây
- Khi thấy status thay đổi → broadcast event

### Option 3: Webhook → Database → Polling

- Webhook update database
- Client polling status endpoint (đã có fallback)

## Các điểm cần kiểm tra

1. ✅ Webhook có nhận được request từ PayOS không?
   - Check Vercel logs: `/api/payos/webhook`
   - Check PayOS dashboard: webhook URL đã được register chưa?

2. ✅ Webhook có match được topup record không?
   - Check logs: "Topup not found" hay "Active SSE connections = 0"
   - Verify `order_code` được lưu đúng khi init

3. ✅ SSE connection có được establish không?
   - Check browser console: "SSE connection opened"
   - Check Vercel logs: "SSE connection established"

4. ✅ Broadcast có được gọi không?
   - Check logs: "Broadcasting SSE event"
   - Check connection count: có > 0 không?

5. ✅ Client có nhận được event không?
   - Check browser console: "SSE status-update received"
   - Check UI: status có thay đổi không?

## Debug Commands

### Test webhook locally

```bash
# Use ngrok or similar to expose local server
curl -X POST http://localhost:3000/api/payos/webhook \
  -H "Content-Type: application/json" \
  -H "x-payos-signature: ..." \
  -d '{...webhook payload...}'
```

### Test SSE connection

```bash
# In browser console
const eventSource = new EventSource('/api/topup/stream?tx_ref=TFT_xxx');
eventSource.onmessage = (e) => console.log('SSE message:', e);
eventSource.addEventListener('status-update', (e) => console.log('Status update:', e.data));
```

## Next Steps

1. **Monitor logs** sau khi deploy để xem connection count
2. **Nếu connection count = 0** → SSE và webhook đang ở khác instances
3. **Implement Redis Pub/Sub** nếu cần scale và real-time reliable
