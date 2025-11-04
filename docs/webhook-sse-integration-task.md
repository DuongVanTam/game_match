# Task: Tích hợp Webhooks và SSE cho Thanh toán

## Tổng quan

Hiện tại hệ thống đang sử dụng **polling** (gọi API mỗi 3 giây) để kiểm tra trạng thái thanh toán sau khi người dùng hoàn tất thanh toán trên PayOS. Điều này gây ra:

- Lãng phí tài nguyên (nhiều request không cần thiết)
- Độ trễ trong việc cập nhật trạng thái (tối đa 3 giây)
- Tải không cần thiết lên server và database

**Mục tiêu**: Thay thế polling bằng **Server-Sent Events (SSE)** để push real-time updates từ webhook handler đến client khi trạng thái thanh toán thay đổi.

## Trạng thái hiện tại

### Webhook Handler (`/api/payos/webhook/route.ts`)

- ✅ Đã có endpoint xử lý webhook từ PayOS
- ✅ Verify signature với HMAC-SHA256
- ✅ Cập nhật database (topups, wallets, ledger) khi thanh toán thành công/thất bại
- ❌ Chưa có cơ chế notify client về sự thay đổi

### Client-side (`/wallet/topup/page.tsx`)

- ✅ Sử dụng `useEffect` với polling interval 3 giây
- ✅ Kiểm tra status qua `/api/topup/status?tx_ref=...`
- ❌ Chưa có SSE connection để nhận real-time updates

## Yêu cầu kỹ thuật

### 1. SSE Endpoint (`/api/topup/stream`)

- Tạo endpoint SSE để client subscribe vào updates cho một `tx_ref` cụ thể
- Authentication: yêu cầu user đăng nhập và chỉ được subscribe vào các giao dịch của chính họ
- Broadcast mechanism: khi webhook nhận được update, gửi event đến tất cả clients đang subscribe vào `tx_ref` đó
- Heartbeat: gửi comment mỗi 30 giây để giữ connection alive
- Error handling: đóng connection gracefully khi có lỗi

### 2. Cập nhật Webhook Handler

- Sau khi cập nhật database thành công, broadcast event qua SSE channel
- Event payload: `{ tx_ref, status, amount, confirmed_at, ... }`
- Idempotency: đảm bảo không duplicate events khi webhook được gọi nhiều lần

### 3. Client-side SSE Integration

- Thay thế polling logic bằng SSE connection
- Subscribe vào `/api/topup/stream?tx_ref=...` sau khi init topup
- Handle các events: `status-update`, `error`, `heartbeat`
- Auto-reconnect khi connection bị đứt
- Cleanup connection khi component unmount hoặc payment completed

### 4. Broadcast Manager (Optional - cho scale)

- Có thể sử dụng Redis Pub/Sub hoặc in-memory EventEmitter
- Map `tx_ref` → Set of SSE connections
- Broadcast events đến tất cả connections subscribe vào `tx_ref`

## Implementation Plan

### Phase 1: SSE Infrastructure Setup

#### 1.1. Tạo SSE endpoint (`src/app/api/topup/stream/route.ts`)

```typescript
// Features:
// - GET endpoint với query param tx_ref
// - Authentication check
// - Setup SSE response headers
// - Manage active connections (in-memory Map or Redis)
// - Heartbeat mechanism
// - Error handling & cleanup
```

**Acceptance Criteria:**

- [ ] Endpoint trả về SSE stream với proper headers
- [ ] Chỉ authenticated users mới có thể subscribe
- [ ] User chỉ có thể subscribe vào tx_ref của chính họ
- [ ] Heartbeat gửi mỗi 30 giây
- [ ] Connection cleanup khi client disconnect

#### 1.2. Broadcast Manager (`src/lib/broadcast.ts`)

```typescript
// Features:
// - Map<tx_ref, Set<SSE_Connection>>
// - subscribe(tx_ref, connection)
// - unsubscribe(tx_ref, connection)
// - broadcast(tx_ref, event)
// - cleanup()
```

**Acceptance Criteria:**

- [ ] Có thể subscribe/unsubscribe connections
- [ ] Broadcast events đến tất cả subscribers của một tx_ref
- [ ] Cleanup connections khi disconnect
- [ ] Thread-safe (nếu dùng in-memory)

### Phase 2: Webhook Integration

#### 2.1. Cập nhật Webhook Handler

```typescript
// Changes to /api/payos/webhook/route.ts:
// - Sau khi update database thành công
// - Gọi broadcast.broadcast(tx_ref, { status, ... })
// - Handle cả success và failure cases
```

**Acceptance Criteria:**

- [ ] Webhook broadcast event khi status thay đổi
- [ ] Event payload đầy đủ thông tin cần thiết
- [ ] Không ảnh hưởng đến logic hiện tại nếu không có subscribers

#### 2.2. Thêm orderCode mapping

