import { NextRequest } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';
import { broadcastManager } from '@/lib/broadcast';

/**
 * SSE Endpoint for real-time topup status updates
 * GET /api/topup/stream?tx_ref=TFT_...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const txRef = searchParams.get('tx_ref');

  if (!txRef) {
    return new Response('Missing tx_ref parameter', { status: 400 });
  }

  // Validate tx_ref format
  if (!/^TFT_\d+_[a-zA-Z0-9]+$/.test(txRef)) {
    return new Response('Invalid tx_ref format', { status: 400 });
  }

  // Authenticate user
  const authClient = createApiAuthClient(request);
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verify user owns this tx_ref
  const serviceClient = createServerClient();
  const { data: topup, error: topupError } = await serviceClient
    .from('topups')
    .select('user_id')
    .eq('tx_ref', txRef)
    .single();

  if (topupError || !topup) {
    return new Response('Topup not found', { status: 404 });
  }

  if (topup.user_id !== user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `event: connected\ndata: ${JSON.stringify({ tx_ref: txRef })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialMessage));

      // Create connection object
      const connection = {
        controller,
        userId: user.id,
        txRef,
        connectedAt: Date.now(),
      };

      // Subscribe to events for this tx_ref
      broadcastManager.subscribe(txRef, connection);

      const connectionCount = broadcastManager.getConnectionCount(txRef);
      console.log(
        `SSE connection established for tx_ref: ${txRef}, user: ${user.id}, total connections: ${connectionCount}`
      );

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(
          `SSE connection closed for tx_ref: ${txRef}, user: ${user.id}`
        );
        broadcastManager.unsubscribe(txRef, connection);
        try {
          controller.close();
        } catch {
          // Connection already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
    },
  });
}
