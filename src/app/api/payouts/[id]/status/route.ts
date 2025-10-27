import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = createServerClient();
    const { id: payoutId } = params;

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get payout request details
    const { data: payoutRequest, error } = await client
      .from('payout_requests')
      .select('*')
      .eq('id', payoutId)
      .eq('user_id', user.id)
      .single();

    if (error || !payoutRequest) {
      return NextResponse.json(
        { error: 'Payout request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(payoutRequest);
  } catch (error) {
    console.error('Error in GET /api/payouts/[id]/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
