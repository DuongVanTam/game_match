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
    await payosService.autoRegisterWebhook();
  } catch (error) {
    // Log error but don't throw - webhook registration failure shouldn't crash the app
    console.error(
      '❌ Failed to auto-register PayOS webhook in instrumentation:',
      error
    );
  }
}
