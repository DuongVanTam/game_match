import { NextRequest, NextResponse } from 'next/server';
import {
  createAuthServerClient,
  createServerClient,
} from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema
const createMatchSchema = z.object({
  title: z
    .string()
    .min(1, 'Tiêu đề là bắt buộc')
    .max(100, 'Tiêu đề không được quá 100 ký tự'),
  description: z
    .string()
    .min(1, 'Mô tả là bắt buộc')
    .max(500, 'Mô tả không được quá 500 ký tự'),
  entry_fee: z
    .number()
    .min(10000, 'Phí tham gia tối thiểu là 10,000 VNĐ')
    .max(1000000, 'Phí tham gia tối đa là 1,000,000 VNĐ'),
  max_players: z
    .number()
    .min(2, 'Tối thiểu 2 người chơi')
    .max(8, 'Tối đa 8 người chơi'),
});

export async function GET(request: NextRequest) {
  try {
    const authClient = await createAuthServerClient();

    // Check authentication using RLS-aware client
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'open'
      | 'ongoing'
      | 'completed'
      | 'cancelled'
      | null;

    // Build query
    const serviceClient = createServerClient();

    let query = serviceClient
      .from('matches')
      .select(
        `
        *,
        created_by_user:users!matches_created_by_fkey(full_name, avatar_url),
        winner_user:users!matches_winner_id_fkey(full_name, avatar_url),
        match_players(user_id, status)
      `
      )
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('Error fetching matches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch matches' },
        { status: 500 }
      );
    }

    // Transform data to include current_players count
    const transformedMatches =
      matches?.map((match) => ({
        ...match,
        current_players:
          match.match_players?.filter(
            (p: { status: string | null }) => p.status === 'active'
          ).length || 0,
      })) || [];

    return NextResponse.json(transformedMatches);
  } catch (error) {
    console.error('Error in GET /api/matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await createAuthServerClient();

    // Get current user from auth
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createMatchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { title, description, entry_fee, max_players } = validation.data;

    // Check user's wallet balance before creating match
    const { data: wallet, error: walletError } = await client
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'Wallet not found. Please initialize your wallet first.' },
        { status: 404 }
      );
    }

    if (wallet.balance < entry_fee) {
      return NextResponse.json(
        {
          error:
            'Số dư của bạn không đủ để tạo trận đấu. Vui lòng nạp thêm tiền.',
        },
        { status: 400 }
      );
    }

    // Create match
    const { data: match, error: matchError } = await client
      .from('matches')
      .insert({
        title,
        description,
        entry_fee,
        max_players,
        created_by: user.id,
        status: 'open',
      })
      .select(
        `
        *,
        created_by_user:users!matches_created_by_fkey(full_name, avatar_url)
      `
      )
      .single();

    if (matchError) {
      console.error('Error creating match:', matchError);
      return NextResponse.json(
        { error: 'Failed to create match' },
        { status: 500 }
      );
    }

    // Deduct entry fee from creator's wallet
    const { data: ledgerId, error: walletUpdateError } = await client.rpc(
      'update_wallet_balance',
      {
        p_user_id: user.id,
        p_amount: -entry_fee,
        p_transaction_type: 'join_match',
        p_description: `Tham gia trận đấu: ${title}`,
        p_reference_id: match.id,
        p_reference_type: 'match',
        p_metadata: {
          match_id: match.id,
          entry_fee: entry_fee,
        },
      }
    );

    if (walletUpdateError) {
      console.error('Error updating wallet balance:', walletUpdateError);
      // Rollback: delete the match if wallet update fails
      await client.from('matches').delete().eq('id', match.id);
      return NextResponse.json(
        { error: 'Failed to deduct entry fee' },
        { status: 500 }
      );
    }

    // Add creator as a participant
    const { data: matchPlayer, error: joinError } = await client
      .from('match_players')
      .insert({
        match_id: match.id,
        user_id: user.id,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (joinError) {
      console.error('Error adding creator as participant:', joinError);
      // Rollback: delete the match and refund entry fee
      await client.from('matches').delete().eq('id', match.id);
      // Refund entry fee
      await client.rpc('update_wallet_balance', {
        p_user_id: user.id,
        p_amount: entry_fee,
        p_transaction_type: 'refund',
        p_description: `Hoàn tiền do lỗi tạo trận đấu: ${title}`,
        p_reference_id: match.id,
        p_reference_type: 'match',
        p_metadata: {
          match_id: match.id,
          reason: 'match_creation_failed',
        },
      });
      return NextResponse.json(
        { error: 'Failed to add creator as participant' },
        { status: 500 }
      );
    }

    // Check if match is full (creator is the first player)
    // If max_players is 1, match should start immediately
    let finalStatus = 'open';
    if (max_players === 1) {
      finalStatus = 'ongoing';
      // Update match status to ongoing
      await client
        .from('matches')
        .update({
          status: 'ongoing',
          started_at: new Date().toISOString(),
        })
        .eq('id', match.id);
    }

    return NextResponse.json({
      ...match,
      status: finalStatus,
      current_players: 1,
    });
  } catch (error) {
    console.error('Error in POST /api/matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
