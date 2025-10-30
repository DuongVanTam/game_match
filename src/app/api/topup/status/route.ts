import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txRef = searchParams.get('tx_ref');

    if (!txRef) {
      return NextResponse.json({ error: 'Missing tx_ref' }, { status: 400 });
    }

    // Auth via cookies
    const authClient = createApiAuthClient(request);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service client to bypass RLS but enforce user_id filter
    const serviceClient = createServerClient();
    const { data: topup, error } = await serviceClient
      .from('topups')
      .select('id,status,amount,tx_ref')
      .eq('tx_ref', txRef)
      .eq('user_id', user.id)
      .single();

    if (error || !topup) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: topup.status,
      amount: topup.amount,
      txRef: topup.tx_ref,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
