import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const authClient = createApiAuthClient(request);
    const serviceClient = createServerClient();

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

    // Check if user is the creator
    if (room.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the room creator can cancel the room' },
        { status: 403 }
      );
    }

    // Check if room can be cancelled
    if (room.status === 'completed' || room.status === 'cancelled') {
      return NextResponse.json(
        {
          error: 'Cannot cancel a room that is already completed or cancelled',
        },
        { status: 400 }
      );
    }

    const entryFee = Number(room.entry_fee ?? 0);

    if (room.status === 'ongoing') {
      if (!Number.isFinite(entryFee) || entryFee <= 0) {
        return NextResponse.json(
          {
            error: 'Invalid entry fee',
            message:
              'Không thể hoàn phí vì phí tham gia phòng đấu không hợp lệ.',
          },
          { status: 400 }
        );
      }

      const { data: ongoingMatch } = await serviceClient
        .from('matches')
        .select('id, title, round_number')
        .eq('room_id', roomId)
        .eq('status', 'ongoing')
        .maybeSingle();

      const { data: activePlayers, error: activePlayersError } =
        await serviceClient
          .from('room_players')
          .select('user_id')
          .eq('room_id', roomId)
          .eq('status', 'active');

      if (activePlayersError) {
        console.error(
          'Error fetching active players for refund:',
          activePlayersError
        );
        return NextResponse.json(
          { error: 'Failed to prepare refunds for players' },
          { status: 500 }
        );
      }

      const refundedUserIds: string[] = [];
      const refundDescription = `Hoàn phí tham gia do phòng đấu bị hủy${
        ongoingMatch?.round_number
          ? ` (Round ${ongoingMatch.round_number})`
          : ''
      }`;

      for (const player of activePlayers ?? []) {
        const { error: refundError } = await serviceClient.rpc(
          'update_wallet_balance',
          {
            p_user_id: player.user_id,
            p_amount: entryFee,
            p_transaction_type: 'leave_match',
            p_reference_id: ongoingMatch?.id ?? roomId,
            p_reference_type: ongoingMatch ? 'match' : 'room',
            p_description: refundDescription,
            p_metadata: {
              room_id: roomId,
              match_id: ongoingMatch?.id ?? null,
              entry_fee: entryFee,
              reason: 'room_cancelled',
            },
          }
        );

        if (refundError) {
          console.error('Failed to refund player during room cancellation:', {
            userId: player.user_id,
            error: refundError,
          });

          for (const refundedUserId of refundedUserIds) {
            const { error: rollbackError } = await serviceClient.rpc(
              'update_wallet_balance',
              {
                p_user_id: refundedUserId,
                p_amount: -entryFee,
                p_transaction_type: 'join_match',
                p_reference_id: ongoingMatch?.id ?? roomId,
                p_reference_type: ongoingMatch ? 'match' : 'room',
                p_description: `Khôi phục phí tham gia sau lỗi hủy phòng đấu`,
                p_metadata: {
                  room_id: roomId,
                  match_id: ongoingMatch?.id ?? null,
                  entry_fee: entryFee,
                  reason: 'cancel_refund_failed',
                },
              }
            );

            if (rollbackError) {
              console.error(
                'Failed to rollback refund during room cancellation:',
                {
                  userId: refundedUserId,
                  error: rollbackError,
                }
              );
            }
          }

          return NextResponse.json(
            {
              error: 'Failed to refund players',
              message:
                'Không thể hoàn phí cho tất cả người chơi. Vui lòng thử lại sau.',
            },
            { status: 500 }
          );
        }

        refundedUserIds.push(player.user_id);
      }
    }

    // Update all room players status to 'left'
    const { error: updatePlayersError } = await serviceClient
      .from('room_players')
      .update({
        status: 'left',
        left_at: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .eq('status', 'active');

    if (updatePlayersError) {
      console.error('Error updating room players status:', updatePlayersError);
      return NextResponse.json(
        { error: 'Failed to update room players status' },
        { status: 500 }
      );
    }

    // Cancel any pending matches under this room
    const { error: matchesUpdateError } = await serviceClient
      .from('matches')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .in('status', ['open', 'ongoing']);

    if (matchesUpdateError) {
      console.error('Error cancelling related matches:', matchesUpdateError);
      return NextResponse.json(
        { error: 'Failed to cancel related matches' },
        { status: 500 }
      );
    }

    // Update room status to cancelled
    const { error: roomUpdateError } = await serviceClient
      .from('rooms')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (roomUpdateError) {
      console.error('Error cancelling room:', roomUpdateError);
      return NextResponse.json(
        { error: 'Failed to cancel room' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Phòng đấu đã được hủy thành công',
    });
  } catch (error) {
    console.error('Error in POST /api/matches/[id]/cancel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
