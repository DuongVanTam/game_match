/**
 * Test Script: Tạo và join match 8 người
 *
 * Script này sẽ:
 * 1. Tạo 8 test users với wallets có đủ balance
 * 2. Tạo một match với max_players = 8
 * 3. Join 8 users vào match
 * 4. (Optional) Start match
 *
 * Usage:
 *   npx tsx scripts/test-match-8players.ts
 *   hoặc
 *   npx ts-node scripts/test-match-8players.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing environment variables');
  console.error(
    '   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestUser {
  id: string;
  email: string;
  full_name: string;
  wallet_id?: string;
  balance?: number;
}

const testUsers: TestUser[] = [];
const entryFee = 50000; // 50,000 VNĐ
const initialBalance = 1000000; // 1,000,000 VNĐ (đủ để join)

/**
 * Tạo test user với wallet
 */
async function createTestUser(index: number): Promise<TestUser> {
  const timestamp = Date.now();
  const user: TestUser = {
    id: `test-user-${timestamp}-${index}`,
    email: `testplayer${index}@test.com`,
    full_name: `Test Player ${index}`,
  };

  try {
    // Kiểm tra user đã tồn tại chưa
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', user.email)
      .maybeSingle();

    if (existingUser) {
      // User đã tồn tại, sử dụng ID hiện có
      console.log(
        `   ⚠️  User ${user.email} already exists, using existing...`
      );
      user.id = existingUser.id;
    } else {
      // Tạo auth user mới
      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: 'Test123!@#',
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
          },
        });

      if (authError) {
        // Nếu lỗi là user đã tồn tại trong auth nhưng chưa có trong users table
        if (authError.message?.includes('already registered')) {
          console.log(
            `   ⚠️  Auth user ${user.email} exists, fetching from auth...`
          );
          // Tìm user trong auth system
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const foundAuthUser = authUsers?.users.find(
            (u) => u.email === user.email
          );

          if (foundAuthUser) {
            user.id = foundAuthUser.id;
          } else {
            throw new Error(
              `Auth user exists but cannot be found: ${user.email}`
            );
          }
        } else {
          throw authError;
        }
      } else if (authUser) {
        user.id = authUser.user.id;
      }
    }

    // Tạo user record trong database
    const { error: userError } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: 'user',
      email_verified: true,
    });

    if (userError && !userError.message?.includes('duplicate')) {
      throw userError;
    }

    // Tạo hoặc update wallet
    // Kiểm tra wallet đã tồn tại chưa
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let wallet;
    if (existingWallet) {
      // Update balance nếu wallet đã tồn tại
      const { data: updatedWallet, error: updateError } = await supabase
        .from('wallets')
        .update({ balance: initialBalance })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      wallet = updatedWallet;
    } else {
      // Insert mới nếu chưa có wallet
      const { data: newWallet, error: insertError } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          balance: initialBalance,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      wallet = newWallet;
    }

    user.wallet_id = wallet.id;
    user.balance = wallet.balance;

    console.log(
      `   ✅ User ${index}: ${user.full_name} (${user.email}) - Balance: ${wallet.balance.toLocaleString('vi-VN')} VNĐ`
    );
    return user;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error creating user ${index}:`, errorMessage);
    throw error;
  }
}

/**
 * Tạo match 8 người
 */
async function createMatch(creatorId: string) {
  const matchData = {
    title: `Test Match 8 Players - ${new Date().toLocaleString('vi-VN')}`,
    description: 'Match test tự động tạo bởi script test-match-8players.ts',
    entry_fee: entryFee,
    max_players: 8,
    created_by: creatorId,
    status: 'open' as const,
  };

  try {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert(matchData)
      .select()
      .single();

    if (roomError) {
      throw roomError;
    }

    // Add creator as first player
    const { error: memberError } = await supabase.from('room_players').insert({
      room_id: room.id,
      user_id: creatorId,
      status: 'active',
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      throw memberError;
    }

    console.log(`   ✅ Match created: ${room.id}`);
    console.log(`      Title: ${room.title}`);
    console.log(
      `      Entry Fee: ${room.entry_fee.toLocaleString('vi-VN')} VNĐ`
    );
    console.log(`      Max Players: ${room.max_players}`);
    console.log(`      Current Players: 1/8`);

    return room;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error creating match:`, errorMessage);
    throw error;
  }
}

/**
 * Join user vào match
 */
