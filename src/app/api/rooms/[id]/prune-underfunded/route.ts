import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = createApiAuthClient(request);
    const serviceClient = createServerClient();
    const { id: roomId } = await params;

    // Auth: must be logged in
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load room and verify requester is the creator
    const { data: room, error: roomError } = await serviceClient
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Allow the room creator OR any active room member to trigger pruning
    if (room.created_by !== user.id) {
      const { data: membership, error: membershipError } = await serviceClient
        .from('room_players')
        .select('id, status')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();

      const isActiveMember =
        !membershipError && membership && membership.status === 'active';

      if (!isActiveMember) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message:
              'Only the room owner or active room members can perform this action.',
          },
          { status: 403 }
        );
      }
    }

    // Fetch active players in the room
    const { data: activePlayers, error: playersError } = await serviceClient
      .from('room_players')
      .select('user_id')
      .eq('room_id', roomId)
      .eq('status', 'active');

    if (playersError) {
      return NextResponse.json(
        { error: 'Failed to fetch room players' },
        { status: 500 }
      );
    }

    const activeUserIds = (activePlayers ?? []).map((p) => p.user_id);
    if (activeUserIds.length === 0) {
      return NextResponse.json({ kicked: [], current_players: 0 });
    }

    // Load wallets for those users
    const { data: wallets, error: walletsError } = await serviceClient
      .from('wallets')
      .select('user_id, balance')
      .in('user_id', activeUserIds);

    if (walletsError) {
      return NextResponse.json(
        { error: 'Failed to fetch wallets' },
        { status: 500 }
      );
    }

    const entryFee = Number(room.entry_fee);
    const underfundedUserIds = new Set<string>();
    const userIdToBalance = new Map<string, number>();
    for (const w of wallets ?? []) {
      userIdToBalance.set(w.user_id as string, Number(w.balance));
    }
    for (const uid of activeUserIds) {
      const bal = userIdToBalance.get(uid) ?? 0;
      if (bal < entryFee) {
        underfundedUserIds.add(uid);
      }
    }

    const kicked = Array.from(underfundedUserIds);
    if (kicked.length > 0) {
      // Mark kicked in room_players
      const { error: kickError } = await serviceClient
        .from('room_players')
        .update({
          status: 'kicked',
          left_at: new Date().toISOString(),
        })
        .eq('room_id', roomId)
        .in('user_id', kicked)
        .eq('status', 'active');

      if (kickError) {
        console.error('Error kicking players:', kickError);
        return NextResponse.json(
          { error: 'Failed to update room players' },
          { status: 500 }
        );
      }

      // If there is an ongoing match under this room, also mark them as left in match_players
      const { data: ongoingMatch, error: ongoingError } = await serviceClient
        .from('matches')
        .select('id')
        .eq('room_id', roomId)
        .eq('status', 'ongoing')
        .maybeSingle();

      if (ongoingError) {
        console.error('Error fetching ongoing match:', ongoingError);
      } else if (ongoingMatch) {
        const { error: updateMatchPlayersError } = await serviceClient
          .from('match_players')
          .update({
            status: 'left',
            left_at: new Date().toISOString(),
          })
          .eq('match_id', ongoingMatch.id)
          .in('user_id', kicked);

        if (updateMatchPlayersError) {
          console.error(
            'Error updating match players:',
            updateMatchPlayersError
          );
        }
      }
    }

    // Count remaining active players
    const { count: remainingActive } = await serviceClient
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('status', 'active');

    return NextResponse.json({
      kicked,
      current_players: remainingActive ?? 0,
    });
  } catch (error) {
    console.error('Error in POST /api/rooms/[id]/prune-underfunded:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
