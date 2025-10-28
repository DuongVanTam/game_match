import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { payosService } from '@/lib/payos';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-payos-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    if (!payosService.verifyWebhookData(body)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const { orderCode, status, description } = body;

    // Only process successful payments
    if (status !== 'PAID') {
      return NextResponse.json({
        success: true,
        message: 'Payment not completed',
      });
    }

    const client = createServerClient();

    // Find the topup record by orderCode (we'll need to store this mapping)
    // For now, we'll extract tx_ref from description
    const txRefMatch = description.match(/TFT_\d+_[a-zA-Z0-9]+/);
    if (!txRefMatch) {
      return NextResponse.json(
        { error: 'Invalid transaction reference' },
        { status: 400 }
      );
    }

    const txRef = txRefMatch[0];

    // Get the topup record
    const { data: topup, error: topupError } = await client
      .from('topups')
      .select('*')
      .eq('tx_ref', txRef)
      .single();

    if (topupError || !topup) {
      return NextResponse.json(
        { error: 'Topup record not found' },
        { status: 404 }
      );
    }

    // Check if already confirmed
    if (topup.status === 'confirmed') {
      return NextResponse.json({ success: true, message: 'Already confirmed' });
    }

    // Update wallet balance
    const { data: ledgerId, error: walletError } = await client.rpc(
      'update_wallet_balance',
      {
        p_user_id: topup.user_id,
        p_amount: topup.amount,
        p_transaction_type: 'topup',
        p_description: `Nạp tiền qua PayOS - ${txRef}`,
        p_reference_id: topup.id,
        p_reference_type: 'topup',
        p_metadata: {
          tx_ref: txRef,
          payment_method: 'payos',
          order_code: orderCode,
          payos_status: status,
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
    const { error: updateError } = await client
      .from('topups')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        payment_data: {
          order_code: orderCode,
          payos_status: status,
          webhook_data: body,
        },
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
      message: 'Payment confirmed successfully',
      ledgerId,
    });
  } catch (error) {
    console.error('Error processing PayOS webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
