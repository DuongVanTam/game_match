# Ví dụ minh họa: SSE Broadcast Manager trên Serverless

## Code Example

### Broadcast Manager (In-Memory)

```typescript
// src/lib/broadcast.ts

class BroadcastManager {
  // ⚠️ VẤN ĐỀ: Map này chỉ tồn tại trong memory của MỘT instance
  private connections: Map<string, Set<SSEConnection>> = new Map();

  subscribe(txRef: string, connection: SSEConnection) {
    // Lưu connection vào Map của instance hiện tại
    if (!this.connections.has(txRef)) {
      this.connections.set(txRef, new Set());
    }
    this.connections.get(txRef)!.add(connection);

    console.log(
      `[Instance ${process.env.VERCEL_INSTANCE_ID || 'unknown'}] Subscribed connection for ${txRef}`
    );
    console.log(
      `[Instance ${process.env.VERCEL_INSTANCE_ID || 'unknown'}] Total connections: ${this.connections.size}`
    );
  }

  broadcast(txRef: string, event: BroadcastEvent) {
    const connections = this.connections.get(txRef);

    // ❌ Nếu webhook chạy trên instance khác → connections = undefined!
    if (!connections || connections.size === 0) {
      console.warn(
        `[Instance ${process.env.VERCEL_INSTANCE_ID || 'unknown'}] No connections found for ${txRef}`
      );
      return; // Event bị mất!
    }

    // ✅ Chỉ broadcast được nếu có connections trong instance này
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    connections.forEach((conn) => {
      conn.controller.enqueue(new TextEncoder().encode(message));
    });
  }
}

// Singleton - nhưng mỗi instance có singleton riêng!
export const broadcastManager = new BroadcastManager();
```

## Scenario thực tế

### Timeline thực tế khi deploy lên Vercel

```
[00:00] User tạo topup
        → POST /api/topup/init
        → Instance A (cold start)
        → Tạo topup record trong DB
        → Return: { txRef: "TFT_123", paymentUrl: "..." }

[00:01] User mở payment page
        → Client kết nối SSE: GET /api/topup/stream?tx_ref=TFT_123
        → Instance B (warm start)
        → broadcastManager.subscribe("TFT_123", connection1)
        → connections Map trong Instance B:
           {
             "TFT_123": [connection1]
           }

[00:30] User thanh toán thành công trên PayOS
        → PayOS gửi webhook: POST /api/payos/webhook
        → Instance C (cold start - hoàn toàn mới!)
        → Webhook xử lý:
           1. Verify webhook data ✅
           2. Update database ✅
           3. broadcastManager.broadcast("TFT_123", event)
              → connections Map trong Instance C:
                 {
                   // EMPTY! Không có connection nào!
                 }
              → ❌ Event bị mất!
              → Client vẫn hiển thị "Đang chờ xác nhận..."

[00:33] Polling fallback chạy
        → GET /api/topup/status?tx_ref=TFT_123
        → Instance D (any instance)
        → Query database → status = "confirmed" ✅
        → Client nhận được status và update UI ✅
```

## Logs thực tế từ Vercel

### Log từ SSE Connection (Instance B)

```
[2025-01-15 10:00:01] [Instance B] SSE connection established for tx_ref: TFT_123
[2025-01-15 10:00:01] [Instance B] Subscribed connection for TFT_123
[2025-01-15 10:00:01] [Instance B] Total connections: 1
[2025-01-15 10:00:01] [Instance B] Active SSE connections for tx_ref: TFT_123 = 1
```

### Log từ Webhook (Instance C)

