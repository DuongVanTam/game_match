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
      verifiedData = await payosService.verifyWebhookData(body);
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
    const dataCode = verifiedData.code; // This is "00" for success
    const status = dataCode === '00' ? 'PAID' : dataCode || 'UNKNOWN';

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
    message: '⚠️ IMPORTANT: PayOS does NOT have webhook settings in Dashboard!',
    instructions: [
      'PayOS does NOT provide webhook configuration in Dashboard.',
      'You MUST register webhook via API/SDK only.',
      '',
      'To register webhook, use one of these methods:',
      '',
      'Method 1: Use API endpoint (recommended):',
      `  POST /api/payos/webhook/register`,
      `  Body: { "webhookUrl": "${webhookUrl}" }`,
      '',
      'Method 2: Use PayOS SDK directly:',
      '  const payOS = new PayOS(clientId, apiKey, checksumKey);',
      `  await payOS.webhooks.confirm("${webhookUrl}");`,
      '',
      'Method 3: Use browser console (after login):',
      `  fetch('/api/payos/webhook/register', {`,
      "    method: 'POST',",
      "    headers: { 'Content-Type': 'application/json' },",
      "    credentials: 'include',",
      `    body: JSON.stringify({ webhookUrl: '${webhookUrl}' })`,
      '  }).then(r => r.json()).then(console.log)',
    ],
    currentConfig: {
      payosConfigured: payosService.isAvailable(),
      webhookUrl,
    },
    documentation: {
      payosApi: 'https://payos.vn/docs/api/',
      payosNodeSdk: 'https://payos.vn/docs/sdks/back-end/node',
    },
  });
}
