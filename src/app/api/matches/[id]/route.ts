import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = createServerClient();
    const { id: matchId } = await params;

    // Get match with all related data
    const { data: match, error } = await client
      .from('matches')
      .select(
        `
        *,
        created_by_user:users!matches_created_by_fkey(full_name, avatar_url),
        winner_user:users!matches_winner_id_fkey(full_name, avatar_url),
        match_players(
          id,
          user_id,
          status,
          joined_at,
          left_at,
          user:users(full_name, avatar_url)
        )
      `
      )
      .eq('id', matchId)
      .single();

    if (error) {
      console.error('Error fetching match:', error);
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Calculate current players count
    const currentPlayers =
      match.match_players?.filter(
        (player: { status: string | null }) => player.status === 'active'
      ).length || 0;

    return NextResponse.json({
      ...match,
      current_players: currentPlayers,
    });
  } catch (error) {
    console.error('Error in GET /api/matches/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
