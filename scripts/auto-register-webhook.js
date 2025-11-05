/**
 * Script to automatically register PayOS webhook after deployment
 * 
 * This script can be run:
 * 1. After deployment (via Vercel post-deploy hook)
 * 2. Manually: node scripts/auto-register-webhook.js
 * 
 * Usage:
 *   node scripts/auto-register-webhook.js
 * 
 * Or with custom URL:
 *   WEBHOOK_URL=https://your-domain.com/api/payos/webhook node scripts/auto-register-webhook.js
 */

require('dotenv').config({ path: '.env.local' });

const { PayOS } = require('@payos/node');

async function registerWebhook() {
  console.log('🔗 PayOS Webhook Auto-Registration Script');
  console.log('==========================================\n');

  // Check environment variables
  const payosClientId = process.env.PAYOS_CLIENT_ID;
  const payosApiKey = process.env.PAYOS_API_KEY;
  const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://game-match.net';
  const webhookUrl = process.env.WEBHOOK_URL || `${baseUrl}/api/payos/webhook`;

  if (!payosClientId || !payosApiKey || !payosChecksumKey) {
    console.error('❌ Error: PayOS environment variables not configured!');
    console.error('Required: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY');
    process.exit(1);
  }

  console.log('✅ PayOS credentials found');
  console.log('Webhook URL:', webhookUrl);
  console.log('');

  try {
    // Initialize PayOS client
    const payOS = new PayOS(payosClientId, payosApiKey, payosChecksumKey);

    console.log('Registering webhook with PayOS...');
    
    // Register webhook
    await payOS.webhooks.confirm(webhookUrl);
    
    console.log('✅ Webhook registered successfully!');
    console.log('Webhook URL:', webhookUrl);
    console.log('');
    console.log('PayOS will now send webhook events to this URL when payment status changes.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to register webhook:', error);
    console.error('');
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Check for common errors
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('→ Check your PayOS credentials (CLIENT_ID, API_KEY, CHECKSUM_KEY)');
      } else if (error.message.includes('404')) {
        console.error('→ Check if the webhook URL is correct and accessible');
      } else if (error.message.includes('timeout')) {
        console.error('→ Network timeout. Check your internet connection.');
      }
    }
    
    console.error('');
    console.error('You can try registering manually via:');
    console.error(`  POST ${baseUrl}/api/payos/webhook/register`);
    console.error(`  Body: { "webhookUrl": "${webhookUrl}" }`);
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  registerWebhook();
}

module.exports = { registerWebhook };

