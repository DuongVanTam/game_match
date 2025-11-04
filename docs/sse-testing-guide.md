# Hướng dẫn Test SSE (Server-Sent Events)

## Tổng quan

SSE (Server-Sent Events) được sử dụng để push real-time updates về trạng thái thanh toán từ server đến client. Tài liệu này hướng dẫn cách test SSE trước khi deploy lên production.

## Cách Test SSE

### 1. Test Manual với Test Page (Khuyến nghị)

#### Bước 1: Truy cập Test Page

```
http://localhost:3000/test-sse
```

#### Bước 2: Tạo một Topup Transaction

1. Đăng nhập vào hệ thống
2. Đi đến `/wallet/topup`
3. Tạo một transaction topup (có thể dùng số tiền test)
4. Copy `tx_ref` từ transaction (ví dụ: `TFT_1234567890_abc123`)

#### Bước 3: Test SSE Connection

1. Quay lại `/test-sse`
2. Paste `tx_ref` vào field
3. Click **"Connect SSE"**
4. Kiểm tra:
   - Connection status chuyển sang "Connected" (màu xanh)
   - Event log hiển thị event `connected`
   - Heartbeat events xuất hiện mỗi 30 giây

#### Bước 4: Test Broadcast

1. Click **"Test Broadcast"** để simulate một status update
2. Kiểm tra Event Log có nhận được event `status-update` không
3. Event data phải chứa `tx_ref`, `status`, `amount`, etc.

#### Bước 5: Test Webhook Integration (Real-world)

1. Tạo một topup transaction thật từ PayOS
2. Hoàn tất thanh toán trên PayOS
3. Webhook sẽ tự động broadcast event qua SSE
4. Kiểm tra Event Log nhận được update không

### 2. Test với cURL

```bash
# Lưu ý: Bạn cần có session cookie từ browser

# 1. Lấy cookies từ browser (Chrome DevTools > Application > Cookies)
# Copy cookie header và thay vào COOKIE_HEADER

COOKIE_HEADER="sb-xxx-auth-token=eyJhbGc..."

# 2. Test SSE connection
curl -N -H "Cookie: $COOKIE_HEADER" \
  "http://localhost:3000/api/topup/stream?tx_ref=TFT_123_abc123"

# Bạn sẽ thấy output như:
# event: connected
# data: {"tx_ref":"TFT_123_abc123"}
#
# event: heartbeat
# data: {"tx_ref":"TFT_123_abc123"}
```

### 3. Test với Browser DevTools

1. Mở Chrome DevTools (F12)
2. Đi đến tab **Network**
3. Filter theo **EventStream** hoặc tìm request đến `/api/topup/stream`
4. Click vào request để xem:
   - **Headers**: Kiểm tra `Content-Type: text/event-stream`
   - **EventStream**: Xem các events được nhận
   - **Timing**: Kiểm tra connection có stable không

### 4. Test với Postman/Insomnia

SSE không được hỗ trợ trực tiếp trong Postman, nhưng bạn có thể:

1. Sử dụng **Newman** (Postman CLI) với custom script
2. Hoặc sử dụng **Insomnia** có hỗ trợ SSE
3. Hoặc dùng test page ở trên

## Test Scenarios

### ✅ Scenario 1: Connection Success

**Steps:**

1. Authenticated user
2. Valid tx_ref owned by user
3. Connect SSE

**Expected:**

- Connection status: Connected
- Event `connected` received
- Heartbeat events mỗi 30 giây

### ✅ Scenario 2: Authentication Failure

**Steps:**

1. Logout (hoặc không có session)
2. Try to connect SSE

**Expected:**

- Connection status: Disconnected
- Error: "Unauthorized" (401)
- Event log shows connection error

### ✅ Scenario 3: Invalid tx_ref

**Steps:**

1. Authenticated user
2. Invalid tx_ref format (ví dụ: `invalid_ref`)

**Expected:**

- Connection status: Disconnected
- Error: "Invalid tx_ref format" (400)

### ✅ Scenario 4: Unauthorized tx_ref

**Steps:**

1. Authenticated user A
2. Try to connect với tx_ref của user B

**Expected:**

- Connection status: Disconnected
- Error: "Forbidden" (403)

### ✅ Scenario 5: Broadcast Event

**Steps:**

1. Connected SSE với valid tx_ref
2. Click "Test Broadcast" hoặc trigger webhook

**Expected:**

- Event `status-update` received trong Event Log
- Event data chứa đầy đủ thông tin

### ✅ Scenario 6: Reconnection

**Steps:**

1. Connected SSE
2. Disconnect network (hoặc close tab)
3. Reconnect network

**Expected:**

- SSE hook tự động reconnect (up to 5 attempts)
- Connection status: Connected again

## Common Issues & Solutions

### Issue 1: "Connection error" ngay lập tức

**Causes:**

- Chưa đăng nhập (missing authentication)
- tx_ref không tồn tại
- tx_ref không thuộc về user hiện tại

**Solution:**

1. Kiểm tra bạn đã đăng nhập chưa
2. Kiểm tra tx_ref có đúng format không
3. Kiểm tra tx_ref có tồn tại trong database không
4. Kiểm tra bạn có quyền truy cập tx_ref đó không

### Issue 2: Connection bị đứt sau vài giây

**Causes:**

- Network timeout
- Server không send heartbeat
- Browser close connection

**Solution:**

1. Kiểm tra network connection
2. Kiểm tra heartbeat events có được gửi không (mỗi 30s)
3. Kiểm tra browser console có errors không

### Issue 3: Không nhận được status-update events

**Causes:**

- Webhook không broadcast event
- Broadcast manager không hoạt động
- Event bị drop

**Solution:**

1. Kiểm tra webhook handler có call `broadcastManager.broadcast()` không
2. Kiểm tra broadcast manager có active connections không
3. Test với "Test Broadcast" button trên test page

## Test Checklist trước khi Deploy

- [ ] SSE connection thành công với authenticated user
- [ ] Authentication failure được handle đúng (401)
- [ ] Invalid tx_ref được reject (400)
- [ ] Unauthorized tx_ref được reject (403)
- [ ] Heartbeat events được gửi mỗi 30 giây
- [ ] Status-update events được nhận khi webhook triggered
- [ ] Reconnection hoạt động sau khi disconnect
- [ ] Multiple connections cùng tx_ref đều nhận events
- [ ] Connection cleanup khi client disconnect
- [ ] Error handling hiển thị messages rõ ràng
- [ ] Test trên localhost và staging environment

## Production Considerations

1. **Rate Limiting**: SSE endpoint có thể cần rate limiting riêng
2. **Connection Limits**: Monitor số lượng concurrent SSE connections
3. **Memory Usage**: In-memory broadcast manager có thể cần Redis cho scale
4. **Timeout**: Đảm bảo connections được cleanup sau timeout
5. **Monitoring**: Log SSE connections và events để debug

## Next Steps

Sau khi test thành công:

1. Deploy lên staging environment
2. Test lại với real PayOS webhooks
3. Monitor SSE connections và performance
4. Deploy lên production sau khi verified
