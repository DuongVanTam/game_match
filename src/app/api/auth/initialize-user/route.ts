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

    // If user already exists, return success
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already initialized',
        userId: existingUser.id,
      });
    }

    // Create new user record
    const { error: insertUserError } = await adminClient.from('users').insert({
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

    // Create wallet for the new user
    const { error: walletError } = await adminClient.from('wallets').insert({
      user_id: authUser.id,
      balance: 20000,
    });

    if (walletError) {
      console.error('Error creating wallet:', walletError);
      // Don't fail the request if wallet creation fails
      // The wallet can be created later
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
