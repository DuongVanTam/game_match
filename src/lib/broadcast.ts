/**
 * Broadcast Manager for SSE Events
 * Manages SSE connections and broadcasts events to subscribers
 */

interface SSEConnection {
  controller: ReadableStreamDefaultController;
  userId: string;
  txRef: string;
  connectedAt: number;
}

type EventType = 'status-update' | 'error' | 'heartbeat';

interface BroadcastEvent {
  type: EventType;
  data: {
    tx_ref: string;
    status?: 'pending' | 'confirmed' | 'failed' | 'cancelled';
    amount?: number;
    confirmed_at?: string;
    error?: string;
    [key: string]: unknown;
  };
}

class BroadcastManager {
  private connections: Map<string, Set<SSEConnection>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start heartbeat interval (30 seconds)
    this.startHeartbeat();
  }

  /**
   * Subscribe a connection to receive events for a specific tx_ref
   */
  subscribe(txRef: string, connection: SSEConnection): void {
    if (!this.connections.has(txRef)) {
      this.connections.set(txRef, new Set());
    }
    this.connections.get(txRef)!.add(connection);
  }

  /**
   * Unsubscribe a connection from a tx_ref
   */
  unsubscribe(txRef: string, connection: SSEConnection): void {
    const connections = this.connections.get(txRef);
    if (connections) {
      connections.delete(connection);
      if (connections.size === 0) {
        this.connections.delete(txRef);
      }
    }
  }

  /**
   * Broadcast an event to all subscribers of a tx_ref
   */
  broadcast(txRef: string, event: BroadcastEvent): void {
    const connections = this.connections.get(txRef);
    if (!connections || connections.size === 0) {
      console.warn(
        `No SSE connections found for tx_ref: ${txRef}. Event will not be delivered.`
      );
      return;
    }

    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    const deadConnections: SSEConnection[] = [];
    let successCount = 0;

    console.log(
      `Broadcasting ${event.type} to ${connections.size} connection(s) for tx_ref: ${txRef}`
    );

    connections.forEach((connection) => {
      try {
        connection.controller.enqueue(new TextEncoder().encode(message));
        successCount++;
      } catch (error) {
        // Connection is dead, mark for removal
        console.error('Error broadcasting to connection:', error);
        deadConnections.push(connection);
      }
    });

    console.log(
      `Successfully broadcasted to ${successCount}/${connections.size} connection(s) for tx_ref: ${txRef}`
    );

    // Clean up dead connections
    deadConnections.forEach((conn) => {
      this.unsubscribe(txRef, conn);
    });
  }

  /**
   * Send heartbeat to all connections to keep them alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const deadConnections: Array<{ txRef: string; conn: SSEConnection }> = [];

      this.connections.forEach((connections, txRef) => {
        connections.forEach((conn) => {
          // Close connections older than 5 minutes
          if (now - conn.connectedAt > 5 * 60 * 1000) {
            deadConnections.push({ txRef, conn });
            return;
          }

          try {
            const heartbeat: BroadcastEvent = {
              type: 'heartbeat',
              data: { tx_ref: txRef },
            };
            const message = `event: ${heartbeat.type}\ndata: ${JSON.stringify(heartbeat.data)}\n\n`;
            conn.controller.enqueue(new TextEncoder().encode(message));
          } catch {
            // Connection is dead
            deadConnections.push({ txRef, conn });
          }
        });
      });

      // Clean up dead connections
      deadConnections.forEach(({ txRef, conn }) => {
        this.unsubscribe(txRef, conn);
      });
    }, 30000); // 30 seconds
  }

  /**
   * Get connection count for a tx_ref
   */
  getConnectionCount(txRef: string): number {
    return this.connections.get(txRef)?.size || 0;
  }

  /**
   * Get total connection count
   */
  getTotalConnections(): number {
    let total = 0;
    this.connections.forEach((connections) => {
      total += connections.size;
    });
    return total;
  }

  /**
   * Cleanup: close all connections and stop heartbeat
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.connections.forEach((connections) => {
      connections.forEach((conn) => {
        try {
          conn.controller.close();
        } catch {
          // Ignore errors during cleanup
        }
      });
    });

    this.connections.clear();
  }
}

// Singleton instance
export const broadcastManager = new BroadcastManager();
