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

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return null;
}

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

  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    console.warn(
      '⚠️ Unable to determine base URL for PayOS webhook registration. ' +
        'Set NEXT_PUBLIC_BASE_URL or VERCEL_PROJECT_PRODUCTION_URL.'
    );
    return;
  }

  const registerUrl = `${baseUrl}/api/payos/webhook/register`;

  try {
    console.log('Auto-registering PayOS webhook via API:', registerUrl);

    const response = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Webhook registration API responded with ${response.status}: ${text}`
      );
    }

    webhookRegisteredInProcess = true;
    console.log('✅ PayOS webhook auto-registration API call succeeded');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      '❌ Failed to auto-register PayOS webhook via API:',
      errorMessage
    );
    console.warn(
      'You can register manually via POST /api/payos/webhook/register'
    );
  }
}