- Hiện tại webhook extract `tx_ref` từ description (không reliable)
- Nên lưu `order_code` vào topups table khi init
- Match webhook với topup record bằng `order_code` thay vì parse description

**Acceptance Criteria:**

- [ ] Lưu `order_code` vào topups table khi init
- [ ] Webhook match topup bằng `order_code` (fallback về description nếu không có)
- [ ] Cập nhật database schema nếu cần

### Phase 3: Client-side Integration

#### 3.1. SSE Hook (`src/hooks/useTopupSSE.ts`)

```typescript
// Features:
// - Connect to SSE endpoint
// - Handle events (status-update, error, heartbeat)
// - Auto-reconnect on disconnect
// - Return current status, error state
// - Cleanup on unmount
```

**Acceptance Criteria:**

- [ ] Hook kết nối SSE endpoint với tx_ref
- [ ] Nhận và parse events đúng format
- [ ] Auto-reconnect khi connection drop
- [ ] Cleanup khi component unmount
- [ ] Handle errors gracefully

#### 3.2. Cập nhật Topup Page

```typescript
// Changes to /wallet/topup/page.tsx:
// - Replace polling useEffect với useTopupSSE hook
// - Update UI dựa trên SSE events
// - Remove polling logic
```

**Acceptance Criteria:**

- [ ] Loại bỏ polling logic
- [ ] Sử dụng SSE hook để nhận updates
- [ ] UI cập nhật real-time khi nhận event
- [ ] Error handling và loading states hoạt động đúng

### Phase 4: Testing & Edge Cases

#### 4.1. Unit Tests

- [ ] Test SSE endpoint authentication
- [ ] Test broadcast manager subscribe/unsubscribe
- [ ] Test webhook broadcast logic
- [ ] Test SSE hook connection và reconnection

#### 4.2. Integration Tests

- [ ] Test end-to-end flow: init → webhook → SSE event → UI update
- [ ] Test multiple clients subscribe cùng tx_ref
- [ ] Test webhook retry không gây duplicate events
- [ ] Test connection timeout và cleanup

#### 4.3. Edge Cases

- [ ] Client disconnect trước khi webhook đến
- [ ] Webhook đến nhưng không có subscribers
- [ ] Multiple webhooks cho cùng một order
- [ ] SSE connection timeout
- [ ] Invalid tx_ref trong SSE request

## Database Changes

### Schema Updates

```sql
-- Thêm order_code vào topups table để match với PayOS webhook
ALTER TABLE topups
ADD COLUMN order_code INTEGER;

-- Index cho order_code để query nhanh
CREATE INDEX idx_topups_order_code ON topups(order_code);

-- Note: order_code có thể null (cho các payment method khác PayOS)
```

## Security Considerations

1. **Authentication**: SSE endpoint phải verify user và chỉ cho phép subscribe vào tx_ref của chính user đó
2. **Rate Limiting**: Giới hạn số lượng SSE connections per user
3. **Validation**: Validate tx_ref format và ownership trước khi subscribe
4. **Webhook Security**: Giữ nguyên signature verification cho PayOS webhook

## Performance Considerations

1. **Connection Limits**: Monitor số lượng active SSE connections
2. **Memory Management**: Cleanup connections khi không còn cần thiết
3. **Scalability**: Nếu scale lên nhiều servers, cần Redis Pub/Sub thay vì in-memory
4. **Heartbeat Interval**: Balance giữa keep-alive và server load

## Rollout Plan

1. **Phase 1-2**: Deploy SSE infrastructure và webhook updates (behind feature flag)
2. **Phase 3**: Deploy client changes nhưng giữ polling làm fallback
3. **Monitor**: Theo dõi SSE connections, error rates, và webhook processing
4. **Phase 4**: Remove polling logic sau khi confirm SSE hoạt động ổn định

## Fallback Strategy

- Nếu SSE connection fail, fallback về polling
- Nếu webhook không broadcast được, polling vẫn hoạt động như backup
- Log errors để debug và improve

## Success Metrics

- ✅ Giảm số lượng API calls (từ polling → SSE push)
- ✅ Giảm latency trong việc cập nhật trạng thái (< 1 giây thay vì tối đa 3 giây)
- ✅ Improved user experience (real-time updates)
- ✅ Không có regression trong payment flow hiện tại

## Related Files

- `src/app/api/payos/webhook/route.ts` - Webhook handler cần update
- `src/app/api/topup/status/route.ts` - Status endpoint (có thể giữ làm fallback)
- `src/app/wallet/topup/page.tsx` - Client page cần update
- `src/lib/payos.ts` - PayOS service (có thể cần thêm helpers)
- `src/app/api/topup/init/route.ts` - Cần lưu order_code vào topups

## Notes

- SSE được hỗ trợ tốt trên modern browsers
- Có thể cần polyfill hoặc fallback cho older browsers
- Vercel hỗ trợ SSE nhưng cần test với edge functions
- Consider WebSocket nếu cần bidirectional communication trong tương lai
