'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface TopupStatus {
  tx_ref: string;
  status?: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  amount?: number;
  confirmed_at?: string;
  error?: string;
}

interface UseTopupSSEOptions {
  txRef: string | null;
  enabled?: boolean;
  onStatusUpdate?: (status: TopupStatus) => void;
  onError?: (error: Error) => void;
}

export function useTopupSSE({
  txRef,
  enabled = true,
  onStatusUpdate,
  onError,
}: UseTopupSSEOptions) {
  const [status, setStatus] = useState<TopupStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const connectFnRef = useRef<(() => void) | null>(null);
  const connectionStartTimeRef = useRef<number | null>(null);
  const statusRef = useRef<TopupStatus | null>(null); // Keep current status in ref for use in error handler
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds
  const connectionTimeout = 10000; // 10 seconds to establish connection

  const connect = useCallback(() => {
    if (!txRef || !enabled) {
      return;
    }

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const url = `/api/topup/stream?tx_ref=${encodeURIComponent(txRef)}`;
      connectionStartTimeRef.current = Date.now();

      // Create EventSource - it will automatically include cookies for same-origin requests
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        connectionStartTimeRef.current = null;
        // Reset status ref when new connection opens
        if (!statusRef.current) {
          statusRef.current = { tx_ref: txRef, status: 'pending' };
        }
        console.log('SSE connection opened for tx_ref:', txRef);
      };

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        const pendingStatus = {
          tx_ref: data.tx_ref,
          status: 'pending' as const,
        };
        setStatus(pendingStatus);
        statusRef.current = pendingStatus;
      });

      eventSource.addEventListener('status-update', (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE status-update received:', data);
        const newStatus: TopupStatus = {
          tx_ref: data.tx_ref,
          status: data.status,
          amount: data.amount,
          confirmed_at: data.confirmed_at,
        };
        setStatus(newStatus);
        statusRef.current = newStatus; // Update ref for use in error handler
        onStatusUpdate?.(newStatus);

        // Disconnect when status is final (confirmed or failed)
        // This prevents unnecessary reconnections
        if (data.status === 'confirmed' || data.status === 'failed') {
          console.log(
            'Final status received, closing SSE connection:',
            data.status
          );
          // Close connection after a short delay to ensure message is processed
          setTimeout(() => {
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
            setIsConnected(false);
          }, 1000);
        }
      });

      eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const errorObj = new Error(data.error || 'Lỗi không xác định');
          setError(errorObj);
          onError?.(errorObj);
        } catch {
          // If event.data is not available or not JSON, this is a custom error event
          // Don't set error here as onerror handler will handle connection errors
          console.warn('SSE error event received but no data:', event);
        }
      });

      eventSource.addEventListener('heartbeat', () => {
        // Keep connection alive
      });

      eventSource.onerror = () => {
        setIsConnected(false);

        // Don't reconnect if we already have a final status
        const currentStatus = statusRef.current?.status;
        if (currentStatus === 'confirmed' || currentStatus === 'failed') {
          console.log(
            'Final status already received, not reconnecting:',
            currentStatus
          );
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          return;
        }

        // Check if connection state indicates a failed connection
        // EventSource.readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
        const now = Date.now();
        const connectionTime = connectionStartTimeRef.current
          ? now - connectionStartTimeRef.current
          : 0;

        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();

          // Only show error if connection took more than timeout (likely a real failure)
          // Or if we've exceeded max reconnect attempts
          if (
            connectionTime > connectionTimeout ||
            reconnectAttempts.current >= maxReconnectAttempts
          ) {
            // Attempt to reconnect if not exceeded max attempts
            if (reconnectAttempts.current < maxReconnectAttempts) {
              reconnectAttempts.current += 1;
              reconnectTimeoutRef.current = setTimeout(() => {
                // Check status again before reconnecting
                if (
                  statusRef.current?.status === 'confirmed' ||
                  statusRef.current?.status === 'failed'
                ) {
                  console.log('Status is final, skipping reconnect');
                  return;
                }
                // Use the ref to call connect function (will be updated after connect is defined)
                if (connectFnRef.current) {
                  connectFnRef.current();
                }
              }, reconnectDelay);
            } else {
              const reconnectError = new Error(
                'Không thể kết nối đến server sau nhiều lần thử. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.'
              );
              setError(reconnectError);
              onError?.(reconnectError);
            }
          } else {
            // Connection failed quickly, might be auth issue or server error
            // Try to reconnect automatically
            if (reconnectAttempts.current < maxReconnectAttempts) {
              reconnectAttempts.current += 1;
              reconnectTimeoutRef.current = setTimeout(() => {
                // Check status again before reconnecting
                if (
                  statusRef.current?.status === 'confirmed' ||
                  statusRef.current?.status === 'failed'
                ) {
                  console.log('Status is final, skipping reconnect');
                  return;
                }
                if (connectFnRef.current) {
                  connectFnRef.current();
                }
              }, reconnectDelay);
            }
          }
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          // Connection is still trying, don't error yet
          // Wait for connection timeout before showing error
          if (connectionTime > connectionTimeout) {
            const timeoutError = new Error(
              'Kết nối đang mất quá nhiều thời gian. Vui lòng kiểm tra kết nối mạng.'
            );
            setError(timeoutError);
            onError?.(timeoutError);
          }
        }
      };

      eventSourceRef.current = eventSource;
    } catch (_err) {
      const errorObj =
        _err instanceof Error
          ? _err
          : new Error('Không thể khởi tạo kết nối. Vui lòng thử lại.');
      setError(errorObj);
      onError?.(errorObj);
      setIsConnected(false);
    }
  }, [txRef, enabled, onStatusUpdate, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    reconnectAttempts.current = 0;
    connectionStartTimeRef.current = null;
    // Don't reset statusRef here - keep it for final status checks
  }, []);

  // Update connect function ref in effect
  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (txRef && enabled) {
      // Use setTimeout to avoid calling setState synchronously in effect
      const timeoutId = setTimeout(() => {
        connect();
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [txRef, enabled, connect, disconnect]);

  return {
    status,
    isConnected,
    error,
    reconnect: connect,
    disconnect,
  };
}
