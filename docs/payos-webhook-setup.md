# PayOS Webhook Setup Guide

## Vấn đề: Không thấy logs từ `/api/payos/webhook`

Nếu không thấy logs từ webhook endpoint, có thể do:

1. **Webhook URL chưa được register với PayOS** (quan trọng nhất!)
2. **PayOS chưa gửi webhook đến server**
3. **Webhook URL không đúng hoặc không accessible**

## ⚠️ Lưu ý quan trọng

**PayOS KHÔNG có giao diện Dashboard để đăng ký webhook!**

Bạn **PHẢI** đăng ký webhook thông qua **API hoặc SDK** của PayOS. Giao diện Dashboard không có tùy chọn này.

## Cách kiểm tra và setup

### 1. Kiểm tra Webhook URL hiện tại

**GET request:**

```bash
curl https://your-domain.com/api/payos/webhook/test
```

Hoặc trong browser:

```
https://your-domain.com/api/payos/webhook/test
```

Sẽ trả về:

```json
{
  "webhookUrl": "https://your-domain.com/api/payos/webhook",
  "message": "Configure this URL in PayOS dashboard",
  "instructions": [...]
}
```

### 2. Register Webhook qua API (Cách đúng!)

**POST request đến endpoint register:**

```bash
curl -X POST https://your-domain.com/api/payos/webhook/register \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "webhookUrl": "https://your-domain.com/api/payos/webhook"
  }'
```

**Hoặc từ browser console (sau khi đã login):**

```javascript
fetch('/api/payos/webhook/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    webhookUrl: 'https://game-match.net/api/payos/webhook',
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

**Endpoint này sử dụng PayOS SDK method `webhooks.confirm()` để đăng ký webhook.**

### 3. Kiểm tra PayOS API Documentation

PayOS sử dụng API `confirm-webhook` để đăng ký webhook. Endpoint register của chúng ta đã wrap API này.

Xem thêm: https://payos.vn/docs/api/

### 4. Test Webhook thủ công

**POST request đến test endpoint:**

```bash
curl -X POST https://your-domain.com/api/payos/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": 12345678,
    "code": "PAID",
    "amount": 100000,
    "description": "Test payment",
    ...
  }'
```

**Lưu ý:** Payload phải match với PayOS webhook format và có signature hợp lệ.

### 5. Kiểm tra Vercel Logs

**Cách xem logs:**

1. Vào Vercel Dashboard
2. Chọn project
3. Vào tab **Deployments**
4. Click vào deployment mới nhất
5. Vào tab **Functions** → tìm `/api/payos/webhook`
6. Hoặc vào tab **Logs** để xem real-time logs

**Tìm logs:**

- Filter: `api/payos/webhook`
- Hoặc search: `PAYOS WEBHOOK RECEIVED`

## Debugging Steps

### Step 1: Verify Webhook URL is accessible

```bash
# Test if endpoint exists
curl -X POST https://your-domain.com/api/payos/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `400 Bad Request` (vì thiếu signature) - nghĩa là endpoint đã accessible

### Step 2: Check PayOS Dashboard

1. Vào PayOS Dashboard
2. Kiểm tra webhook URL đã được set chưa
3. Xem webhook delivery logs (nếu có)

### Step 3: Test với PayOS Sandbox/Test Mode

1. Tạo test payment link
2. Thanh toán test
3. Check xem webhook có được gửi không

### Step 4: Check Vercel Environment Variables

Đảm bảo các biến sau đã được set:

- `PAYOS_CLIENT_ID`
- `PAYOS_API_KEY`
- `PAYOS_CHECKSUM_KEY`

## Logs để tìm

Sau khi setup xong, bạn sẽ thấy logs như:

```
=== PAYOS WEBHOOK RECEIVED ===
Timestamp: 2025-01-04T...
Raw body length: 245
Webhook verified successfully: { orderCode: 12345678, status: 'PAID', ... }
Broadcasting SSE event for tx_ref: TFT_...
Active SSE connections for tx_ref: TFT_... = 1
```

## Troubleshooting

### Không thấy logs từ webhook

1. **Check webhook URL đã register chưa:**
   - Vào PayOS Dashboard
   - Verify webhook URL matches với production URL

2. **Check PayOS có gửi webhook không:**
   - Xem PayOS dashboard logs
   - Check webhook delivery status (có thể có retry)

3. **Check Vercel logs với filter:**
   - Filter: `webhook` hoặc `payos`
   - Check cả production và preview deployments

4. **Test endpoint manually:**
   - Use `/api/payos/webhook/test` để test
   - Verify webhook processing logic

5. **Check webhook signature:**
   - PayOS có thể reject nếu signature không đúng
   - Verify `PAYOS_CHECKSUM_KEY` đúng

## Next Steps

1. Register webhook URL trong PayOS Dashboard
2. Test với một payment thật
3. Monitor Vercel logs để xem webhook có được nhận không
4. Nếu vẫn không thấy, check PayOS dashboard để xem có error không
