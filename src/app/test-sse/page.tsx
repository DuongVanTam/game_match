'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Radio, XCircle } from 'lucide-react';

interface EventLog {
  timestamp: string;
  type: string;
  data: unknown;
}

export default function TestSSEPage() {
  const [txRef, setTxRef] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = () => {
    if (!txRef.trim()) {
      setError('Vui lòng nhập tx_ref');
      return;
    }

    // Validate tx_ref format
    if (!/^TFT_\d+_[a-zA-Z0-9]+$/.test(txRef.trim())) {
      setError('tx_ref không đúng format (ví dụ: TFT_123_abc123)');
      return;
    }

    // Disconnect existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setError(null);
    setEvents([]);
    setIsConnected(false);

    try {
      const url = `/api/topup/stream?tx_ref=${encodeURIComponent(txRef.trim())}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        addEvent('connection', 'Connected', { status: 'open' });
      };

      eventSource.addEventListener('connected', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          addEvent('connected', 'Connection confirmed', data);
        } catch (err) {
          addEvent('connected', 'Connection confirmed', { raw: event.data });
        }
      });

      eventSource.addEventListener('status-update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          addEvent('status-update', 'Status Update', data);
        } catch (err) {
          addEvent('status-update', 'Status Update', { raw: event.data });
        }
      });

      eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          addEvent('error', 'Error Event', data);
        } catch (err) {
          addEvent('error', 'Error Event', { raw: event.data });
        }
      });

      eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          addEvent('heartbeat', 'Heartbeat', data);
        } catch (err) {
          addEvent('heartbeat', 'Heartbeat', { raw: event.data });
        }
      });

      eventSource.onerror = (err) => {
        setIsConnected(false);
        const errorMsg =
          'Connection error. Check: 1) Are you logged in? 2) Does tx_ref exist? 3) Do you own this tx_ref?';
        setError(errorMsg);
        addEvent('error', 'Connection Error', {
          readyState: eventSource.readyState,
          error: err,
        });

        // Check readyState
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          eventSourceRef.current = null;
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to create EventSource';
      setError(errorMsg);
      addEvent('error', 'Initialization Error', { error: errorMsg });
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      addEvent('connection', 'Disconnected', {});
    }
  };

  const addEvent = (type: string, label: string, data: unknown) => {
    const event: EventLog = {
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      type: label,
      data,
    };
    setEvents((prev) => [...prev, event]);
  };

  const testBroadcast = async () => {
    if (!txRef.trim()) {
      setError('Vui lòng nhập tx_ref');
      return;
    }

    try {
      const res = await fetch('/api/test-sse/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: txRef.trim(),
          event_type: 'status-update',
          data: {
            tx_ref: txRef.trim(),
            status: 'confirmed',
            amount: 100000,
            confirmed_at: new Date().toISOString(),
          },
        }),
      });

      const result = await res.json();
      if (res.ok) {
        addEvent('test', 'Test Broadcast Sent', result);
      } else {
        setError(result.error || 'Failed to send test broadcast');
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to send test broadcast';
      setError(errorMsg);
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">SSE Connection Tester</h1>
          <p className="text-muted-foreground">
            Test Server-Sent Events (SSE) connection cho topup status updates
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="tx_ref">Transaction Reference (tx_ref)</Label>
              <Input
                id="tx_ref"
                placeholder="TFT_123_abc123"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                disabled={isConnected}
              />
              <p className="text-xs text-muted-foreground">
                Format: TFT_[timestamp]_[random]
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={connect}
                disabled={isConnected}
                className="gap-2"
              >
                <Radio className="h-4 w-4" />
                Connect SSE
              </Button>
              <Button
                onClick={disconnect}
                disabled={!isConnected}
                variant="destructive"
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Disconnect
              </Button>
              <Button
                onClick={testBroadcast}
                disabled={!isConnected || !txRef.trim()}
                variant="outline"
              >
                Test Broadcast
              </Button>
              <Button onClick={clearEvents} variant="outline">
                Clear Events
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Log</CardTitle>
            <p className="text-sm text-muted-foreground">
              {events.length} events received
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No events yet. Connect to start receiving events.
                </p>
              ) : (
                events.map((event, index) => (
                  <div
                    key={index}
                    className="border rounded p-3 bg-gray-50 text-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      <span className="font-semibold">{event.type}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {event.timestamp}
                      </span>
                    </div>
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Hướng dẫn Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Đăng nhập vào hệ thống (bạn phải authenticated để connect SSE)
              </li>
              <li>
                Tạo một topup transaction từ trang{' '}
                <code className="bg-gray-100 px-1 rounded">/wallet/topup</code>
              </li>
              <li>
                Copy <code className="bg-gray-100 px-1 rounded">tx_ref</code> từ
                transaction đó
              </li>
              <li>
                Paste vào field ở trên và click{' '}
                <strong>&quot;Connect SSE&quot;</strong>
              </li>
              <li>
                Nếu connection thành công, bạn sẽ thấy event{' '}
                <code className="bg-gray-100 px-1 rounded">connected</code>
              </li>
              <li>
                Click <strong>&quot;Test Broadcast&quot;</strong> để simulate
                một status update event
              </li>
              <li>Kiểm tra xem event có được nhận không trong Event Log</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-semibold text-yellow-800 mb-1">
                Lưu ý quan trọng:
              </p>
              <ul className="list-disc list-inside text-yellow-700 space-y-1">
                <li>
                  SSE endpoint yêu cầu authentication (cookies phải có session)
                </li>
                <li>
                  Bạn chỉ có thể connect đến tx_ref mà bạn đã tạo (ownership
                  check)
                </li>
                <li>
                  Heartbeat events sẽ được gửi tự động mỗi 30 giây để keep
                  connection alive
                </li>
                <li>
                  Khi webhook nhận được payment update, nó sẽ broadcast event
                  qua SSE
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
