import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';

export async function GET() {
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

    // Get user profile
    const { data: userProfile, error: userError } = await client
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get wallet balance
    const { data: wallet, error: walletError } = await client
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Get recent transactions (last 5)
    const { data: transactions, error: transactionsError } = await client
      .from('ledger')
      .select('id, transaction_type, amount, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Don't fail if transactions can't be fetched, just return empty array
    const recentTransactions = transactionsError ? [] : transactions || [];

    return NextResponse.json({
      balance: wallet.balance,
      transactions: recentTransactions,
      user: {
        full_name: userProfile.full_name,
        email: userProfile.email,
      },
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
