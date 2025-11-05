import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient } from '@/lib/supabase-server';
import { payosService } from '@/lib/payos';
import { z } from 'zod';

// Validation schema
const registerWebhookSchema = z.object({
  webhookUrl: z.string().url('Invalid webhook URL'),
});

/**
 * Register webhook URL with PayOS
 * POST /api/payos/webhook/register
 * Body: { webhookUrl: string }
 *
 * Note: This endpoint should be protected and only accessible by admins
 * For now, we'll allow authenticated users to register webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authClient = createApiAuthClient(request);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check here
    // const userProfile = await getUserProfile(user.id);
    // if (userProfile.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Parse and validate request body
    const body = await request.json();
    const validation = registerWebhookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { webhookUrl } = validation.data;

    // Check if PayOS is available
    if (!payosService.isAvailable()) {
      return NextResponse.json(
        { error: 'PayOS service is not configured' },
        { status: 500 }
      );
    }

    // Register webhook with PayOS
    try {
      console.log('Registering webhook URL with PayOS:', webhookUrl);
      await payosService.registerWebhook(webhookUrl);
      console.log('Webhook registered successfully');

      return NextResponse.json({
        success: true,
        message: 'Webhook registered successfully',
        webhookUrl,
        note: 'PayOS will send webhook events to this URL when payment status changes',
      });
    } catch (error) {
      console.error('Error registering webhook:', error);
      return NextResponse.json(
        {
          error: 'Failed to register webhook',
          details: error instanceof Error ? error.message : 'Unknown error',
          suggestion:
            'You may need to register the webhook URL manually in PayOS dashboard',
          webhookUrl,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in webhook registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get current webhook URL (if PayOS API supports it)
 * GET /api/payos/webhook/register
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authClient = createApiAuthClient(request);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if PayOS is available
    if (!payosService.isAvailable()) {
      return NextResponse.json(
        { error: 'PayOS service is not configured' },
        { status: 500 }
      );
    }

    // PayOS SDK might not have a method to get current webhook URL
    // Return the expected webhook URL based on environment
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || 'https://game-match.net';
    const webhookUrl = `${baseUrl}/api/payos/webhook`;

    return NextResponse.json({
      webhookUrl,
      message: 'Current webhook URL (configured in PayOS dashboard)',
    });
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
