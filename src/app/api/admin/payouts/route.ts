import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET() {
  try {
    const client = createServerClient();

    // Get current user and check if admin
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all payout requests with user information
    const { data: payoutRequests, error } = await client
      .from('payout_requests')
      .select(
        `
        *,
        user:users(full_name, email)
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payout requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payout requests' },
        { status: 500 }
      );
    }

    return NextResponse.json(payoutRequests || []);
  } catch (error) {
    console.error('Error in GET /api/admin/payouts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
