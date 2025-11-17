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
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'open'
      | 'ongoing'
      | 'completed'
      | 'cancelled'
      | null;
    const paginated = searchParams.get('paginated') === '1';
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor'); // ISO datetime string
    const limit = Math.min(
      Math.max(parseInt(limitParam || '20', 10) || 20, 1),
      50
    );

    const serviceClient = createServerClient();

    let query = serviceClient
      .from('rooms')
      .select(
        `
        *,
        created_by_user:users!rooms_created_by_fkey(full_name, avatar_url),
        room_players(
          user_id,
          status,
          users (
            full_name,
            avatar_url
          )
        ),
        matches:matches(
          id,
          status,
          round_number,
          created_at,
          started_at,
          completed_at,
          winner_id,
          placements,
          winner:users!matches_winner_id_fkey(full_name, avatar_url)
        )
      `
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (paginated) {
      if (cursor) {
        query = query.lt('created_at', cursor);
      }
      query = query.limit(limit);
    }

    const { data: rooms, error } = await query;

    if (error) {
      console.error('Error fetching rooms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rooms' },
        { status: 500 }
      );
    }

    const transformedRooms =
      rooms?.map((room) => {
        const activeMembers =
          room.room_players?.filter(
            (p: { status: string | null }) => p.status === 'active'
          ) ?? [];

        const latestMatch = Array.isArray(room.matches)
          ? [...room.matches].sort(
              (a, b) =>
                new Date(b.created_at ?? b.started_at ?? 0).getTime() -
                new Date(a.created_at ?? a.started_at ?? 0).getTime()
            )[0]
          : null;

        return {
          ...room,
          current_players: activeMembers.length,
          match_players: activeMembers.map((member) => ({
            user_id: member.user_id,
            status: member.status,
          })),
          winner_user: latestMatch?.winner ?? null,
        };
      }) ?? [];

    if (paginated) {
      const hasMore = transformedRooms.length === limit;
      const nextCursor =
        transformedRooms.length > 0
          ? transformedRooms[transformedRooms.length - 1].created_at
          : null;
      return NextResponse.json({
        items: transformedRooms,
        nextCursor,
        hasMore,
      });
    }

    return NextResponse.json(transformedRooms);
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

    // Create room
    const { data: room, error: roomError } = await client
      .from('rooms')
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
        created_by_user:users!rooms_created_by_fkey(full_name, avatar_url)
      `
      )
      .single();

    if (roomError) {
      console.error('Error creating room:', roomError);
      return NextResponse.json(
        { error: 'Failed to create room' },
        { status: 500 }
      );
    }

    // Add creator as room member
    const { error: memberError } = await client.from('room_players').insert({
      room_id: room.id,
      user_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error('Error adding creator to room:', memberError);
      await client.from('rooms').delete().eq('id', room.id);
      return NextResponse.json(
        { error: 'Failed to add creator to room' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...room,
      current_players: 1,
      match_players: [
        {
          user_id: user.id,
          status: 'active',
        },
      ],
    });
  } catch (error) {
    console.error('Error in POST /api/matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
