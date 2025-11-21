# Fix Middleware Timeout (504 GATEWAY_TIMEOUT)

## Vấn đề

Website thỉnh thoảng gặp lỗi **504: GATEWAY_TIMEOUT** với message **MIDDLEWARE_INVOCATION_TIMEOUT**.

### Nguyên nhân

1. **`supabase.auth.getSession()` trong middleware** (line 168-170)
   - Được gọi cho MỌI request (trừ static files)
   - Nếu Supabase Auth API chậm hoặc network kém → timeout

2. **Database query cho admin check** (line 189-194)
   - Thêm một database query → tăng thời gian xử lý
   - Vercel Edge Middleware có timeout nghiêm ngặt (~5-10 giây)

## Giải pháp đã triển khai

### 1. ✅ Tạo Timeout Utility (`src/lib/timeout.ts`)

- Wrapper function `withTimeoutOrNull()` để giới hạn thời gian cho async operations
- Trả về `null` thay vì throw error khi timeout (graceful degradation)
- Ngăn middleware crash khi Supabase chậm

```typescript
// Timeout wrapper
const sessionResult = await withTimeoutOrNull(
  supabase.auth.getSession(),
  MIDDLEWARE_AUTH_TIMEOUT_MS // 5 seconds
);
```

### 2. ✅ Skip Auth Check cho Public Routes

**Public routes** (không cần check session):

- `/` (homepage)
- `/auth/*` (login, register, etc)
- `/matches` (public listing)
- `/matches/[id]` (public match details)
- `/privacy`, `/terms`, `/faq`, `/contact`, `/how-it-works`
- `/api/auth/*`
- `/api/matches` (public API)

**Kết quả**: Giảm đáng kể số lượng calls đến Supabase Auth API

### 3. ✅ Remove Admin Role Check từ Middleware

- **Trước**: Middleware check admin role → database query → timeout risk
- **Sau**: Admin role check được defer về route handlers (`src/lib/auth-server.ts`)
  - Middleware chỉ check session (nếu có)
  - Route handlers check admin role khi cần
  - API routes `/api/admin/*` đã có protection riêng

**Kết quả**: Loại bỏ database query khỏi middleware → giảm execution time

### 4. ✅ Timeout và Error Handling

- Thêm timeout 5 giây cho Supabase auth calls
- Error handling: nếu auth check fail → redirect to login (không crash)
- Log errors để debug nhưng không block requests

```typescript
try {
  const sessionResult = await withTimeoutOrNull(
    supabase.auth.getSession(),
    MIDDLEWARE_AUTH_TIMEOUT_MS
  );
  // Handle timeout gracefully
} catch (error) {
  // Log but don't crash
  console.error('Middleware auth check error:', error);
}
```

## Thay đổi chi tiết

### Files đã tạo

- `src/lib/timeout.ts` - Timeout utility functions

### Files đã sửa

- `src/middleware.ts` - Refactor authentication flow

### Protected Routes (cần authentication)

- `/wallet`
- `/matches/create`
- `/matches/my`
- `/admin` (role check trong route handlers)

### Public Routes (không cần authentication)

- Tất cả routes khác đã list ở trên

## Lợi ích

1. **Giảm timeout errors**: Middleware chỉ check auth khi thực sự cần
2. **Performance tốt hơn**: Ít calls đến Supabase cho public routes
3. **Reliability**: Graceful degradation khi Supabase chậm
4. **Maintainability**: Code rõ ràng hơn, separation of concerns

## Testing

Để test các thay đổi:

1. **Test public routes**: Truy cập `/`, `/matches` → không cần login
2. **Test protected routes**: Truy cập `/wallet` → redirect to login nếu chưa login
3. **Test admin routes**: Truy cập `/admin` → API sẽ check admin role
4. **Test timeout scenario**: Simulate slow Supabase → middleware không crash

## Lưu ý

- Admin routes (`/admin/*`) vẫn được bảo vệ bởi:
  - Middleware: Check session (require login)
  - Route handlers: Check admin role (require admin)
- API routes `/api/admin/*` có protection riêng trong route handlers
- Timeout được set là 5 giây, có thể điều chỉnh nếu cần

## Future Improvements

1. Consider caching session check results (cần cẩn thận với stale data)
2. Monitor middleware execution time trong production
3. Consider Redis-based rate limiting thay vì in-memory Map