async function joinMatch(roomId: string, userId: string, playerIndex: number) {
  try {
    // Check if already joined
    const { data: existingMember } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember && existingMember.status === 'active') {
      console.log(`   ⚠️  Player ${playerIndex} already joined`);
      return;
    }

    // Check wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (!wallet || wallet.balance < entryFee) {
      throw new Error(`Insufficient balance for user ${userId}`);
    }

    // Join room
    if (existingMember) {
      // Reactivate
      const { error } = await supabase
        .from('room_players')
        .update({
          status: 'active',
          joined_at: new Date().toISOString(),
          left_at: null,
        })
        .eq('id', existingMember.id);

      if (error) throw error;
    } else {
      // New join
      const { error } = await supabase.from('room_players').insert({
        room_id: roomId,
        user_id: userId,
        status: 'active',
        joined_at: new Date().toISOString(),
      });

      if (error) throw error;
    }

    // Get current player count
    const { count } = await supabase
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('status', 'active');

    console.log(`   ✅ Player ${playerIndex} joined (${count}/8)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error joining player ${playerIndex}:`, errorMessage);
    throw error;
  }
}

/**
 * Start match (nếu đủ 8 người)
 * Thực hiện đầy đủ các bước như API /api/rooms/[id]/start-match:
 * 1. Tạo match record
 * 2. Tạo match_players
 * 3. Trừ entry fee từ wallet của mỗi player
 * 4. Update room status to 'ongoing'
 */