```
[2025-01-15 10:00:30] [Instance C] === PAYOS WEBHOOK RECEIVED ===
[2025-01-15 10:00:30] [Instance C] Webhook verified successfully
[2025-01-15 10:00:30] [Instance C] Topup found: TFT_123
[2025-01-15 10:00:30] [Instance C] Updating wallet balance... ✅
[2025-01-15 10:00:30] [Instance C] Topup status updated to confirmed ✅
[2025-01-15 10:00:30] [Instance C] Broadcasting SSE event for tx_ref: TFT_123
[2025-01-15 10:00:30] [Instance C] Active SSE connections for tx_ref: TFT_123 = 0 ⚠️
[2025-01-15 10:00:30] [Instance C] ⚠️ No SSE connections found for tx_ref: TFT_123. Event will not be delivered.
[2025-01-15 10:00:30] [Instance C] === WEBHOOK PROCESSING COMPLETED ===
```

### Log từ Client (Browser)

```
[10:00:01] SSE connection opened for tx_ref: TFT_123
[10:00:01] SSE status: pending
[10:00:30] (Không nhận được event từ webhook!)
[10:00:33] Polling: status = confirmed ✅
[10:00:33] UI updated: "Thanh toán thành công!"
```

## Vì sao vấn đề này xảy ra?

### 1. **Vercel Serverless Architecture**

```
┌─────────────────────────────────────────────────────────┐
│              Vercel Edge Network                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Instance A  │  │  Instance B  │  │  Instance C  │ │
│  │              │  │              │  │              │ │
│  │  Memory:     │  │  Memory:     │  │  Memory:     │ │
│  │  - Map {}    │  │  - Map {     │  │  - Map {}    │ │
│  │              │  │    TFT_123:  │  │              │ │
│  │              │  │    [conn1]   │  │              │ │
│  │              │  │  }           │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         ↑                  ↑                  ↑          │
│         │                  │                  │          │
│    Webhook            SSE Stream           Webhook      │
│    (empty)         (has connection)        (empty)      │
└─────────────────────────────────────────────────────────┘
```

### 2. **Request Routing**

Vercel không guarantee routing strategy:

- **Round-robin**: A → B → C → A → B → C...
- **Least connections**: Route đến instance ít connections nhất
- **Geographic**: Route đến instance gần nhất
- **Random**: Random selection

**Không có cách nào đảm bảo** SSE và Webhook cùng instance!

### 3. **Cold Start**

```
Instance Lifecycle:
1. Cold Start (0 connections) → Process request → Keep alive 60s → Cold
2. Warm Start (0 connections) → Process request → Keep alive 60s → Cold
3. Active (có connections) → Process request → Keep alive 60s → Cold

SSE connection giữ instance alive, nhưng webhook có thể đến instance khác!
```

## Giải pháp: Hybrid Approach

### Code hiện tại

```typescript
// src/app/wallet/topup/page.tsx

// 1. SSE là primary (real-time khi cùng instance)
const { status, isConnected } = useTopupSSE({ txRef });

// 2. Polling là fallback (hoạt động bất kể instance nào)
useEffect(() => {
  // Chờ 10 giây xem SSE có connect được không
  setTimeout(() => {
    if (!isConnected) {
      // SSE failed → Start polling
      setInterval(async () => {
        const res = await fetch(`/api/topup/status?tx_ref=${txRef}`);
        const data = await res.json();
        if (data.status === 'confirmed') {
          // Update UI từ database
          setSuccessMessage('Thanh toán thành công!');
        }
      }, 3000);
    }
  }, 10000);
}, [isConnected, txRef]);
```

### Kết quả

```
Scenario 1: SSE và Webhook cùng instance
→ SSE nhận event ngay lập tức ✅
→ Không cần polling ✅

Scenario 2: SSE và Webhook khác instance
→ SSE không nhận event ❌
→ Polling phát hiện status từ DB sau 3 giây ✅
→ Client vẫn nhận được update ✅
```

## Kết luận

**Vấn đề:** In-memory state không share được giữa serverless instances.

**Giải pháp hiện tại:** Hybrid approach (SSE + Polling fallback)

- ✅ SSE: Real-time khi cùng instance
- ✅ Polling: Fallback khi khác instance
- ✅ Đảm bảo client luôn nhận được update

**Giải pháp tương lai:** External message queue (Redis, Pub/Sub)

- ✅ Real-time across instances
- ✅ Scalable
- ✅ Nhưng cần external service
