/**
 * Script để test SSE endpoint
 * Usage: node scripts/test-sse.js <tx_ref> [cookie_header]
 * 
 * Example:
 *   node scripts/test-sse.js TFT_123_abc123 "sb-xxx-auth-token=eyJhbGc..."
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const txRef = process.argv[2];
const cookieHeader = process.argv[3] || '';

if (!txRef) {
  console.error('Usage: node scripts/test-sse.js <tx_ref> [cookie_header]');
  console.error('Example: node scripts/test-sse.js TFT_123_abc123 "sb-xxx-auth-token=..."');
  process.exit(1);
}

// Validate tx_ref format
if (!/^TFT_\d+_[a-zA-Z0-9]+$/.test(txRef)) {
  console.error('Error: Invalid tx_ref format. Expected: TFT_[timestamp]_[random]');
  process.exit(1);
}

const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
const url = new URL(`${baseUrl}/api/topup/stream?tx_ref=${encodeURIComponent(txRef)}`);

const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    ...(cookieHeader && { 'Cookie': cookieHeader }),
  },
};

console.log(`\n🔌 Connecting to SSE endpoint...`);
console.log(`URL: ${url.toString()}`);
console.log(`tx_ref: ${txRef}`);
console.log(`\n📡 Listening for events...\n`);

const client = url.protocol === 'https:' ? https : http;

const req = client.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log(`\n--- Events ---\n`);

  if (res.statusCode !== 200) {
    res.on('data', (chunk) => {
      console.error(chunk.toString());
    });
    res.on('end', () => {
      console.log('\n❌ Connection failed. Make sure:');
      console.log('  1. You are authenticated (provide cookie header)');
      console.log('  2. tx_ref exists and you own it');
      console.log('  3. Server is running');
      process.exit(1);
    });
    return;
  }

  let buffer = '';
  let eventCount = 0;
  const startTime = Date.now();

  res.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    let event = null;
    let data = null;

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        event = line.substring(7).trim();
      } else if (line.startsWith('data: ')) {
        try {
          data = JSON.parse(line.substring(6).trim());
        } catch (e) {
          data = line.substring(6).trim();
        }
      } else if (line === '') {
        // Empty line indicates end of event
        if (event && data !== null) {
          eventCount++;
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[${timestamp}] Event: ${event}`);
          console.log(`Data:`, JSON.stringify(data, null, 2));
          console.log('');
        }
        event = null;
        data = null;
      }
    }
  });

  res.on('end', () => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Connection closed`);
    console.log(`Total events received: ${eventCount}`);
    console.log(`Duration: ${duration}s`);
  });

  // Auto-close after 60 seconds for testing
  setTimeout(() => {
    console.log('\n⏱️  Test timeout (60s). Closing connection...');
    req.destroy();
    process.exit(0);
  }, 60000);
});

req.on('error', (error) => {
  console.error(`\n❌ Request error:`, error.message);
  console.error('Make sure the server is running and accessible.');
  process.exit(1);
});

req.end();

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Interrupted by user. Closing connection...');
  req.destroy();
  process.exit(0);
});

