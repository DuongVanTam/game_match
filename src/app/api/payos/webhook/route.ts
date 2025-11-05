import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { payosService } from '@/lib/payos';
import { broadcastManager } from '@/lib/broadcast';

export async function POST(request: NextRequest) {
  // Log webhook received
  // NOTE: If you see "Webhook verified successfully" but auto-registration failed,
  // it means the webhook was already registered previously (from manual registration
  // or a previous deployment). PayOS will continue sending webhooks even if
  // re-registration fails.
  console.log('=== PAYOS WEBHOOK RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Headers:', {
    'x-payos-signature': request.headers.get('x-payos-signature'),
    'content-type': request.headers.get('content-type'),
    'user-agent': request.headers.get('user-agent'),
  });

  try {
    // Get raw body for webhook verification
    const rawBody = await request.text();
    console.log('Raw body length:', rawBody.length);
    console.log('Raw body preview:', rawBody.substring(0, 200));

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Verify webhook data using PayOS SDK
    let verifiedData;
    try {
      verifiedData = payosService.verifyWebhookData(body);
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return NextResponse.json(
        {
          error: 'Invalid webhook data',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    // Extract data from verified webhook
    // PayOS SDK verify returns WebhookData directly: { orderCode, amount, description, code, ... }
    const webhookData = verifiedData;

    // Extract orderCode and status from verified webhook data
    const orderCode = webhookData.orderCode;
    const status = webhookData.code; // PayOS uses 'code' field for status (e.g., 'PAID', 'CANCELLED')
    const description = webhookData.description || '';

    console.log('Webhook verified successfully:', {
      orderCode,
      status,
      description,
      amount: webhookData.amount,
    });

    const client = createServerClient();

    // Find topup by orderCode (primary method) or fallback to description parsing
    let topup;
    let topupError;

    // Try to find by orderCode first (more reliable)
    if (orderCode) {
      const result = await client
        .from('topups')
        .select('*')
        .eq('order_code', orderCode)
        .single();
      topup = result.data;
      topupError = result.error;
    }

    // Fallback: extract tx_ref from description if orderCode match failed
    if ((topupError || !topup) && description) {
      const txRefMatch =
        typeof description === 'string'
          ? description.match(/TFT_\d+_[a-zA-Z0-9]+/)
          : null;
      const txRef = txRefMatch ? txRefMatch[0] : null;

      if (txRef) {
        const result = await client
          .from('topups')
          .select('*')
          .eq('tx_ref', txRef)
          .single();
        topup = result.data;
        topupError = result.error;
      }
    }

    // Handle non-success statuses: mark failed/canceled/expired if provided
    if (status !== 'PAID') {
      if (topup && topup.status !== 'confirmed') {
        const failingStatuses = ['CANCELED', 'CANCELLED', 'EXPIRED', 'FAILED'];
        if (failingStatuses.includes(String(status).toUpperCase())) {
          await client
            .from('topups')
            .update({
              status: 'failed',
              payment_data: { webhook_data: verifiedData } as never,
            })
            .eq('id', topup.id);

          // Broadcast failure event via SSE
          broadcastManager.broadcast(topup.tx_ref, {
            type: 'status-update',
            data: {
              tx_ref: topup.tx_ref,
              status: 'failed',
              amount: topup.amount,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment not completed',
      });
    }

    // Get the topup record (already fetched above for PAID status)

    if (topupError || !topup) {
      console.error('Topup not found:', { orderCode, description, topupError });
      return NextResponse.json(
        { error: 'Topup record not found' },
        { status: 404 }
      );
    }

    // Check if already confirmed
    if (topup.status === 'confirmed') {
      // Still broadcast event in case client is waiting
      console.log(
        'Topup already confirmed, broadcasting event for tx_ref:',
        topup.tx_ref
      );
      const alreadyConfirmedCount = broadcastManager.getConnectionCount(
        topup.tx_ref
      );
      console.log(
        'Active SSE connections for already-confirmed tx_ref:',
        topup.tx_ref,
        '=',
        alreadyConfirmedCount
      );

      broadcastManager.broadcast(topup.tx_ref, {
        type: 'status-update',
        data: {
          tx_ref: topup.tx_ref,
          status: 'confirmed',
          amount: topup.amount,
          confirmed_at: topup.confirmed_at || new Date().toISOString(),
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Already confirmed',
        connectionCount: alreadyConfirmedCount,
      });
    }

    // Update wallet balance
    const { data: ledgerId, error: walletError } = await client.rpc(
      'update_wallet_balance',
      {
        p_user_id: topup.user_id,
        p_amount: topup.amount,
        p_transaction_type: 'topup',
        p_description: `Nạp tiền qua PayOS - ${topup.tx_ref}`,
        p_reference_id: topup.id,
        p_reference_type: 'topup',
        p_metadata: {
          tx_ref: topup.tx_ref,
          payment_method: 'payos',
          order_code: orderCode,
          payos_status: status,
        },
      }
    );

    if (walletError) {
      console.error('Error updating wallet balance:', walletError);
      // Broadcast error event
      broadcastManager.broadcast(topup.tx_ref, {
        type: 'error',
        data: {
          tx_ref: topup.tx_ref,
          error: 'Failed to update wallet balance',
        },
      });
      return NextResponse.json(
        { error: 'Failed to update wallet balance' },
        { status: 500 }
      );
    }

    const confirmedAt = new Date().toISOString();

    // Update topup status
    const { error: updateError } = await client
      .from('topups')
      .update({
        status: 'confirmed',
        confirmed_at: confirmedAt,
        payment_data: {
          order_code: orderCode,
          payos_status: status,
          webhook_data: verifiedData,
        } as never,
      })
      .eq('id', topup.id);

    if (updateError) {
      console.error('Error updating topup status:', updateError);
      // Broadcast error event
      broadcastManager.broadcast(topup.tx_ref, {
        type: 'error',
        data: {
          tx_ref: topup.tx_ref,
          error: 'Failed to update topup status',
        },
      });
      return NextResponse.json(
        { error: 'Failed to update topup status' },
        { status: 500 }
      );
    }

    // Broadcast success event via SSE
    console.log('Broadcasting SSE event for tx_ref:', topup.tx_ref, {
      status: 'confirmed',
      amount: topup.amount,
      confirmed_at: confirmedAt,
    });

    const connectionCount = broadcastManager.getConnectionCount(topup.tx_ref);
    console.log(
      'Active SSE connections for tx_ref:',
      topup.tx_ref,
      '=',
      connectionCount
    );

    broadcastManager.broadcast(topup.tx_ref, {
      type: 'status-update',
      data: {
        tx_ref: topup.tx_ref,
        status: 'confirmed',
        amount: topup.amount,
        confirmed_at: confirmedAt,
      },
    });

    console.log('=== WEBHOOK PROCESSING COMPLETED ===');
    console.log('Result:', {
      success: true,
      tx_ref: topup.tx_ref,
      connectionCount,
      ledgerId,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully',
      ledgerId,
      connectionCount,
    });
  } catch (error) {
    console.error('=== WEBHOOK PROCESSING ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
