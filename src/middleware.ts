import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

  // Skip rate limiting for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
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
  }

  if (isRateLimited(key, maxRequests)) {
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

  // Authentication middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes that require authentication
  const protectedRoutes = ['/wallet', '/matches/create', '/matches/my'];
  const adminRoutes = ['/admin'];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin access for admin routes
  if (isAdminRoute && session) {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (user?.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // Add security headers
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

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
