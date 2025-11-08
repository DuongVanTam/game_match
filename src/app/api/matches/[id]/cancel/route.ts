import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = createServerClient();
    const { id: matchId } = await params;

    // Get current user from auth
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get match details
    const { data: match, error: matchError } = await client
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Check if user is the creator
    if (match.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the match creator can cancel the match' },
        { status: 403 }
      );
    }

    // Check if match can be cancelled (only open or ongoing matches)
    if (match.status === 'completed' || match.status === 'cancelled') {
      return NextResponse.json(
        {
          error: 'Cannot cancel a match that is already completed or cancelled',
        },
        { status: 400 }
      );
    }

    // Get all active players
    const { data: activePlayers, error: playersError } = await client
      .from('match_players')
      .select('user_id')
      .eq('match_id', matchId)
      .eq('status', 'active');

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    // Refund entry fee to all active players
    if (activePlayers && activePlayers.length > 0) {
      const refundPromises = activePlayers.map((player) =>
        client.rpc('update_wallet_balance', {
          p_user_id: player.user_id,
          p_amount: match.entry_fee,
          p_transaction_type: 'refund',
          p_description: `Hoàn phí do hủy trận đấu: ${match.title}`,
          p_reference_id: matchId,
          p_reference_type: 'match',
          p_metadata: {
            match_id: matchId,
            reason: 'match_cancelled',
            entry_fee: match.entry_fee,
          },
        })
      );

      const refundResults = await Promise.allSettled(refundPromises);

      // Check if any refund failed
      const failedRefunds = refundResults.filter(
        (result) => result.status === 'rejected'
      );
      if (failedRefunds.length > 0) {
        console.error('Some refunds failed:', failedRefunds);
        // Continue with cancellation even if some refunds fail
        // but log the error
      }
    }

    // Update all match players status to 'left'
    const { error: updatePlayersError } = await client
      .from('match_players')
      .update({
        status: 'left',
        left_at: new Date().toISOString(),
      })
      .eq('match_id', matchId)
      .eq('status', 'active');

    if (updatePlayersError) {
      console.error('Error updating players status:', updatePlayersError);
      return NextResponse.json(
        { error: 'Failed to update players status' },
        { status: 500 }
      );
    }

    // Update match status to cancelled
    const { error: matchUpdateError } = await client
      .from('matches')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (matchUpdateError) {
      console.error('Error cancelling match:', matchUpdateError);
      return NextResponse.json(
        { error: 'Failed to cancel match' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Match cancelled successfully',
      refundedPlayers: activePlayers?.length || 0,
    });
  } catch (error) {
    console.error('Error in POST /api/matches/[id]/cancel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
