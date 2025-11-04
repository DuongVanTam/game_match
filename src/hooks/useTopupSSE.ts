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
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

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
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        setStatus({ tx_ref: data.tx_ref, status: 'pending' });
      });

      eventSource.addEventListener('status-update', (event) => {
        const data = JSON.parse(event.data);
        const newStatus: TopupStatus = {
          tx_ref: data.tx_ref,
          status: data.status,
          amount: data.amount,
          confirmed_at: data.confirmed_at,
        };
        setStatus(newStatus);
        onStatusUpdate?.(newStatus);
      });

      eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const errorObj = new Error(data.error || 'Unknown error');
          setError(errorObj);
          onError?.(errorObj);
        } catch {
          // If event.data is not available or not JSON, use generic error
          const errorObj = new Error('Connection error');
          setError(errorObj);
          onError?.(errorObj);
        }
      });

      eventSource.addEventListener('heartbeat', () => {
        // Keep connection alive
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // Attempt to reconnect if not exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            // Use the ref to call connect function (will be updated after connect is defined)
            if (connectFnRef.current) {
              connectFnRef.current();
            }
          }, reconnectDelay);
        } else {
          const reconnectError = new Error(
            'Failed to reconnect after multiple attempts'
          );
          setError(reconnectError);
          onError?.(reconnectError);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (_err) {
      const errorObj =
        _err instanceof Error ? _err : new Error('Failed to connect');
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
