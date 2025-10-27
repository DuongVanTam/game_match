import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  private generateKey(req: NextRequest, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default: use IP address + user ID if available
    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userId = req.headers.get('x-user-id') || 'anonymous';
    return `${ip}:${userId}`;
  }

  checkLimit(
    req: NextRequest,
    config: RateLimitConfig
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  } {
    const key = this.generateKey(req, config);
    const now = Date.now();

    let entry = this.store.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      this.store.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const allowed = entry.count <= config.maxRequests;

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      totalHits: entry.count,
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

export const rateLimiter = RateLimiter.getInstance();

export function createRateLimit(config: RateLimitConfig) {
  return function (
    handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>
  ) {
    return async (
      req: NextRequest,
      ...args: unknown[]
    ): Promise<NextResponse> => {
      const limitResult = rateLimiter.checkLimit(req, config);

      if (!limitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil(
                (limitResult.resetTime - Date.now()) / 1000
              ).toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': limitResult.remaining.toString(),
              'X-RateLimit-Reset': limitResult.resetTime.toString(),
            },
          }
        );
      }

      const response = await handler(req, ...args);

      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        limitResult.remaining.toString()
      );
      response.headers.set(
        'X-RateLimit-Reset',
        limitResult.resetTime.toString()
      );

      return response;
    };
  };
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },

  // Strict rate limit for financial operations
  financial: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },

  // Lenient rate limit for read operations
  read: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,
  },

  // Very strict rate limit for authentication
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },

  // Rate limit for file uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
  },
};

// Custom key generators
export const keyGenerators = {
  // Rate limit by IP only
  byIP: (req: NextRequest) => {
    return (
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown'
    );
  },

  // Rate limit by user ID only
  byUser: (req: NextRequest) => {
    return req.headers.get('x-user-id') || 'anonymous';
  },

  // Rate limit by IP and user ID
  byIPAndUser: (req: NextRequest) => {
    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userId = req.headers.get('x-user-id') || 'anonymous';
    return `${ip}:${userId}`;
  },

  // Rate limit by endpoint
  byEndpoint: (req: NextRequest) => {
    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const endpoint = new URL(req.url).pathname;
    return `${ip}:${endpoint}`;
  },
};
