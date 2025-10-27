import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';
import { z } from 'zod';

const updatePayoutSchema = z.object({
  status: z.enum([
    'pending',
    'approved',
    'processing',
    'completed',
    'rejected',
  ]),
  admin_notes: z.string().optional(),
  proof_tx: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = createServerClient();
    const { id: payoutId } = params;

    // Get current user and check if admin
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = updatePayoutSchema.parse(body);

    // Get current payout request
    const { data: currentRequest, error: fetchError } = await client
      .from('payout_requests')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { error: 'Payout request not found' },
        { status: 404 }
      );
    }

    // Update payout request
    const updateData: Record<string, unknown> = {
      status: validatedData.status,
      processed_by: user.id,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (validatedData.admin_notes !== undefined) {
      updateData.admin_notes = validatedData.admin_notes;
    }

    if (validatedData.proof_tx !== undefined) {
      updateData.proof_tx = validatedData.proof_tx;
    }

    const { data: updatedRequest, error: updateError } = await client
      .from('payout_requests')
      .update(updateData)
      .eq('id', payoutId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payout request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payout request' },
        { status: 500 }
      );
    }

    // If status changed to rejected, refund the amount to user's wallet
    if (
      validatedData.status === 'rejected' &&
      currentRequest.status !== 'rejected'
    ) {
      // Get user's current balance
      const { data: wallet, error: walletError } = await client
        .from('wallets')
        .select('balance')
        .eq('user_id', currentRequest.user_id)
        .single();

      if (walletError || !wallet) {
        console.error('Error fetching user wallet:', walletError);
        return NextResponse.json(
          { error: 'Failed to fetch user wallet' },
          { status: 500 }
        );
      }

      // Refund amount to user's wallet
      const { error: refundError } = await client
        .from('wallets')
        .update({
          balance: wallet.balance + currentRequest.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', currentRequest.user_id);

      if (refundError) {
        console.error('Error refunding amount:', refundError);
        return NextResponse.json(
          { error: 'Failed to refund amount' },
          { status: 500 }
        );
      }

      // Add ledger entry for refund
      const { error: ledgerError } = await client.from('ledger').insert({
        user_id: currentRequest.user_id,
        transaction_type: 'withdraw',
        amount: currentRequest.amount, // Positive amount for refund
        balance_after: wallet.balance + currentRequest.amount,
        reference_id: payoutId,
        reference_type: 'payout_request',
        description: `Hoàn tiền từ yêu cầu rút tiền bị từ chối`,
        metadata: {
          payout_request_id: payoutId,
          original_amount: currentRequest.amount,
          admin_notes: validatedData.admin_notes,
          processed_by: user.id,
        },
      });

      if (ledgerError) {
        console.error('Error creating refund ledger entry:', ledgerError);
        return NextResponse.json(
          { error: 'Failed to record refund transaction' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: 'Payout request updated successfully',
      payoutRequest: updatedRequest,
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/payouts/[id]:', error);

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
