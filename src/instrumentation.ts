/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the server starts (in production) or when
 * the dev server initializes. It's used to register PayOS webhook
 * automatically after deployment.
 *
 * Note: In serverless environments (Vercel), this may run on each
 * function cold start, but webhook registration is idempotent.
 */

// Track if webhook has been registered in this process
let webhookRegisteredInProcess = false;

export async function register() {
  // Only auto-register in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      'Skipping webhook auto-registration in non-production environment'
    );
    return;
  }

  // Idempotent: only register once per process
  if (webhookRegisteredInProcess) {
    return;
  }

  try {
    // Import PayOS service dynamically
    const { payosService } = await import('@/lib/payos');

    if (!payosService.isAvailable()) {
      console.warn(
        'PayOS service not available, skipping webhook registration'
      );
      return;
    }

    // Get webhook URL from environment
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || 'https://game-match.net';
    const webhookUrl = `${baseUrl}/api/payos/webhook`;

    console.log('Auto-registering PayOS webhook:', webhookUrl);

    // Use the registerWebhook method directly
    await payosService.registerWebhook(webhookUrl);

    webhookRegisteredInProcess = true;
    console.log('✅ PayOS webhook auto-registered successfully:', webhookUrl);
  } catch (error) {
    // Log error but don't throw - webhook registration failure shouldn't crash the app
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      '❌ Failed to auto-register PayOS webhook in instrumentation:',
      errorMessage
    );

    // Check if webhook might already be registered
    if (
      errorMessage.includes('already') ||
      errorMessage.includes('exists') ||
      errorMessage.includes('duplicate') ||
      errorMessage.includes('invalid')
    ) {
      console.warn(
        'ℹ️ Webhook may already be registered. PayOS will still send webhooks if already registered.'
      );
      webhookRegisteredInProcess = true; // Mark as registered to avoid retries
    } else {
      console.warn(
        '⚠️ Auto-registration failed, but webhooks may still work if already registered.'
      );
      console.warn(
        'You can register manually via POST /api/payos/webhook/register'
      );
    }
  }
}
