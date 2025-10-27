import { NextRequest, NextResponse } from 'next/server';
import { healthCheck, performanceMonitor, auditLogger } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');

    switch (endpoint) {
      case 'health':
        return await healthCheck();

      case 'metrics':
        const metrics = performanceMonitor.getAllMetrics();
        return NextResponse.json({
          metrics,
          timestamp: new Date().toISOString(),
        });

      case 'audit-logs':
        const logs = auditLogger.getLogs();
        return NextResponse.json({
          logs,
          count: logs.length,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({
          available_endpoints: ['health', 'metrics', 'audit-logs'],
          timestamp: new Date().toISOString(),
        });
    }
  } catch {
    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
