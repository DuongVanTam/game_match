import { NextRequest, NextResponse } from 'next/server';
import {
  createAuthServerClient,
  createServerClient,
} from '@/lib/supabase-server';

/**
 * Initialize a new user after authentication
 * Creates user record and wallet if they don't exist
 */
export async function POST(request: NextRequest) {
  try {
    // Use auth client to read session from cookies
    const authClient = await createAuthServerClient();

    // Get authenticated user from session
    const {
      data: { user: authUser },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !authUser) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for database operations (bypass RLS)
    const adminClient = createServerClient();

    // Check if user already exists
    const { data: existingUser, error: checkError } = await adminClient
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking user:', checkError);
      return NextResponse.json(
        { error: 'Failed to check user existence' },
        { status: 500 }
      );
    }

    // Create user record if it doesn't exist
    if (!existingUser) {
      const { error: insertUserError } = await adminClient
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email!,
          full_name:
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            null,
          avatar_url: authUser.user_metadata?.avatar_url || null,
          role: 'user',
        });

      if (insertUserError) {
        console.error('Error creating user:', insertUserError);
        return NextResponse.json(
          { error: 'Failed to create user record' },
          { status: 500 }
        );
      }
    }

    // Check if wallet already exists
    const { data: existingWallet, error: walletCheckError } = await adminClient
      .from('wallets')
      .select('id, balance')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (walletCheckError) {
      console.error('Error checking wallet:', walletCheckError);
      return NextResponse.json(
        { error: 'Failed to check wallet existence' },
        { status: 500 }
      );
    }

    // Check if user already has a signup bonus ledger entry
    const { data: existingSignupBonus } = await adminClient
      .from('ledger')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('reference_type', 'signup_bonus')
      .maybeSingle();

    const initialBalance = 20000;

    // Create wallet with initial balance if it doesn't exist
    if (!existingWallet) {
      const { error: walletError } = await adminClient.from('wallets').insert({
        user_id: authUser.id,
        balance: initialBalance,
      });

      if (walletError) {
        console.error('Error creating wallet:', walletError);
        return NextResponse.json(
          { error: 'Failed to create wallet' },
          { status: 500 }
        );
      }

      // Add ledger entry for signup bonus if it doesn't exist
      if (!existingSignupBonus) {
        const { error: ledgerError } = await adminClient.from('ledger').insert({
          user_id: authUser.id,
          transaction_type: 'topup',
          amount: initialBalance,
          balance_after: initialBalance,
          reference_id: authUser.id,
          reference_type: 'signup_bonus',
          description: 'Tặng tiền đăng ký tài khoản mới',
          metadata: {
            type: 'signup_bonus',
            amount: initialBalance,
          },
        });

        if (ledgerError) {
          console.error(
            'Error creating ledger entry for signup bonus:',
            ledgerError
          );
          // Don't fail the request if ledger entry creation fails
        }
      }
    } else if (!existingSignupBonus && existingWallet.balance === 0) {
      // If wallet exists but balance is 0 and no signup bonus was given, add it
      const { error: updateError } = await adminClient
        .from('wallets')
        .update({ balance: initialBalance })
        .eq('user_id', authUser.id);

      if (updateError) {
        console.error('Error updating wallet balance:', updateError);
        return NextResponse.json(
          { error: 'Failed to update wallet balance' },
          { status: 500 }
        );
      }

      // Add ledger entry for signup bonus
      const { error: ledgerError } = await adminClient.from('ledger').insert({
        user_id: authUser.id,
        transaction_type: 'topup',
        amount: initialBalance,
        balance_after: initialBalance,
        reference_id: authUser.id,
        reference_type: 'signup_bonus',
        description: 'Tặng tiền đăng ký tài khoản mới',
        metadata: {
          type: 'signup_bonus',
          amount: initialBalance,
        },
      });

      if (ledgerError) {
        console.error(
          'Error creating ledger entry for signup bonus:',
          ledgerError
        );
        // Don't fail the request if ledger entry creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User initialized successfully',
      userId: authUser.id,
    });
  } catch (error) {
    console.error('Error in initialize-user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
