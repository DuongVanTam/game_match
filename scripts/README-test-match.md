# Script Test Match 8 Người

Script để test tự động tạo match 8 người chơi.

## Mô tả

Script này sẽ:

1. Tạo 8 test users với wallets có đủ balance (1,000,000 VNĐ mỗi user)
2. Tạo một match với `max_players = 8` và `entry_fee = 50,000 VNĐ`
3. Join 8 users vào match
4. (Optional) Start match nếu đủ 8 người

## Yêu cầu

- Node.js 18+
- File `.env.local` với các biến môi trường:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Cách sử dụng

### Cách 1: Dùng npm script (khuyến nghị)

```bash
npm run test:match-8
```

### Cách 2: Dùng tsx trực tiếp

```bash
npx tsx scripts/test-match-8players.ts
```

### Cách 3: Cài tsx và chạy

```bash
npm install -D tsx
npx tsx scripts/test-match-8players.ts
```

## Output mẫu

```
🚀 Starting test: Create and join match with 8 players

============================================================

📝 Step 1: Creating 8 test users...
   ✅ User 1: Test Player 1 (testplayer1@test.com) - Balance: 1,000,000 VNĐ
   ✅ User 2: Test Player 2 (testplayer2@test.com) - Balance: 1,000,000 VNĐ
   ...

✅ Created 8 test users

🎮 Step 2: Creating match...
   ✅ Match created: abc123-def456-...
      Title: Test Match 8 Players - 12/1/2025, 10:30:00
      Entry Fee: 50,000 VNĐ
      Max Players: 8
      Current Players: 1/8

✅ Match created: abc123-def456-...

👥 Step 3: Joining players to match...
   ✅ Player 2 joined (2/8)
   ✅ Player 3 joined (3/8)
   ...
   ✅ Player 8 joined (8/8)

✅ All players joined!

📊 Final Status:
   Room ID: abc123-def456-...
   Players: 8/8
   Status: open
   Entry Fee: 50,000 VNĐ

🏁 Step 4: Starting match...
   ✅ Match started successfully!
      Room ID: abc123-def456-...
      Status: ongoing

✅ Match started successfully!
   You can now view the match at: http://localhost:3000/matches/abc123-def456-...

============================================================
✨ Test completed successfully!

📋 Summary:
   - Users created: 8
   - Match ID: abc123-def456-...
   - Players joined: 8/8
   - Entry fee: 50,000 VNĐ
   - Total pool: 400,000 VNĐ
```

## Lưu ý

- Script sẽ tạo users mới mỗi lần chạy (với email `testplayer1@test.com` đến `testplayer8@test.com`)
- Nếu user đã tồn tại, script sẽ sử dụng user đó
- Mỗi user sẽ có balance 1,000,000 VNĐ
- Entry fee mặc định là 50,000 VNĐ
- Script sử dụng service role key để bypass authentication

## Troubleshooting

### Lỗi: Missing environment variables

Kiểm tra file `.env.local` có đầy đủ:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Lỗi: Cannot find module 'tsx'

Chạy lại với `npx`:

```bash
npx tsx scripts/test-match-8players.ts
```

Hoặc cài tsx:

```bash
npm install -D tsx
```

### Lỗi: User already exists

Đây là behavior bình thường. Script sẽ sử dụng user đã tồn tại.

## Cleanup (xóa test data)

Nếu muốn xóa test data sau khi test:

```sql
-- Xóa test users (trong Supabase SQL Editor)
DELETE FROM room_players WHERE user_id LIKE 'test-user-%';
DELETE FROM matches WHERE created_by LIKE 'test-user-%';
DELETE FROM rooms WHERE created_by LIKE 'test-user-%';
DELETE FROM wallets WHERE user_id LIKE 'test-user-%';
DELETE FROM users WHERE email LIKE 'testplayer%@test.com';
```

**Lưu ý**: Chỉ chạy cleanup query nếu chắc chắn muốn xóa tất cả test data!
