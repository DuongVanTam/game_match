import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
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
    const { user, error: authError } = await getCurrentUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { winnerId, proofImageUrl } = settleMatchSchema.parse(body);

    // Get match details
    const { data: match, error: matchError } = await client
      .from('matches')
      .select(`
        *,
        match_players(
          id,
          user_id,
          status,
          user:users(id, full_name)
        )
      `)
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

    // Start transaction
    const { error: transactionError } = await client.rpc('settle_match', {
      p_match_id: matchId,
      p_winner_id: winnerId,
      p_prize_amount: prizeAmount,
      p_service_fee: serviceFee,
      p_proof_image_url: proofImageUrl || null,
    });

    if (transactionError) {
      console.error('Settlement transaction error:', transactionError);
      return NextResponse.json(
        { error: 'Failed to settle match' },
        { status: 500 }
      );
    }

    // Get updated match data
    const { data: updatedMatch } = await client
      .from('matches')
      .select(`
        *,
        winner_user:users!matches_winner_id_fkey(full_name, avatar_url)
      `)
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
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
