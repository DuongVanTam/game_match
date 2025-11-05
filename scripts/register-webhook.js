/**
 * Script to register PayOS webhook URL
 * 
 * Usage:
 *   node scripts/register-webhook.js
 * 
 * Or with custom URL:
 *   WEBHOOK_URL=https://your-domain.com/api/payos/webhook node scripts/register-webhook.js
 */

require('dotenv').config({ path: '.env.local' });

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://game-match.net';
const webhookUrl = process.env.WEBHOOK_URL || `${baseUrl}/api/payos/webhook`;

console.log('🔗 PayOS Webhook Registration Script');
console.log('=====================================\n');
console.log('Webhook URL:', webhookUrl);
console.log('\n⚠️  IMPORTANT: PayOS does NOT have webhook settings in Dashboard!');
console.log('You MUST register webhook via API/SDK.\n');

// Check if PayOS is configured
const payosClientId = process.env.PAYOS_CLIENT_ID;
const payosApiKey = process.env.PAYOS_API_KEY;
const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY;

if (!payosClientId || !payosApiKey || !payosChecksumKey) {
  console.error('❌ Error: PayOS environment variables not configured!');
  console.error('Required: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY');
  process.exit(1);
}

console.log('✅ PayOS credentials found');
console.log('\nTo register webhook, use one of these methods:\n');

console.log('Method 1: Use API endpoint (after deploying):');
console.log('---------------------------------------------');
console.log(`curl -X POST ${baseUrl}/api/payos/webhook/register \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Cookie: your-auth-cookie" \\`);
console.log(`  -d '{"webhookUrl": "${webhookUrl}"}'`);
console.log('');

console.log('Method 2: Use PayOS SDK directly:');
console.log('----------------------------------');
console.log('const { PayOS } = require("@payos/node");');
console.log('const payOS = new PayOS(');
console.log('  process.env.PAYOS_CLIENT_ID,');
console.log('  process.env.PAYOS_API_KEY,');
console.log('  process.env.PAYOS_CHECKSUM_KEY');
console.log(');');
console.log(`await payOS.webhooks.confirm("${webhookUrl}");`);
console.log('');

console.log('Method 3: Use browser console (after login):');
console.log('---------------------------------------------');
console.log(`fetch('${baseUrl}/api/payos/webhook/register', {`);
console.log("  method: 'POST',");
console.log("  headers: { 'Content-Type': 'application/json' },");
console.log("  credentials: 'include',");
console.log(`  body: JSON.stringify({ webhookUrl: '${webhookUrl}' })`);
console.log('})');
console.log('.then(r => r.json())');
console.log('.then(console.log)');
console.log('');

console.log('📚 Documentation:');
console.log('  - PayOS API: https://payos.vn/docs/api/');
console.log('  - PayOS Node.js SDK: https://payos.vn/docs/sdks/back-end/node');
console.log('');

