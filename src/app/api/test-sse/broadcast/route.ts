import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient } from '@/lib/supabase-server';
import { broadcastManager } from '@/lib/broadcast';

/**
 * Test endpoint để simulate broadcast events cho SSE testing
 * POST /api/test-sse/broadcast
 * Body: { tx_ref: string, event_type: 'status-update' | 'error' | 'heartbeat', data: {...} }
 */
export async function POST(request: NextRequest) {
  // Chỉ cho phép trong development hoặc với admin role
  if (process.env.NODE_ENV === 'production') {
    // In production, require admin role
    const authClient = createApiAuthClient(request);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role (you may need to adjust this based on your auth setup)
    // For now, we'll allow in development only
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { tx_ref, event_type, data } = body;

    if (!tx_ref) {
      return NextResponse.json(
        { error: 'Missing tx_ref parameter' },
        { status: 400 }
      );
    }

    if (
      !event_type ||
      !['status-update', 'error', 'heartbeat'].includes(event_type)
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid event_type. Must be: status-update, error, or heartbeat',
        },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Missing data parameter' },
        { status: 400 }
      );
    }

    // Broadcast the event
    broadcastManager.broadcast(tx_ref, {
      type: event_type as 'status-update' | 'error' | 'heartbeat',
      data: {
        tx_ref,
        ...data,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Broadcasted ${event_type} event for tx_ref: ${tx_ref}`,
      event: {
        type: event_type,
        data: {
          tx_ref,
          ...data,
        },
      },
    });
  } catch (error) {
    console.error('Error in test broadcast endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
