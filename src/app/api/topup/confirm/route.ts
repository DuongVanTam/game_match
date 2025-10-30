import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema
const topupConfirmSchema = z.object({
  txRef: z.string().min(1, 'Transaction reference is required'),
  paymentData: z
    .object({
      transactionId: z.string().optional(),
      paymentMethod: z.string().optional(),
      paidAt: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authClient = createApiAuthClient(request);

    // Get current user from auth
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = topupConfirmSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { txRef, paymentData } = validation.data;

    // Get the topup record
    // Use service role client for DB operations (bypass RLS) with enforced user checks
    const serviceClient = createServerClient();

    const { data: topup, error: topupError } = await serviceClient
      .from('topups')
      .select('*')
      .eq('tx_ref', txRef)
      .eq('user_id', user.id)
      .single();

    if (topupError || !topup) {
      return NextResponse.json(
        { error: 'Topup record not found' },
        { status: 404 }
      );
    }

    // Check if already confirmed
    if (topup.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Topup already confirmed' },
        { status: 400 }
      );
    }

    // Update wallet balance using the database function
    const { data: ledgerId, error: walletError } = await serviceClient.rpc(
      'update_wallet_balance',
      {
        p_user_id: user.id,
        p_amount: topup.amount,
        p_transaction_type: 'topup',
        p_description: `Nạp tiền qua ${topup.payment_method}`,
        p_reference_id: topup.id,
        p_reference_type: 'topup',
        p_metadata: {
          tx_ref: txRef,
          payment_method: topup.payment_method,
          ...paymentData,
        },
      }
    );

    if (walletError) {
      console.error('Error updating wallet balance:', walletError);
      return NextResponse.json(
        { error: 'Failed to update wallet balance' },
        { status: 500 }
      );
    }

    // Update topup status
    const { error: updateError } = await serviceClient
      .from('topups')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        payment_data: paymentData,
      })
      .eq('id', topup.id);

    if (updateError) {
      console.error('Error updating topup status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update topup status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Topup confirmed successfully',
      amount: topup.amount,
      ledgerId,
    });
  } catch (error) {
    console.error('Error confirming topup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
