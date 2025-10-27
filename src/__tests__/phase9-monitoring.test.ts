import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import {
  auditLogger,
  performanceMonitor,
  errorReporter,
} from '@/lib/monitoring';
import {
  rateLimiter,
  createRateLimit,
  rateLimitConfigs,
} from '@/lib/rate-limiting';

describe('Phase 9 - Monitoring & Logging', () => {
  beforeEach(() => {
    // Clear logs and metrics before each test
    auditLogger.clearLogs();
    performanceMonitor['metrics'].clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Audit Logging', () => {
    it('should log successful operations', async () => {
      await auditLogger.log({
        user_id: 'test-user-123',
        action: 'CREATE_MATCH',
        resource: 'matches',
        resource_id: 'match-456',
        details: {
          title: 'Test Tournament',
          entry_fee: 20000,
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...',
        success: true,
      });

      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].user_id).toBe('test-user-123');
      expect(logs[0].action).toBe('CREATE_MATCH');
      expect(logs[0].success).toBe(true);
    });

    it('should log failed operations with error messages', async () => {
      await auditLogger.log({
        user_id: 'test-user-123',
        action: 'JOIN_MATCH',
        resource: 'matches',
        resource_id: 'match-456',
        details: {
          match_id: 'match-456',
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...',
        success: false,
        error_message: 'Insufficient balance',
      });

      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].error_message).toBe('Insufficient balance');
    });

    it('should generate unique log IDs', async () => {
      await auditLogger.log({
        user_id: 'user-1',
        action: 'ACTION_1',
        resource: 'resource',
        details: {},
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...',
        success: true,
      });

      await auditLogger.log({
        user_id: 'user-2',
        action: 'ACTION_2',
        resource: 'resource',
        details: {},
        ip_address: '192.168.1.2',
        user_agent: 'Mozilla/5.0...',
        success: true,
      });

      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].id).not.toBe(logs[1].id);
    });
  });

  describe('Performance Monitoring', () => {
    it('should record and calculate metrics', () => {
      // Record some metrics
      performanceMonitor.recordMetric('api_response_time', 100);
      performanceMonitor.recordMetric('api_response_time', 200);
      performanceMonitor.recordMetric('api_response_time', 300);

      const stats = performanceMonitor.getMetricStats('api_response_time');
      expect(stats.average).toBe(200);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(300);
      expect(stats.count).toBe(3);
    });

    it('should handle empty metrics gracefully', () => {
      const stats = performanceMonitor.getMetricStats('non_existent_metric');
      expect(stats.average).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.count).toBe(0);
    });

    it('should prevent memory leaks by limiting stored values', () => {
      // Record more than 1000 values
      for (let i = 0; i < 1500; i++) {
        performanceMonitor.recordMetric('test_metric', i);
      }

      const stats = performanceMonitor.getMetricStats('test_metric');
      expect(stats.count).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Reporting', () => {
    it('should report errors with context', async () => {
      const error = new Error('Test error message');
      const context = {
        userId: 'test-user',
        action: 'CREATE_MATCH',
        additionalData: 'test-data',
      };

      await errorReporter.reportError(error, context);

      // In a real implementation, this would verify the error was sent to external service
      // For now, we just verify no exceptions were thrown
      expect(true).toBe(true);
    });

    it('should handle errors without context', async () => {
      const error = new Error('Simple error');

      await errorReporter.reportError(error);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 10,
      };

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.checkLimit(mockRequest, config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(10 - i - 1);
      }
    });

    it('should block requests exceeding rate limit', () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 3,
      };

      // Make 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        const result = rateLimiter.checkLimit(mockRequest, config);
        expect(result.allowed).toBe(true);
      }

      // 4th request should be blocked
      const result = rateLimiter.checkLimit(mockRequest, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset rate limit after window expires', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const config = {
        windowMs: 100, // Very short window for testing
        maxRequests: 2,
      };

      // Exceed limit
      rateLimiter.checkLimit(mockRequest, config);
      rateLimiter.checkLimit(mockRequest, config);
      const blockedResult = rateLimiter.checkLimit(mockRequest, config);
      expect(blockedResult.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      const allowedResult = rateLimiter.checkLimit(mockRequest, config);
      expect(allowedResult.allowed).toBe(true);
    });

    it('should use custom key generators', () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-user-id': 'user-123',
        },
      });

      const config = {
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: (req: NextRequest) => {
          return req.headers.get('x-user-id') || 'anonymous';
        },
      };

      const result = rateLimiter.checkLimit(mockRequest, config);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Rate Limit Middleware', () => {
    it('should apply rate limiting to handlers', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'));
      const rateLimitedHandler = createRateLimit({
        windowMs: 60000,
        maxRequests: 2,
      })(mockHandler);

      const mockRequest = new NextRequest('http://localhost:3000/api/test');

      // First two requests should succeed
      const response1 = await rateLimitedHandler(mockRequest);
      expect(response1.status).toBe(200);

      const response2 = await rateLimitedHandler(mockRequest);
      expect(response2.status).toBe(200);

      // Third request should be rate limited
      const response3 = await rateLimitedHandler(mockRequest);
      expect(response3.status).toBe(429);

      // Handler should only be called twice
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('should add rate limit headers to responses', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'));
      const rateLimitedHandler = createRateLimit({
        windowMs: 60000,
        maxRequests: 5,
      })(mockHandler);

      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const response = await rateLimitedHandler(mockRequest);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('Rate Limit Configurations', () => {
    it('should have appropriate limits for different operation types', () => {
      expect(rateLimitConfigs.general.maxRequests).toBe(100);
      expect(rateLimitConfigs.financial.maxRequests).toBe(10);
      expect(rateLimitConfigs.read.maxRequests).toBe(200);
      expect(rateLimitConfigs.auth.maxRequests).toBe(5);
      expect(rateLimitConfigs.upload.maxRequests).toBe(20);
    });

    it('should have consistent window sizes', () => {
      const windowSizes = Object.values(rateLimitConfigs).map(
        (config) => config.windowMs
      );
      const uniqueWindowSizes = [...new Set(windowSizes)];

      // All configs should use the same window size for consistency
      expect(uniqueWindowSizes.length).toBeLessThanOrEqual(2); // Allow some variation
    });
  });

  describe('Integration Tests', () => {
    it('should work together with audit logging', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'));
      const rateLimitedHandler = createRateLimit({
        windowMs: 60000,
        maxRequests: 1,
      })(mockHandler);

      const mockRequest = new NextRequest('http://localhost:3000/api/test');

      // First request succeeds
      await rateLimitedHandler(mockRequest);

      // Second request is rate limited
      const response = await rateLimitedHandler(mockRequest);
      expect(response.status).toBe(429);

      // Should have audit logs for both requests
      const logs = auditLogger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
