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

    // Check if match is open
    if (match.status !== 'open') {
      return NextResponse.json(
        { error: 'Match is not open for joining' },
        { status: 400 }
      );
    }

    // Check if user already joined
    const { data: existingPlayer } = await client
      .from('match_players')
      .select('*')
      .eq('match_id', matchId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'You have already joined this match' },
        { status: 400 }
      );
    }

    // Get current player count
    const { data: currentPlayers, error: countError } = await client
      .from('match_players')
      .select('id', { count: 'exact' })
      .eq('match_id', matchId)
      .eq('status', 'active');

    if (countError) {
      console.error('Error counting players:', countError);
      return NextResponse.json(
        { error: 'Failed to check player count' },
        { status: 500 }
      );
    }

    const currentPlayerCount = currentPlayers?.length || 0;

    // Check if match is full
    if (currentPlayerCount >= match.max_players) {
      return NextResponse.json({ error: 'Match is full' }, { status: 400 });
    }

    // Check user's wallet balance
    const { data: wallet, error: walletError } = await client
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (wallet.balance < match.entry_fee) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Start transaction: deduct entry fee and join match
    const { data: ledgerId, error: walletUpdateError } = await client.rpc(
      'update_wallet_balance',
      {
        p_user_id: user.id,
        p_amount: -match.entry_fee,
        p_transaction_type: 'join_match',
        p_description: `Tham gia trận đấu: ${match.title}`,
        p_reference_id: matchId,
        p_reference_type: 'match',
        p_metadata: {
          match_id: matchId,
          entry_fee: match.entry_fee,
        },
      }
    );

    if (walletUpdateError) {
      console.error('Error updating wallet balance:', walletUpdateError);
      return NextResponse.json(
        { error: 'Failed to deduct entry fee' },
        { status: 500 }
      );
    }

    // Join match
    const { data: matchPlayer, error: joinError } = await client
      .from('match_players')
      .insert({
        match_id: matchId,
        user_id: user.id,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (joinError) {
      console.error('Error joining match:', joinError);
      return NextResponse.json(
        { error: 'Failed to join match' },
        { status: 500 }
      );
    }

    // Check if match is now full and should start
    const newPlayerCount = currentPlayerCount + 1;
    if (newPlayerCount >= match.max_players) {
      // Update match status to ongoing
      const { error: statusError } = await client
        .from('matches')
        .update({
          status: 'ongoing',
          started_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (statusError) {
        console.error('Error updating match status:', statusError);
        // Don't fail the join operation, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined match',
      matchPlayer,
      ledgerId,
    });
  } catch (error) {
    console.error('Error in POST /api/matches/[id]/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
