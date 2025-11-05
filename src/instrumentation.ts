/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the server starts (in production) or when
 * the dev server initializes. It's used to register PayOS webhook
 * automatically after deployment.
 *
 * Note: In serverless environments (Vercel), this may run on each
 * function cold start, but PayOSService.autoRegisterWebhook() is
 * idempotent and will only register once per process.
 */

export async function register() {
  try {
    // Import PayOS service dynamically
    const { payosService } = await import('@/lib/payos');

    // Use the auto-register method from PayOSService
    // This method handles all the logic internally (production check, idempotency, etc.)
    const registered = await payosService.autoRegisterWebhook();

    if (!registered) {
      console.warn(
        '⚠️ Webhook auto-registration failed, but webhooks may still work if already registered.'
      );
      console.warn(
        'You can verify webhook status by checking PayOS logs or testing a payment.'
      );
    }
  } catch (error) {
    // Log error but don't throw - webhook registration failure shouldn't crash the app
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      '❌ Failed to auto-register PayOS webhook in instrumentation:',
      errorMessage
    );
    console.warn(
      '⚠️ Note: Webhook registration failure does not prevent webhooks from working if already registered.'
    );
  }
}
