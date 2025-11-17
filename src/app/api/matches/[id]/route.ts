import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = createServerClient();
    const { id: roomId } = await params;

    // Get room with players and matches
    const { data: room, error } = await client
      .from('rooms')
      .select(
        `
        *,
        created_by_user:users!rooms_created_by_fkey(full_name, avatar_url),
        room_players(
          id,
          user_id,
          status,
          joined_at,
          left_at,
          user:users(full_name, avatar_url)
        ),
        matches(
          id,
          room_id,
          status,
          round_number,
          entry_fee,
          max_players,
          current_players,
          created_by,
          created_at,
          started_at,
          completed_at,
          winner_id,
          proof_image_url,
        placements,
          winner_user:users!matches_winner_id_fkey(full_name, avatar_url),
          match_players(
            id,
            user_id,
            status,
            joined_at,
            left_at,
            user:users(full_name, avatar_url)
          )
        )
      `
      )
      .eq('id', roomId)
      .single();

    if (error) {
      console.error('Error fetching room:', error);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const activeMembers =
      room.room_players?.filter(
        (player: { status: string | null }) => player.status === 'active'
      ) ?? [];

    const sortedMatches = Array.isArray(room.matches)
      ? [...room.matches].sort(
          (a, b) =>
            new Date(b.created_at ?? b.started_at ?? 0).getTime() -
            new Date(a.created_at ?? a.started_at ?? 0).getTime()
        )
      : [];

    const latestMatch = sortedMatches[0] ?? null;

    return NextResponse.json({
      ...room,
      current_players: activeMembers.length,
      match_players: activeMembers,
      latest_match: latestMatch,
      matches: sortedMatches,
      winner_user: latestMatch?.winner_user ?? null,
    });
  } catch (error) {
    console.error('Error in GET /api/matches/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
