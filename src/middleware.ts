import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { withTimeoutOrNull } from '@/lib/timeout';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  apiMaxRequests: 200, // 200 API requests per window (increased for read operations)
  readApiMaxRequests: 500, // 500 requests for read-only endpoints
  writeApiMaxRequests: 50, // 50 requests for write operations
};

// Timeout for Supabase auth operations in middleware (2 seconds)
// Vercel middleware has a 25s limit, but we want to fail fast
// If Supabase is slow, we should redirect to login quickly rather than timeout
const MIDDLEWARE_AUTH_TIMEOUT_MS = 2000;

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/wallet',
  '/matches/create',
  '/matches/my',
  '/admin', // Admin routes require auth, but role check is in handlers
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/matches', // Public match listing and details (but /matches/create is protected)
  '/privacy',
  '/terms',
  '/faq',
  '/contact',
  '/how-it-works',
  '/test-sse', // Testing endpoint
];

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/matches', // Public match listing
];

/**
 * Check if a route is protected (requires authentication)
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a route is public (no auth required)
 * Protected routes take precedence over public routes
 */
function isPublicRoute(pathname: string): boolean {
  // Protected routes take precedence
  if (isProtectedRoute(pathname)) {
    return false;
  }

  // Check exact matches first
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  // Check if pathname starts with any public route
  // This allows /matches and /matches/[id] but not /matches/create
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if an API route is public (no auth required)
 */
function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
}

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

