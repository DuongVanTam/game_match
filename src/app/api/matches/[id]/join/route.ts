import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = createApiAuthClient(request);
    const serviceClient = createServerClient();
    const { id: matchId } = await params;

    // Get current user from auth
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get match details
    const { data: match, error: matchError } = await serviceClient
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
        {
          error: 'Match is not open for joining',
          message: 'Trận đấu này không còn mở để tham gia.',
        },
        { status: 400 }
      );
    }

    // Check if user already has a participation record
    const { data: existingPlayer } = await serviceClient
      .from('match_players')
      .select('*')
      .eq('match_id', matchId)
      .eq('user_id', user.id)
      .single();

    if (existingPlayer && existingPlayer.status === 'active') {
      return NextResponse.json(
        {
          error: 'You have already joined this match',
          message: 'Bạn đã tham gia trận đấu này rồi.',
        },
        { status: 400 }
      );
    }

    // Get current player count
    const { data: currentPlayers, error: countError } = await serviceClient
      .from('match_players')
      .select('id', { count: 'exact' })
      .eq('match_id', matchId)
      .eq('status', 'active');

    if (countError) {
      console.error('Error counting players:', countError);
      return NextResponse.json(
        {
          error: 'Failed to check player count',
          message: 'Không thể kiểm tra số lượng người chơi hiện tại.',
        },
        { status: 500 }
      );
    }

    const currentPlayerCount = currentPlayers?.length || 0;

    // Check if match is full
    if (currentPlayerCount >= match.max_players) {
      return NextResponse.json(
        {
          error: 'Match is full',
          message: 'Trận đấu đã đủ người tham gia.',
        },
        { status: 400 }
      );
    }

    // Check user's wallet balance
    const { data: wallet, error: walletError } = await serviceClient
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        {
          error: 'Wallet not found',
          message: 'Không tìm thấy ví của bạn. Vui lòng khởi tạo ví.',
        },
        { status: 404 }
      );
    }

    if (wallet.balance < match.entry_fee) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          message:
            'Số dư của bạn không đủ để tham gia trận đấu. Vui lòng nạp thêm tiền.',
        },
        { status: 400 }
      );
    }

    // Start transaction: deduct entry fee and join match
    const { data: ledgerId, error: walletUpdateError } =
      await serviceClient.rpc('update_wallet_balance', {
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
      });

    if (walletUpdateError) {
      console.error('Error updating wallet balance:', walletUpdateError);
      return NextResponse.json(
        {
          error: 'Failed to deduct entry fee',
          message: 'Không thể trừ phí tham gia từ ví của bạn.',
        },
        { status: 500 }
      );
    }

    // Join match
    let matchPlayer = existingPlayer || null;
    if (existingPlayer && existingPlayer.status !== 'active') {
      const { data: updatedPlayer, error: reactivateError } =
        await serviceClient
          .from('match_players')
          .update({
            status: 'active',
            joined_at: new Date().toISOString(),
            left_at: null,
          })
          .eq('id', existingPlayer.id)
          .select()
          .single();

      if (reactivateError || !updatedPlayer) {
        console.error('Error reactivating player:', reactivateError);
        return NextResponse.json(
          {
            error: 'Failed to rejoin match',
            message: 'Không thể tham gia lại trận đấu.',
          },
          { status: 500 }
        );
      }

      matchPlayer = updatedPlayer;
    } else if (!existingPlayer) {
      const { data: insertedPlayer, error: joinError } = await serviceClient
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
        if (joinError.code === '23505') {
          return NextResponse.json(
            {
              error: 'Duplicate join',
              message: 'Bạn đã tham gia trận đấu này rồi.',
            },
            { status: 400 }
          );
        }

        console.error('Error joining match:', joinError);
        return NextResponse.json(
          {
            error: 'Failed to join match',
            message: 'Không thể thêm bạn vào trận đấu.',
          },
          { status: 500 }
        );
      }

      matchPlayer = insertedPlayer;
    }

    // Check if match is now full and should start
    const newPlayerCount = currentPlayerCount + 1;
    if (newPlayerCount >= match.max_players) {
      // Update match status to ongoing
      const { error: statusError } = await serviceClient
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
      current_players: newPlayerCount,
    });
  } catch (error) {
    console.error('Error in POST /api/matches/[id]/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
