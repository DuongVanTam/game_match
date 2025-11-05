import { NextRequest, NextResponse } from 'next/server';
import { payosService } from '@/lib/payos';
import { createServerClient } from '@/lib/supabase-server';

/**
 * Test endpoint to manually trigger webhook processing
 * POST /api/payos/webhook/test
 * Body: { orderCode: number, status: string, ... }
 *
 * This endpoint simulates a PayOS webhook for testing purposes
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const rawBody = await request.text();
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

    // Extract orderCode
    const orderCode = verifiedData.orderCode;
    const status = verifiedData.code;

    const client = createServerClient();

    // Find topup by orderCode
    const { data: topup, error: topupError } = await client
      .from('topups')
      .select('*')
      .eq('order_code', orderCode)
      .single();

    if (topupError || !topup) {
      return NextResponse.json(
        {
          error: 'Topup not found',
          orderCode,
          suggestion: 'Make sure orderCode matches a topup record',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook test successful',
      topup: {
        id: topup.id,
        tx_ref: topup.tx_ref,
        status: topup.status,
        amount: topup.amount,
        user_id: topup.user_id,
      },
      webhook: {
        orderCode,
        status,
        verifiedData,
      },
    });
  } catch (error) {
    console.error('Error in webhook test:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check webhook configuration
 * GET /api/payos/webhook/test
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://game-match.net';
  const webhookUrl = `${baseUrl}/api/payos/webhook`;

  return NextResponse.json({
    webhookUrl,
    message: 'Configure this URL in PayOS dashboard',
    instructions: [
      '1. Go to PayOS Dashboard',
      '2. Navigate to Webhook Settings',
      '3. Set webhook URL to: ' + webhookUrl,
      '4. Or use POST /api/payos/webhook/register to register programmatically',
    ],
    currentConfig: {
      payosConfigured: payosService.isAvailable(),
      webhookUrl,
    },
  });
}
