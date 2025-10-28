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

    // Check if match is still open
    if (match.status !== 'open') {
      return NextResponse.json(
        { error: 'Cannot leave match that has already started or ended' },
        { status: 400 }
      );
    }

    // Check if user has joined this match
    const { data: matchPlayer, error: playerError } = await client
      .from('match_players')
      .select('*')
      .eq('match_id', matchId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (playerError || !matchPlayer) {
      return NextResponse.json(
        { error: 'You are not a member of this match' },
        { status: 400 }
      );
    }

    // Refund entry fee
    const { data: ledgerId, error: walletUpdateError } = await client.rpc(
      'update_wallet_balance',
      {
        p_user_id: user.id,
        p_amount: match.entry_fee,
        p_transaction_type: 'leave_match',
        p_description: `Rời trận đấu: ${match.title} (hoàn phí)`,
        p_reference_id: matchId,
        p_reference_type: 'match',
        p_metadata: {
          match_id: matchId,
          entry_fee: match.entry_fee,
          refund: true,
        },
      }
    );

    if (walletUpdateError) {
      console.error('Error refunding entry fee:', walletUpdateError);
      return NextResponse.json(
        { error: 'Failed to refund entry fee' },
        { status: 500 }
      );
    }

    // Leave match
    const { error: leaveError } = await client
      .from('match_players')
      .update({
        status: 'left',
        left_at: new Date().toISOString(),
      })
      .eq('id', matchPlayer.id);

    if (leaveError) {
      console.error('Error leaving match:', leaveError);
      return NextResponse.json(
        { error: 'Failed to leave match' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left match',
      ledgerId,
    });
  } catch (error) {
    console.error('Error in POST /api/matches/[id]/leave:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