function isRateLimited(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return false;
  }

  if (record.count >= maxRequests) {
    return true;
  }

  record.count++;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Early return for static files and internal Next.js routes
  // This is the fastest path - no processing needed
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Early return for public routes that don't need any middleware processing
  // This reduces middleware execution time significantly
  const isPublic = isPublicRoute(pathname) || isPublicApiRoute(pathname);
  const isProtected = isProtectedRoute(pathname);

  // For public, non-protected routes, skip to security headers only
  // No auth check, no rate limiting needed for most public routes
  if (isPublic && !isProtected) {
    // Skip rate limiting for public pages to reduce processing time
    const response = NextResponse.next();

    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Cache headers for static pages
    const staticPages = [
      '/privacy',
      '/terms',
      '/faq',
      '/how-it-works',
      '/contact',
    ];
    const isStaticPage = staticPages.some((route) =>
      pathname.startsWith(route)
    );

    if (isStaticPage && request.method === 'GET') {
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=604800, stale-while-revalidate=86400, max-age=86400'
      );
    }

    if (pathname === '/' && request.method === 'GET') {
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=21600, stale-while-revalidate=3600, max-age=3600'
      );
    }

    return response;
  }

  // Skip rate limiting for SSE (Server-Sent Events) endpoints
  // SSE connections are long-lived and should not be rate limited
  const isSSEEndpoint =
    pathname.startsWith('/api/topup/stream') ||
    pathname.startsWith('/api/topup/stream/');

  if (isSSEEndpoint) {
    // Skip rate limiting for SSE, but still apply authentication and other middleware
    // (rate limiting will be skipped below)
  }

  const key = getRateLimitKey(request);
  const isApiRoute = pathname.startsWith('/api/');

  // Determine rate limit based on endpoint type
  let maxRequests = RATE_LIMIT.maxRequests;

  if (isApiRoute) {
    // Read-only endpoints (GET requests to data endpoints)
    const isReadOnlyEndpoint =
      request.method === 'GET' &&
      (pathname.startsWith('/api/matches') ||
        pathname.startsWith('/api/wallet/balance') ||
        pathname.startsWith('/api/wallet/transactions') ||
        (pathname.startsWith('/api/payouts') && !pathname.includes('/status')));

    // Write endpoints (POST, PUT, DELETE, or sensitive operations)
    const isWriteEndpoint =
      request.method !== 'GET' ||
      pathname.startsWith('/api/topup') ||
      (pathname.startsWith('/api/matches') &&
        (pathname.includes('/join') ||
          pathname.includes('/leave') ||
          pathname.includes('/settle'))) ||
      (pathname.startsWith('/api/payouts') && pathname.includes('/status'));

    if (isReadOnlyEndpoint) {
      maxRequests = RATE_LIMIT.readApiMaxRequests;
    } else if (isWriteEndpoint) {
      maxRequests = RATE_LIMIT.writeApiMaxRequests;
    } else {
      maxRequests = RATE_LIMIT.apiMaxRequests;
    }

    // Relax rate limit for topup init to reduce false 429s during normal use
    const isTopupInit = pathname.startsWith('/api/topup/init');
    if (isTopupInit) {
      // In development, effectively disable rate limit for this endpoint
      if (process.env.NODE_ENV !== 'production') {
        maxRequests = Number.MAX_SAFE_INTEGER;
      } else {
        // In production, allow higher burst specifically for init
        maxRequests = Math.max(maxRequests, 200);
      }
    }

    const isStartMatchEndpoint =
      pathname.startsWith('/api/rooms/') && pathname.endsWith('/start-match');

    if (isStartMatchEndpoint) {
      if (process.env.NODE_ENV !== 'production') {
        maxRequests = Number.MAX_SAFE_INTEGER;
      } else {
        maxRequests = Math.max(maxRequests, 120);
      }
    }

    const isAiAnalysisEndpoint = pathname.startsWith('/api/ai/analyze-match');

    if (isAiAnalysisEndpoint) {
      if (process.env.NODE_ENV !== 'production') {
        maxRequests = Number.MAX_SAFE_INTEGER;
      } else {
        maxRequests = Math.max(maxRequests, 60);
      }
    }
  }

  // Skip rate limiting for SSE endpoints (long-lived connections)
  if (!isSSEEndpoint && isRateLimited(key, maxRequests)) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900', // 15 minutes
        },
      }
    );
  }

  // Only check auth for protected routes (not public routes)
  if (isProtected) {
    // Only check auth for protected routes
    try {
      // Verify environment variables are available
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables in middleware');
        // If env vars are missing, allow request through but log error
        // This prevents middleware from blocking all requests
      } else {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
            },
          },
        });

        // Use timeout to prevent middleware timeout errors
        const sessionResult = await withTimeoutOrNull(
          supabase.auth.getSession(),
          MIDDLEWARE_AUTH_TIMEOUT_MS
        );

        // If timeout occurs, sessionResult will be null
        // In this case, we'll treat it as no session for safety
        const session = sessionResult?.data?.session || null;

        // Redirect to login if accessing protected route without session
        if (!session) {
          const loginUrl = new URL('/auth/login', request.url);
          loginUrl.searchParams.set('redirectTo', pathname);
          return NextResponse.redirect(loginUrl);
        }
      }
    } catch (error) {
      // Log error but don't block the request if auth check fails
      // This prevents middleware crashes from blocking all requests
      console.error('Middleware auth check error:', error);

      // For protected routes, if auth check fails, redirect to login
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  // For non-public, non-protected routes (e.g., some API routes), allow through
  // Auth will be checked in the route handler if needed

  // Add security headers
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Cache headers for static pages (long cache time, revalidate on CDN)
  // These pages rarely change, so we can cache them aggressively
  const staticPages = [
    '/privacy',
    '/terms',
    '/faq',
    '/how-it-works',
    '/contact',
  ];

  const isStaticPage = staticPages.some((route) => pathname.startsWith(route));

  if (isStaticPage && request.method === 'GET') {
    // Cache for 1 day in browser, 1 week on CDN (Vercel Edge Network)
    // stale-while-revalidate allows serving stale content while revalidating
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=604800, stale-while-revalidate=86400, max-age=86400'
    );
  }

  // Cache for homepage (less aggressive since it might have dynamic content)
  if (pathname === '/' && request.method === 'GET') {
    // Cache for 1 hour in browser, 6 hours on CDN
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=21600, stale-while-revalidate=3600, max-age=3600'
    );
  }

  // CORS headers for API routes
  if (isApiRoute) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
