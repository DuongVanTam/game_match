import { NextRequest, NextResponse } from 'next/server';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  resource_id?: string;
  details: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
  success: boolean;
  error_message?: string;
}

class AuditLogger {
  private static instance: AuditLogger;
  private logs: AuditLog[] = [];

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async log(auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      ...auditData,
    };

    this.logs.push(log);

    // In production, this would be sent to a proper logging service
    console.log('AUDIT_LOG:', JSON.stringify(log, null, 2));

    // Send to external monitoring service if configured
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'audit_log',
            data: log,
          }),
        });
      } catch (error) {
        console.error('Failed to send audit log to monitoring service:', error);
      }
    }
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getLogs(): AuditLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const auditLogger = AuditLogger.getInstance();

export function auditMiddleware(
  action: string,
  resource: string,
  getResourceId?: (req: NextRequest) => string | undefined
) {
  return function (
    handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>
  ) {
    return async (
      req: NextRequest,
      ...args: unknown[]
    ): Promise<NextResponse> => {
      const startTime = Date.now();
      let success = true;
      let errorMessage: string | undefined;

      try {
        const response = await handler(req, ...args);

        if (!response.ok) {
          success = false;
          errorMessage = `HTTP ${response.status}`;
        }

        return response;
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        const resourceId = getResourceId ? getResourceId(req) : undefined;

        await auditLogger.log({
          user_id: req.headers.get('x-user-id') || null,
          action,
          resource,
          resource_id: resourceId,
          details: {
            method: req.method,
            url: req.url,
            duration_ms: duration,
            status_code: success ? 200 : 500,
          },
          ip_address:
            req.headers.get('x-forwarded-for') ||
            req.headers.get('x-real-ip') ||
            'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          success,
          error_message: errorMessage,
        });

        // Log slow requests
        if (duration > 5000) {
          console.warn(
            `Slow request detected: ${req.method} ${req.url} took ${duration}ms`
          );
        }
      }
    };
  };
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 1000 values to prevent memory leaks
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  getMetricStats(name: string): {
    average: number;
    min: number;
    max: number;
    count: number;
  } {
    const values = this.metrics.get(name) || [];

    if (values.length === 0) {
      return { average: 0, min: 0, max: 0, count: 0 };
    }

    return {
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  getAllMetrics(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [name] of this.metrics) {
      result[name] = this.getMetricStats(name);
    }

    return result;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Error reporting
export class ErrorReporter {
  private static instance: ErrorReporter;

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  async reportError(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: context || {},
      environment: process.env.NODE_ENV,
    };

    console.error('ERROR_REPORT:', JSON.stringify(errorReport, null, 2));

    // Send to external error tracking service
    if (process.env.ERROR_WEBHOOK_URL) {
      try {
        await fetch(process.env.ERROR_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'error_report',
            data: errorReport,
          }),
        });
      } catch (reportError) {
        console.error('Failed to send error report:', reportError);
      }
    }
  }
}

export const errorReporter = ErrorReporter.getInstance();

// Health check endpoint
export async function healthCheck(): Promise<NextResponse> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
    },
    metrics: performanceMonitor.getAllMetrics(),
  };

  return NextResponse.json(health);
}
