import { NextResponse } from 'next/server';
import { getCacheControl } from '@/lib/vercel/cachingHeaders';

export function middleware(request) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // Apply caching headers
  const cacheHeaders = getCacheControl(pathname);
  if (cacheHeaders) {
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      if (key !== 'revalidate') {
        response.headers.set(key, value);
      }
    });
  }

  // Remove X-Powered-By header for security
  response.headers.delete('X-Powered-By');

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

export const config = {
  matcher: [
    // Match API routes
    '/api/:path*',
    // Match pages that benefit from caching
    '/dashboard/:path*',
    '/settings/:path*',
  ],
};
