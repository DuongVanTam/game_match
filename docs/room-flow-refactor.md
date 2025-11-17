## Room-Based Flow Refactor Plan

### 1. Goals

- Introduce `rooms` as a parent entity for matches while keeping existing UI largely unchanged (rename “Create Match” → “Create Room”).
- Allow players to join a room without immediate balance deduction; only deduct/apply payouts after a match generated from the room has been settled.
- Preserve current validations (balance check, capacity limits) and ensure ledger accuracy when funds move.

### 2. Database Tasks

1. **Create `rooms` table**
   - Columns: `id`, `title`, `description`, `entry_fee`, `max_players`, `created_by`, `status`, `created_at`, `updated_at`.
   - Status values: `open`, `in_progress`, `completed`, `cancelled`.
   - RLS policies mirroring `matches` (creator/admin access, members read).
2. **Create `room_players` table**
   - Columns: `id`, `room_id`, `user_id`, `joined_at`, `left_at`, `status`.
   - Track membership without deducting balance; enforce unique `room_id` + `user_id`.
3. **Alter `matches` table**
   - Add `room_id` FK→`rooms(id)`.
   - Remove `current_players` (derive via `match_players`), or keep in sync if still needed by UI.
   - Consider `round_number` per room to track match order.
4. **Adjust `match_players`**
   - Allow reference from room players (optional `room_player_id`).
   - Ensure settlement queries can join back to room context.
5. **Ledger / functions**
   - Add transaction types: `match_entry_hold`, `match_result_payout`, `match_service_fee`.
   - Update `update_wallet_balance` function to handle new types & metadata.
6. **Data migration**
   - Existing matches should become rooms + child match for backward compatibility or flagged as legacy.

### 3. Backend API Tasks

1. **Room CRUD Routes**
   - `POST /api/rooms`: create room (balance check, but no deduction).
   - `POST /api/rooms/:id/join` & `/leave`: add/remove from `room_players`.
   - `GET /api/rooms/:id`: return room with members and matches.
2. **Start Match Endpoint**
   - `POST /api/rooms/:id/start-match`
     - Validate room is `open`, creator/admin triggers action, and player count ≥ min.
     - Create `matches` row (status `ongoing`, `round_number` = last + 1).
     - Clone active `room_players` into `match_players` with initial status `active`.
     - Optionally mark room `ongoing` while the match is active.
     - Return new match payload so frontend can show scorecard.
3. **Settlement Update**
   - `/api/matches/:id/settle`
     - Accept proof URL + winner, ensure match status `ongoing`.
     - Deduct entry fee (or release hold) for non-winners, apply service fee, credit winner.
     - Update match status `completed`, optionally mark room `completed` if no further matches.
     - Record ledger rows with new transaction types (`match_entry_hold`, `match_result_payout`, `match_service_fee`).
4. **Realtime Notifications**
   - Add `rooms`, `room_players`, `matches` to `supabase_realtime` publication.
   - Client subscribes to `postgres_changes` on those tables to trigger UI refresh automatically.
5. **Authorization & RLS**
   - Middleware updates so room creator/admins can start matches.
   - Room members can view associated matches/proofs.

### 4. Frontend Adjustments

1. Rename “Create Match” views/components to “Create Room”.
2. Add room detail page sections for:
   - Member list management (join/leave still available).
   - “Start Match” button (visible to creator/admin).
   - List of generated matches with links to existing match detail page.
3. Minimal UI tweaks since logic shifts server-side.
4. Add room detail actions:
   - “Bắt đầu trận đấu” button hitting `/api/rooms/:id/start-match`.
   - Settlement flow targets the latest `ongoing` match ID returned by detail API.
   - Render history of matches within the room, proof images, and winners.

### 5. Testing

1. Update phase integration tests to cover:
   - Room creation → join → start match → upload proof → settle.
   - Balance remains untouched until settlement.
2. Add unit tests for new Supabase functions/migrations.
3. Adjust existing join/leave match tests to operate via rooms.

### 6. Rollout Considerations

- Feature flag if needed to migrate gradually.
- Verify manual payout / ledger reports understand new transaction types.
- Update documentation (`How it works`, terms) to reflect “rooms” terminology.
