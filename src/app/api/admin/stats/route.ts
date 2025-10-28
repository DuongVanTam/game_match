import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET() {
  try {
    const client = createServerClient();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
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

    // Get dashboard stats
    const [
      { data: users, error: usersError },
      { data: matches, error: matchesError },
      { data: completedMatches, error: completedError },
      { data: activeMatches, error: activeError },
      { data: revenue, error: revenueError },
    ] = await Promise.all([
      client.from('users').select('id', { count: 'exact' }),
      client.from('matches').select('id', { count: 'exact' }),
      client
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('status', 'completed'),
      client
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('status', 'ongoing'),
      client
        .from('ledger')
        .select('amount')
        .eq('transaction_type', 'service_fee'),
    ]);

    if (
      usersError ||
      matchesError ||
      completedError ||
      activeError ||
      revenueError
    ) {
      console.error('Error fetching stats:', {
        usersError,
        matchesError,
        completedError,
        activeError,
        revenueError,
      });
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }

    const totalRevenue =
      revenue?.reduce((sum, item) => sum + item.amount, 0) || 0;

    const stats = {
      totalUsers: users?.length || 0,
      totalMatches: matches?.length || 0,
      completedMatches: completedMatches?.length || 0,
      activeMatches: activeMatches?.length || 0,
      totalRevenue,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/admin/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
