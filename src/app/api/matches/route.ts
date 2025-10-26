import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
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
    const client = createServerClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'open'
      | 'ongoing'
      | 'completed'
      | 'cancelled'
      | null;

    // Build query
    let query = client
      .from('matches')
      .select(
        `
        *,
        created_by_user:users!matches_created_by_fkey(full_name, avatar_url),
        winner_user:users!matches_winner_id_fkey(full_name, avatar_url),
        match_players(status)
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
    const client = createServerClient();

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

    return NextResponse.json({
      ...match,
      current_players: 0,
    });
  } catch (error) {
    console.error('Error in POST /api/matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
