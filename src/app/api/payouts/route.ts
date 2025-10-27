import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';
import { z } from 'zod';

const createPayoutSchema = z.object({
  amount: z
    .number()
    .min(10000, 'Số tiền tối thiểu là 10,000 VND')
    .max(10000000, 'Số tiền tối đa là 10,000,000 VND'),
  paymentMethod: z.enum(['momo', 'bank_transfer', 'vietqr']),
  accountNumber: z.string().min(1, 'Vui lòng nhập số tài khoản'),
  accountName: z.string().min(1, 'Vui lòng nhập tên chủ tài khoản'),
  bankName: z.string().optional(),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const client = createServerClient();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = createPayoutSchema.parse(body);

    // Check user's current balance
    const { data: wallet, error: walletError } = await client
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (wallet.balance < validatedData.amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Check for pending withdrawal requests (prevent multiple requests)
    const { data: pendingRequests, error: pendingError } = await client
      .from('payout_requests')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved', 'processing']);

    if (pendingError) {
      console.error('Error checking pending requests:', pendingError);
      return NextResponse.json(
        { error: 'Failed to check pending requests' },
        { status: 500 }
      );
    }

    if (pendingRequests && pendingRequests.length > 0) {
      return NextResponse.json(
        { error: 'You already have a pending withdrawal request' },
        { status: 400 }
      );
    }

    // Create payout request
    const payoutData = {
      user_id: user.id,
      amount: validatedData.amount,
      status: 'pending' as const,
      payment_method: validatedData.paymentMethod,
      payment_details: {
        accountNumber: validatedData.accountNumber,
        accountName: validatedData.accountName,
        bankName: validatedData.bankName,
        note: validatedData.note,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: payoutRequest, error: payoutError } = await client
      .from('payout_requests')
      .insert(payoutData)
      .select()
      .single();

    if (payoutError) {
      console.error('Error creating payout request:', payoutError);
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      );
    }

    // Deduct amount from user's wallet
    const { error: walletUpdateError } = await client
      .from('wallets')
      .update({
        balance: wallet.balance - validatedData.amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (walletUpdateError) {
      console.error('Error updating wallet:', walletUpdateError);
      return NextResponse.json(
        { error: 'Failed to update wallet balance' },
        { status: 500 }
      );
    }

    // Add ledger entry for withdrawal
    const { error: ledgerError } = await client.from('ledger').insert({
      user_id: user.id,
      transaction_type: 'withdraw',
      amount: -validatedData.amount, // Negative amount for withdrawal
      balance_after: wallet.balance - validatedData.amount,
      reference_id: payoutRequest.id,
      reference_type: 'payout_request',
      description: `Yêu cầu rút tiền - ${validatedData.paymentMethod}`,
      metadata: {
        payout_request_id: payoutRequest.id,
        payment_method: validatedData.paymentMethod,
        account_number: validatedData.accountNumber,
        account_name: validatedData.accountName,
        bank_name: validatedData.bankName,
        note: validatedData.note,
      },
    });

    if (ledgerError) {
      console.error('Error creating ledger entry:', ledgerError);
      return NextResponse.json(
        { error: 'Failed to record transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Payout request created successfully',
      payoutRequest,
    });
  } catch (error) {
    console.error('Error in POST /api/payouts:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = createServerClient();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's payout requests
    const { data: payoutRequests, error } = await client
      .from('payout_requests')
      .select('*')
      .eq('user_id', user.id)
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
    console.error('Error in GET /api/payouts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
