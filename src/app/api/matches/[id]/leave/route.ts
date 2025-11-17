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

    // Get current user from auth
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get room details
    const { data: room, error: roomError } = await serviceClient
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Only allow leaving when room is open or ongoing
    if (!['open', 'ongoing'].includes(room.status)) {
      return NextResponse.json(
        {
          error: 'Cannot leave room that has already started or ended',
          message: 'Bạn không thể rời phòng sau khi trận đấu đã kết thúc.',
        },
        { status: 400 }
      );
    }

    // Check if user has joined this room
    const { data: roomMember, error: memberError } = await serviceClient
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !roomMember) {
      return NextResponse.json(
        {
          error: 'You are not a member of this room',
          message: 'Bạn không có trong danh sách phòng đấu.',
        },
        { status: 400 }
      );
    }

    // Leave room
    const { error: leaveError } = await serviceClient
      .from('room_players')
      .update({
        status: 'left',
        left_at: new Date().toISOString(),
      })
      .eq('id', roomMember.id);

    if (leaveError) {
      console.error('Error leaving room:', leaveError);
      return NextResponse.json(
        { error: 'Failed to leave room' },
        { status: 500 }
      );
    }

    // If a match is ongoing, mark the player as left in the match players list
    if (room.status === 'ongoing') {
      const { data: ongoingMatch, error: ongoingMatchError } =
        await serviceClient
          .from('matches')
          .select('id')
          .eq('room_id', roomId)
          .eq('status', 'ongoing')
          .maybeSingle();

      if (ongoingMatchError) {
        console.error(
          'Error fetching ongoing match during leave:',
          ongoingMatchError
        );
      }

      if (ongoingMatch) {
        const { error: updateMatchPlayerError } = await serviceClient
          .from('match_players')
          .update({
            status: 'left',
            left_at: new Date().toISOString(),
          })
          .eq('match_id', ongoingMatch.id)
          .eq('user_id', user.id);

        if (updateMatchPlayerError) {
          console.error(
            'Error updating match player status during leave:',
            updateMatchPlayerError
          );
        }
      }
    }

    const { count: remainingActive } = await serviceClient
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('status', 'active');

    return NextResponse.json({
      success: true,
      message: 'Bạn đã rời phòng đấu',
      current_players: remainingActive ?? 0,
    });
  } catch (error) {
    console.error('Error in POST /api/matches/[id]/leave:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
