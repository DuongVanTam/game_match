# Vấn đề: SSE Broadcast Manager trên Serverless Architecture

## Hiểu về Serverless Architecture trên Vercel

### 1. **Serverless Functions là Stateless**

Khi bạn deploy lên Vercel, mỗi API route (như `/api/topup/stream` hoặc `/api/payos/webhook`) là một **serverless function**:

- Mỗi function invocation có thể chạy trên **một instance khác nhau**
- Mỗi instance là **hoàn toàn độc lập** về memory
- Không có shared memory giữa các instances
- Mỗi instance có thể được **cold start** hoặc **warm start**

### 2. **Vấn đề với In-Memory State**

```typescript
// src/lib/broadcast.ts
class BroadcastManager {
  // ❌ VẤN ĐỀ: connections Map này chỉ tồn tại trong memory của MỘT instance
  private connections: Map<string, Set<SSEConnection>> = new Map();

  subscribe(txRef: string, connection: SSEConnection) {
    // Connection được lưu vào Map trong instance A
    this.connections.get(txRef)!.add(connection);
  }

  broadcast(txRef: string, event: BroadcastEvent) {
    // Broadcast chỉ gửi đến connections trong instance này
    // Nếu webhook chạy trên instance khác → không có connections nào!
    const connections = this.connections.get(txRef);
    if (!connections || connections.size === 0) {
      console.warn('No SSE connections found!'); // ⚠️ Luôn xảy ra nếu khác instance
    }
  }
}

// Singleton instance - nhưng mỗi serverless instance có singleton riêng!
export const broadcastManager = new BroadcastManager();
```

## Ví dụ cụ thể về vấn đề

### Scenario 1: SSE và Webhook cùng instance (✅ Hoạt động)

```
Timeline:
1. User tạo topup → /api/topup/init (Instance 1)
2. Client kết nối SSE → /api/topup/stream (Instance 1)
   - broadcastManager.subscribe() → connections Map trong Instance 1 có 1 connection
3. PayOS gửi webhook → /api/payos/webhook (Instance 1)
   - broadcastManager.broadcast() → tìm thấy connection trong Instance 1
   - ✅ Client nhận được event!
```

### Scenario 2: SSE và Webhook khác instance (❌ Lỗi)

```
Timeline:
1. User tạo topup → /api/topup/init (Instance 1)
2. Client kết nối SSE → /api/topup/stream (Instance 2)
   - broadcastManager.subscribe() → connections Map trong Instance 2 có 1 connection
3. PayOS gửi webhook → /api/payos/webhook (Instance 3)
   - broadcastManager.broadcast() → connections Map trong Instance 3 là EMPTY!
   - ❌ Client KHÔNG nhận được event!
```

### Minh họa bằng diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Platform                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Instance 1 (Cold Start)                               │
│  ┌──────────────────────────────────────┐               │
│  │ broadcastManager                     │               │
│  │ connections: Map {}                  │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  Instance 2 (SSE Connection)                            │
│  ┌──────────────────────────────────────┐               │
│  │ broadcastManager                     │               │
│  │ connections: Map {                   │               │
│  │   "TFT_123": [connection1]           │               │
│  │ }                                    │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  Instance 3 (Webhook Received)                          │
│  ┌──────────────────────────────────────┐               │
│  │ broadcastManager                     │               │
│  │ connections: Map {}  ← EMPTY!         │               │
│  │ broadcast("TFT_123") → No connections│               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Tại sao vấn đề này xảy ra?

### 1. **Vercel Routing Strategy**

Vercel sử dụng nhiều strategies để route requests:

- **Round-robin**: Requests được phân bổ đều cho các instances
- **Load balancing**: Requests được gửi đến instance có ít load nhất
- **Cold start**: Instance mới được tạo khi cần
- **Warm instances**: Giữ instance alive một thời gian, nhưng không guarantee

