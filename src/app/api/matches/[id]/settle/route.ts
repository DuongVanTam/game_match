import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-server';
import { z } from 'zod';

const settleMatchSchema = z.object({
  winnerId: z.string().uuid(),
  proofImageUrl: z.string().url().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = createServerClient();
    const { id: matchId } = await params;

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { winnerId, proofImageUrl } = settleMatchSchema.parse(body);

    // Get match details
    const { data: match, error: matchError } = await client
      .from('matches')
      .select(
        `
        *,
        match_players(
          id,
          user_id,
          status,
          user:users(id, full_name)
        )
      `
      )
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Check if match is in ongoing status
    if (match.status !== 'ongoing') {
      return NextResponse.json(
        { error: 'Match must be ongoing to settle' },
        { status: 400 }
      );
    }

    // Check if user is the match creator or admin
    const { data: currentUser } = await client
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (match.created_by !== user.id && currentUser?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only match creator or admin can settle matches' },
        { status: 403 }
      );
    }

    // Verify winner is an active player
    const activePlayers = match.match_players.filter(
      (player: { status: string | null }) => player.status === 'active'
    );

    const winnerPlayer = activePlayers.find(
      (player: { user_id: string }) => player.user_id === winnerId
    );

    if (!winnerPlayer) {
      return NextResponse.json(
        { error: 'Winner must be an active player in this match' },
        { status: 400 }
      );
    }

    // Calculate settlement
    const totalPool = match.entry_fee * activePlayers.length;
    const serviceFeeRate = 0.1; // 10%
    const serviceFee = Math.floor(totalPool * serviceFeeRate);
    const prizeAmount = totalPool - serviceFee;

    // Update match status and winner
    const { error: matchUpdateError } = await client
      .from('matches')
      .update({
        status: 'completed',
        winner_id: winnerId,
        proof_image_url: proofImageUrl || null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (matchUpdateError) {
      console.error('Match update error:', matchUpdateError);
      return NextResponse.json(
        { error: 'Failed to update match' },
        { status: 500 }
      );
    }

    // Get winner's current balance
    const { data: winnerWallet, error: walletError } = await client
      .from('wallets')
      .select('balance')
      .eq('user_id', winnerId)
      .single();

    if (walletError || !winnerWallet) {
      console.error('Winner wallet error:', walletError);
      return NextResponse.json(
        { error: 'Winner wallet not found' },
        { status: 500 }
      );
    }

    // Update winner's wallet
    const { error: walletUpdateError } = await client
      .from('wallets')
      .update({
        balance: winnerWallet.balance + prizeAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', winnerId);

    if (walletUpdateError) {
      console.error('Wallet update error:', walletUpdateError);
      return NextResponse.json(
        { error: 'Failed to update winner wallet' },
        { status: 500 }
      );
    }

    // Add ledger entry for prize
    const { error: prizeLedgerError } = await client.from('ledger').insert({
      user_id: winnerId,
      transaction_type: 'win_prize',
      amount: prizeAmount,
      balance_after: winnerWallet.balance + prizeAmount,
      reference_id: matchId,
      reference_type: 'match',
      description: `Giải thưởng từ trận đấu: ${match.title}`,
      metadata: {
        match_id: matchId,
        match_title: match.title,
        prize_amount: prizeAmount,
        service_fee: serviceFee,
        total_pool: prizeAmount + serviceFee,
      },
    });

    if (prizeLedgerError) {
      console.error('Prize ledger error:', prizeLedgerError);
      return NextResponse.json(
        { error: 'Failed to record prize transaction' },
        { status: 500 }
      );
    }

    // Add ledger entry for service fee (platform revenue)
    const { error: serviceFeeLedgerError } = await client
      .from('ledger')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Platform user ID
        transaction_type: 'service_fee',
        amount: serviceFee,
        balance_after: 0, // Platform balance (not tracked)
        reference_id: matchId,
        reference_type: 'match',
        description: `Phí dịch vụ từ trận đấu: ${match.title}`,
        metadata: {
          match_id: matchId,
          match_title: match.title,
          prize_amount: prizeAmount,
          service_fee: serviceFee,
          total_pool: prizeAmount + serviceFee,
        },
      });

    if (serviceFeeLedgerError) {
      console.error('Service fee ledger error:', serviceFeeLedgerError);
      return NextResponse.json(
        { error: 'Failed to record service fee transaction' },
        { status: 500 }
      );
    }

    // Get updated match data
    const { data: updatedMatch } = await client
      .from('matches')
      .select(
        `
        *,
        winner_user:users!matches_winner_id_fkey(full_name, avatar_url)
      `
      )
      .eq('id', matchId)
      .single();

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      settlement: {
        totalPool,
        serviceFee,
        prizeAmount,
        activePlayersCount: activePlayers.length,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/matches/[id]/settle:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
