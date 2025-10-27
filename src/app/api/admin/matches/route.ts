import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET() {
  try {
    const client = createServerClient();

    // Get current user
    const { user, error: authError } = await getCurrentUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: currentUser } = await client
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get recent matches
    const { data: matches, error } = await client
      .from('matches')
      .select(`
        *,
        created_by_user:users!matches_created_by_fkey(full_name, avatar_url),
        winner_user:users!matches_winner_id_fkey(full_name, avatar_url),
        match_players(
          id,
          user_id,
          status,
          user:users(full_name, avatar_url)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching matches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch matches' },
        { status: 500 }
      );
    }

    // Calculate current players count for each match
    const matchesWithPlayerCount = matches?.map((match) => ({
      ...match,
      current_players:
        match.match_players?.filter(
          (player: { status: string | null }) => player.status === 'active'
        ).length || 0,
    }));

    return NextResponse.json(matchesWithPlayerCount || []);
  } catch (error) {
    console.error('Error in GET /api/admin/matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