**Không có cách nào đảm bảo** SSE và Webhook chạy trên cùng instance!

### 2. **In-Memory State Isolation**

Mỗi serverless function instance có:

- **Own memory space**: Không share với instances khác
- **Own execution context**: JavaScript runtime riêng
- **Own module cache**: Singleton riêng cho mỗi instance

```typescript
// Instance A
const broadcastManager = new BroadcastManager(); // Singleton A
broadcastManager.subscribe('TFT_123', connection1);

// Instance B
const broadcastManager = new BroadcastManager(); // Singleton B (khác!)
broadcastManager.broadcast('TFT_123', event); // Không tìm thấy connection1!
```

### 3. **Stateless by Design**

Serverless functions được thiết kế để **stateless**:

- ✅ Dễ scale horizontally
- ✅ Không cần quản lý state
- ❌ Không thể share in-memory state giữa instances

## Các giải pháp

### 1. **Polling (Hiện tại đã implement)** ✅

```typescript
// Client polling database trực tiếp
// Không phụ thuộc vào SSE connection
setInterval(async () => {
  const status = await fetch('/api/topup/status?tx_ref=...');
  // Update UI from database
}, 3000);
```

**Ưu điểm:**

- ✅ Hoạt động bất kể instance nào
- ✅ Đơn giản, dễ implement

**Nhược điểm:**

- ❌ Không real-time (delay 3 giây)
- ❌ Tăng load database
- ❌ Không efficient (polling liên tục)

### 2. **External Message Queue (Redis, Pub/Sub)**

```typescript
// SSE connection subscribe vào Redis channel
// Webhook publish event vào Redis channel
// Redis làm bridge giữa các instances
```

**Ưu điểm:**

- ✅ Real-time
- ✅ Hoạt động across instances
- ✅ Scalable

**Nhược điểm:**

- ❌ Cần external service (Redis)
- ❌ Tăng complexity
- ❌ Tăng cost

### 3. **Database-based Event Store**

```typescript
// SSE connection polling database cho events
// Webhook insert event vào database
// SSE query events từ database
```

**Ưu điểm:**

- ✅ Hoạt động với existing database
- ✅ Persistent (có thể replay events)

**Nhược điểm:**

- ❌ Không real-time (cần polling)
- ❌ Tăng database load

### 4. **WebSocket với External Service**

```typescript
// Sử dụng WebSocket service như Pusher, Ably
// SSE connection → WebSocket connection
// Webhook publish → WebSocket service
```

**Ưu điểm:**

- ✅ Real-time
- ✅ Managed service (không cần maintain)

**Nhược điểm:**

- ❌ Tăng cost (third-party service)
- ❌ Dependency vào external service

## Giải pháp hiện tại trong project

### Hybrid Approach: SSE + Polling Fallback

```typescript
// 1. Ưu tiên SSE (real-time, efficient)
useTopupSSE({ txRef, ... });

// 2. Nếu SSE fail → Fallback polling
useEffect(() => {
  // Chờ 10 giây xem SSE có connect được không
  setTimeout(() => {
    if (!isConnected) {
      // Start polling
      setInterval(() => {
        fetch('/api/topup/status?tx_ref=...');
      }, 3000);
    }
  }, 10000);
}, [isConnected]);
```

**Logic:**

- SSE là primary (real-time, efficient)
- Polling là fallback (khi SSE fail do instance khác)
- Tự động switch giữa 2 methods

## Kết luận

**Vấn đề cốt lõi:** Serverless architecture không share in-memory state giữa các instances.

**Giải pháp tốt nhất hiện tại:**

- ✅ SSE làm primary (khi cùng instance → real-time)
- ✅ Polling làm fallback (khi khác instance → vẫn hoạt động)

**Giải pháp tốt nhất cho production scale:**

- 🔄 External message queue (Redis Pub/Sub)
- 🔄 Managed WebSocket service
- 🔄 Database event store với optimized polling
