/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the server starts (in production) or when
 * the dev server initializes. It's used to register PayOS webhook
 * automatically after deployment.
 *
 * Note: In serverless environments (Vercel), this may run on each
 * function cold start, but PayOS webhook registration is idempotent.
 */

export async function register() {
  // Only run in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('Skipping webhook registration in development mode');
    return;
  }

  // Check if PayOS is configured
  const payosClientId = process.env.PAYOS_CLIENT_ID;
  const payosApiKey = process.env.PAYOS_API_KEY;
  const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!payosClientId || !payosApiKey || !payosChecksumKey) {
    console.warn(
      'PayOS credentials not configured, skipping webhook registration'
    );
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://game-match.net';
  const webhookUrl = `${baseUrl}/api/payos/webhook`;

  try {
    console.log('Attempting to auto-register PayOS webhook:', webhookUrl);

    // Import PayOS service dynamically
    const { payosService } = await import('@/lib/payos');

    if (!payosService.isAvailable()) {
      console.warn(
        'PayOS service not available, skipping webhook registration'
      );
      return;
    }

    await payosService.registerWebhook(webhookUrl);
    console.log('✅ PayOS webhook registered successfully:', webhookUrl);
  } catch (error) {
    // Log error but don't throw - webhook registration failure shouldn't crash the app
    console.error('❌ Failed to auto-register PayOS webhook:', error);
    console.error(
      'You may need to register webhook manually via POST /api/payos/webhook/register'
    );
  }
}