async function startMatch(roomId: string) {
  try {
    // Get room info với active players
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(
        `
        *,
        room_players(id, user_id, status, joined_at)
      `
      )
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    if (room.status !== 'open') {
      console.log(`   ⚠️  Room is not open: status = ${room.status}`);
      return false;
    }

    // Get active members
    const activeMembers =
      room.room_players?.filter(
        (player: { status: string | null }) => player.status === 'active'
      ) ?? [];

    if (activeMembers.length < 2) {
      console.log(
        `   ⚠️  Cannot start match: need at least 2 players, got ${activeMembers.length}`
      );
      return false;
    }

    // Check existing matches to determine round number
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('round_number')
      .eq('room_id', roomId);

    const maxRound =
      existingMatches?.reduce(
        (acc, match) =>
          match.round_number && match.round_number > acc
            ? match.round_number
            : acc,
        0
      ) ?? 0;
    const nextRound = maxRound + 1;

    const now = new Date().toISOString();
    const entryFee = Number(room.entry_fee ?? 0);

    if (!Number.isFinite(entryFee) || entryFee <= 0) {
      throw new Error(`Invalid entry fee: ${room.entry_fee}`);
    }

    // Step 1: Create match record
    const { data: match, error: createMatchError } = await supabase
      .from('matches')
      .insert({
        room_id: roomId,
        title: `${room.title} - Round ${nextRound}`,
        description: room.description,
        entry_fee: room.entry_fee,
        max_players: room.max_players,
        current_players: activeMembers.length,
        status: 'ongoing',
        created_by: room.created_by,
        started_at: now,
        round_number: nextRound,
      })
      .select()
      .single();

    if (createMatchError || !match) {
      throw new Error(`Failed to create match: ${createMatchError?.message}`);
    }

    console.log(`   📝 Created match: ${match.id} (Round ${nextRound})`);

    // Step 2: Create match_players
    const matchPlayersPayload = activeMembers.map(
      (member: { id: string; user_id: string; status: string | null }) => ({
        match_id: match.id,
        room_player_id: member.id,
        user_id: member.user_id,
        status: 'active',
        joined_at: now,
      })
    );

    const { error: playersInsertError } = await supabase
      .from('match_players')
      .insert(matchPlayersPayload);

    if (playersInsertError) {
      // Rollback: delete match
      await supabase.from('matches').delete().eq('id', match.id);
      throw new Error(
        `Failed to create match players: ${playersInsertError.message}`
      );
    }

    console.log(`   👥 Created ${activeMembers.length} match players`);

    // Step 3: Debit entry fee from each player's wallet
    const debitedUsers: string[] = [];

    for (const member of activeMembers) {
      const { error: debitError } = await supabase.rpc(
        'update_wallet_balance',
        {
          p_user_id: member.user_id,
          p_amount: -entryFee,
          p_transaction_type: 'join_match',
          p_reference_id: match.id,
          p_reference_type: 'match',
          p_description: `Phí tham gia trận đấu: ${match.title}`,
          p_metadata: {
            room_id: roomId,
            match_id: match.id,
            round_number: nextRound,
            entry_fee: entryFee,
          },
        }
      );

      if (debitError) {
        console.error(
          `   ❌ Error debiting entry fee for user ${member.user_id}:`,
          debitError
        );

        // Rollback: refund already debited users
        for (const debitedUserId of debitedUsers) {
          await supabase.rpc('update_wallet_balance', {
            p_user_id: debitedUserId,
            p_amount: entryFee,
            p_transaction_type: 'leave_match',
            p_reference_id: match.id,
            p_reference_type: 'match',
            p_description: `Hoàn phí tham gia do lỗi bắt đầu trận đấu: ${match.title}`,
            p_metadata: {
              room_id: roomId,
              match_id: match.id,
              round_number: nextRound,
              entry_fee: entryFee,
              reason: 'start_match_failed',
            },
          });
        }

        // Rollback: delete match_players and match
        await supabase.from('match_players').delete().eq('match_id', match.id);
        await supabase.from('matches').delete().eq('id', match.id);

        throw new Error(
          `Failed to debit entry fee for user ${member.user_id}: ${debitError.message}`
        );
      }

      debitedUsers.push(member.user_id);
    }

    console.log(
      `   💰 Debited ${entryFee.toLocaleString('vi-VN')} VNĐ from ${activeMembers.length} players`
    );

    // Step 4: Update room status to ongoing
    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({
        status: 'ongoing',
        updated_at: now,
      })
      .eq('id', roomId);

    if (roomUpdateError) {
      console.error(
        `   ⚠️  Warning: Failed to update room status: ${roomUpdateError.message}`
      );
      // Don't fail here, match is already started
    }

    console.log(`   ✅ Match started successfully!`);
    console.log(`      Match ID: ${match.id}`);
    console.log(`      Room ID: ${roomId}`);
    console.log(`      Round: ${nextRound}`);
    console.log(`      Players: ${activeMembers.length}`);
    console.log(
      `      Entry Fee: ${entryFee.toLocaleString('vi-VN')} VNĐ per player`
    );
    console.log(
      `      Total Pool: ${(entryFee * activeMembers.length).toLocaleString('vi-VN')} VNĐ`
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error starting match:`, errorMessage);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting test: Create and join match with 8 players\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Create 8 test users
    console.log('\n📝 Step 1: Creating 8 test users...');
    for (let i = 1; i <= 8; i++) {
      const user = await createTestUser(i);
      testUsers.push(user);
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Created ${testUsers.length} test users\n`);

    // Step 2: Create match (creator = first user)
    console.log('🎮 Step 2: Creating match...');
    const room = await createMatch(testUsers[0].id);
    const roomId = room.id;

    console.log(`\n✅ Match created: ${roomId}\n`);

    // Step 3: Join remaining 7 users (first user already joined as creator)
    console.log('👥 Step 3: Joining players to match...');
    for (let i = 1; i < testUsers.length; i++) {
      await joinMatch(roomId, testUsers[i].id, i + 1);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`\n✅ All players joined!\n`);

    // Step 4: Verify final count
    const { count: finalCount } = await supabase
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('status', 'active');

    console.log('📊 Final Status:');
    console.log(`   Room ID: ${roomId}`);
    console.log(`   Players: ${finalCount}/8`);
    console.log(`   Status: ${room.status}`);
    console.log(`   Entry Fee: ${entryFee.toLocaleString('vi-VN')} VNĐ`);

    // Step 5: (Optional) Start match
    console.log('\n🏁 Step 4: Starting match...');
    const started = await startMatch(roomId);

    if (started) {
      console.log('\n✅ Match started successfully!');
      console.log(
        `   You can now view the match at: http://localhost:3000/matches/${roomId}`
      );
    } else {
      console.log('\n⚠️  Match not started (may need manual start)');
      console.log(`   View match at: http://localhost:3000/matches/${roomId}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Users created: ${testUsers.length}`);
    console.log(`   - Match ID: ${roomId}`);
    console.log(`   - Players joined: ${finalCount}/8`);
    console.log(`   - Entry fee: ${entryFee.toLocaleString('vi-VN')} VNĐ`);
    console.log(
      `   - Total pool: ${(entryFee * (finalCount || 0)).toLocaleString('vi-VN')} VNĐ`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Test failed:', errorMessage);
    console.error(error);
    process.exit(1);
  }
}

// Run script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
