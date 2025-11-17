import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';
import { getPrizeRecipients, type PrizeRecipient } from '@/lib/match-rewards';

const settleMatchSchema = z.object({
  winnerId: z.string().uuid(),
  proofImageUrl: z.string().url().optional(),
  placements: z
    .array(
      z.object({
        userId: z.string().uuid(),
        displayName: z.string().min(1),
        rank: z.number().int().min(1).max(8).nullable(),
        confidence: z.number().min(0).max(1).nullable(),
        reason: z.string().min(1),
      })
    )
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const serviceClient = createServerClient();
    const authClient = createApiAuthClient(request);
    const { id: matchId } = await params;

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { winnerId, proofImageUrl, placements } =
      settleMatchSchema.parse(body);

    // Get match details
    const { data: match, error: matchError } = await serviceClient
      .from('matches')
      .select(
        `
        *,
        room:rooms!matches_room_id_fkey(id, status),
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

    if (match.status !== 'ongoing') {
      return NextResponse.json(
        { error: 'Match must be ongoing to settle' },
        { status: 400 }
      );
    }

    // Check if match is in ongoing status
    if (!match.room) {
      return NextResponse.json(
        { error: 'Match room relationship missing' },
        { status: 500 }
      );
    }

    const { data: currentUser } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const matchPlayers = Array.isArray(match.match_players)
      ? match.match_players
      : [];
    const activePlayers = matchPlayers.filter(
      (player: { status: string | null }) => player.status === 'active'
    );
    const isCreator = match.created_by === user.id;
    const isAdmin = currentUser?.role === 'admin';
    const isActivePlayer = activePlayers.some(
      (player: { user_id: string }) => player.user_id === user.id
    );

    if (!isCreator && !isAdmin && !isActivePlayer) {
      return NextResponse.json(
        { error: 'Only participants or admins can settle matches' },
        { status: 403 }
      );
    }

    const winnerPlayer = activePlayers.find(
      (player: { user_id: string }) => player.user_id === winnerId
    );

    if (!winnerPlayer) {
      return NextResponse.json(
        { error: 'Winner must be an active player in this match' },
        { status: 400 }
      );
    }

    const entryFee = Number(match.entry_fee ?? 0);

    if (Number.isNaN(entryFee) || entryFee <= 0) {
      return NextResponse.json(
        { error: 'Invalid match entry fee configuration' },
        { status: 400 }
      );
    }

    // Calculate settlement
    const totalPool = entryFee * activePlayers.length;
    const serviceFeeRate = 0.1; // 10%
    const serviceFee = Math.floor(totalPool * serviceFeeRate);

    // Get prize recipients based on placements
    const validPlacements =
      placements?.filter((p) => p.rank !== null && p.rank >= 1) ?? [];
    const prizeRecipients = getPrizeRecipients(
      entryFee,
      activePlayers.length,
      validPlacements
    );

    // If no placements provided or no valid recipients, fallback to winner takes all
    const totalPrizeAmount =
      prizeRecipients.length > 0
        ? prizeRecipients.reduce((sum, r) => sum + r.prizeAmount, 0)
        : totalPool - serviceFee;

    // Determine winner (rank 1) from placements or use provided winnerId
    const topPlayer =
      prizeRecipients.find((r) => r.rank === 1) ??
      validPlacements.find((p) => p.rank === 1);
    const finalWinnerId = topPlayer?.userId ?? winnerId;

    // Update match status and winner
    const { data: matchUpdateData, error: matchUpdateError } =
      await serviceClient
        .from('matches')
        .update({
          status: 'completed',
          winner_id: finalWinnerId,
          proof_image_url: proofImageUrl || null,
          placements: placements ?? null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .eq('status', 'ongoing')
        .select('id')
        .maybeSingle();

    if (matchUpdateError) {
      console.error('Match update error:', matchUpdateError);
      return NextResponse.json(
        { error: 'Failed to update match' },
        { status: 500 }
      );
    }

    if (!matchUpdateData) {
      return NextResponse.json(
        {
          error: 'Match already settled',
          message: 'Trận đấu này đã được hoàn tất trước đó.',
        },
        { status: 409 }
      );
    }

    // Credit prizes to all recipients
    if (prizeRecipients.length > 0) {
      const prizeCreditPromises = prizeRecipients.map((recipient) =>
        serviceClient.rpc('update_wallet_balance', {
          p_user_id: recipient.userId,
          p_amount: recipient.prizeAmount,
          p_transaction_type: 'win_prize',
          p_reference_id: matchId,
          p_reference_type: 'match',
          p_description: `Giải thưởng hạng ${recipient.rank} từ trận đấu: ${match.title}`,
          p_metadata: {
            match_id: matchId,
            match_title: match.title,
            prize_amount: recipient.prizeAmount,
            rank: recipient.rank,
            service_fee: serviceFee,
            total_pool: totalPool,
          },
        })
      );

      const prizeCreditResults = await Promise.allSettled(prizeCreditPromises);
      const prizeCreditFailures = prizeCreditResults.filter(
        (result) => result.status === 'rejected'
      );

      if (prizeCreditFailures.length > 0) {
        console.error(
          'Failed to credit prizes to some recipients:',
          prizeCreditFailures
        );
        return NextResponse.json(
          { error: 'Failed to credit prizes to some recipients' },
          { status: 500 }
        );
      }
    } else {
      // Fallback: credit all to winner (backward compatibility)
      const { error: prizeCreditError } = await serviceClient.rpc(
        'update_wallet_balance',
        {
          p_user_id: finalWinnerId,
          p_amount: totalPrizeAmount,
          p_transaction_type: 'win_prize',
          p_reference_id: matchId,
          p_reference_type: 'match',
          p_description: `Giải thưởng từ trận đấu: ${match.title}`,
          p_metadata: {
            match_id: matchId,
            match_title: match.title,
            prize_amount: totalPrizeAmount,
            service_fee: serviceFee,
            total_pool: totalPool,
          },
        }
      );

      if (prizeCreditError) {
        console.error('Failed to credit prize to winner:', prizeCreditError);
        return NextResponse.json(
          { error: 'Failed to credit prize to winner' },
          { status: 500 }
        );
      }
    }

    // Get all prize recipient user IDs
    const prizeRecipientIds = new Set(prizeRecipients.map((r) => r.userId));
    if (prizeRecipients.length === 0) {
      prizeRecipientIds.add(finalWinnerId);
    }

    const losingPlayers = activePlayers.filter(
      (player: { user_id: string }) => !prizeRecipientIds.has(player.user_id)
    );

    // Update match players status
    if (losingPlayers.length > 0) {
      const losingIds = losingPlayers.map(
        (player: { id: string }) => player.id
      );

      const { error: updateLosersError } = await serviceClient
        .from('match_players')
        .update({
          status: 'left',
          left_at: new Date().toISOString(),
        })
        .in('id', losingIds);

      if (updateLosersError) {
        console.error(
          'Error updating losing players status:',
          updateLosersError
        );
      }
    }

    // Update status for all prize recipients
    if (prizeRecipientIds.size > 0) {
      const { error: updateWinnersStatusError } = await serviceClient
        .from('match_players')
        .update({
          status: 'active',
          left_at: null,
        })
        .eq('match_id', matchId)
        .in('user_id', Array.from(prizeRecipientIds));

      if (updateWinnersStatusError) {
        console.error(
          'Error updating prize recipients match player status:',
          updateWinnersStatusError
        );
      }
    }

    // Add ledger entry for service fee (platform revenue)
    const platformUserId =
      process.env.PLATFORM_USER_ID ||
      process.env.NEXT_PUBLIC_PLATFORM_USER_ID ||
      match.created_by;

    const { error: serviceFeeLedgerError } = await serviceClient
      .from('ledger')
      .insert({
        user_id: platformUserId,
        transaction_type: 'service_fee',
        amount: serviceFee,
        balance_after: 0,
        reference_id: matchId,
        reference_type: 'match',
        description: `Phí dịch vụ từ trận đấu: ${match.title}`,
        metadata: {
          match_id: matchId,
          match_title: match.title,
          prize_amount: totalPrizeAmount,
          service_fee: serviceFee,
          total_pool: totalPool,
        },
      });

    if (serviceFeeLedgerError) {
      console.error('Service fee ledger error:', serviceFeeLedgerError);
    }

    // Update room status to completed
    const { error: roomStatusError } = await serviceClient
      .from('rooms')
      .update({
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.room_id);

    if (roomStatusError) {
      console.error(
        'Error updating room status after settlement:',
        roomStatusError
      );
    }

    // Get updated match data
    const { data: updatedMatch } = await serviceClient
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
        totalPrizeAmount,
        activePlayersCount: activePlayers.length,
        prizeRecipients:
          prizeRecipients.length > 0
            ? prizeRecipients.map((r) => ({
                userId: r.userId,
                rank: r.rank,
                prizeAmount: r.prizeAmount,
              }))
            : [
                {
                  userId: finalWinnerId,
                  rank: 1,
                  prizeAmount: totalPrizeAmount,
                },
              ],
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
