import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';
import { Database } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const authClient = createApiAuthClient(request);
    const serviceClient = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRecord } = await serviceClient
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    const { data: room, error: roomError } = await serviceClient
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
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isOwner = room.created_by === user.id;
    const isAdmin = userRecord?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the room owner or admin can start a match' },
        { status: 403 }
      );
    }

    if (room.status === 'ongoing') {
      return NextResponse.json(
        {
          error: 'Room already has an ongoing match',
          message: 'Phòng đấu đang có trận diễn ra, vui lòng hoàn tất trước.',
        },
        { status: 400 }
      );
    }

    if (room.status === 'completed' || room.status === 'cancelled') {
      return NextResponse.json(
        {
          error: 'Room is not open',
          message: 'Phòng đấu này đã kết thúc hoặc bị hủy.',
        },
        { status: 400 }
      );
    }

    const activeMembers =
      room.room_players?.filter((player) => player.status === 'active') ?? [];

    if (activeMembers.length < 2) {
      return NextResponse.json(
        {
          error: 'Not enough players',
          message: 'Cần ít nhất 2 người chơi để bắt đầu trận đấu.',
        },
        { status: 400 }
      );
    }

    const { data: existingMatches, error: matchesError } = await serviceClient
      .from('matches')
      .select('id, round_number')
      .eq('room_id', roomId);

    if (matchesError) {
      console.error('Error fetching existing matches:', matchesError);
      return NextResponse.json(
        { error: 'Failed to inspect room matches' },
        { status: 500 }
      );
    }

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
      return NextResponse.json(
        {
          error: 'Invalid entry fee',
          message: 'Phí tham gia phòng đấu không hợp lệ.',
        },
        { status: 400 }
      );
    }

    const { data: match, error: createMatchError } = await serviceClient
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
      .select('*')
      .single();

    if (createMatchError || !match) {
      console.error('Error creating match from room:', createMatchError);
      return NextResponse.json(
        { error: 'Failed to create match for room' },
        { status: 500 }
      );
    }

    type MatchPlayerInsert =
      Database['public']['Tables']['match_players']['Insert'];

    const matchPlayersPayload: MatchPlayerInsert[] = activeMembers.map(
      (member) => ({
        match_id: match.id,
        room_player_id: member.id,
        user_id: member.user_id,
        status: 'active',
        joined_at: now,
      })
    );

    const { error: playersInsertError } = await serviceClient
      .from('match_players')
      .insert(matchPlayersPayload);

    if (playersInsertError) {
      console.error('Error cloning room players to match:', playersInsertError);
      await serviceClient.from('matches').delete().eq('id', match.id);
      return NextResponse.json(
        { error: 'Failed to add players to new match' },
        { status: 500 }
      );
    }

    const debitedUsers: string[] = [];

    for (const member of activeMembers) {
      const { error: debitError } = await serviceClient.rpc(
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
        console.error('Error debiting entry fee for user:', {
          userId: member.user_id,
          error: debitError,
        });

        for (const debitedUserId of debitedUsers) {
          const { error: rollbackError } = await serviceClient.rpc(
            'update_wallet_balance',
            {
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
            }
          );

          if (rollbackError) {
            console.error('Failed to rollback entry fee for user:', {
              userId: debitedUserId,
              error: rollbackError,
            });
          }
        }

        await serviceClient
          .from('match_players')
          .delete()
          .eq('match_id', match.id);
        await serviceClient.from('matches').delete().eq('id', match.id);

        return NextResponse.json(
          {
            error: 'Failed to charge entry fee',
            message:
              'Không thể trừ phí tham gia của tất cả người chơi. Vui lòng kiểm tra lại số dư và thử lại.',
          },
          { status: 400 }
        );
      }

      debitedUsers.push(member.user_id);
    }

    const { error: roomUpdateError } = await serviceClient
      .from('rooms')
      .update({
        status: 'ongoing',
        updated_at: now,
      })
      .eq('id', roomId);

    if (roomUpdateError) {
      console.error('Error updating room status:', roomUpdateError);
      return NextResponse.json(
        { error: 'Failed to update room status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trận đấu mới đã được tạo và bắt đầu.',
      matchId: match.id,
      round: nextRound,
    });
  } catch (error) {
    console.error('Error in POST /api/rooms/[id]/start-match:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
