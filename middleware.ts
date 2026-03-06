import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // HANYA proteksi halaman frontend /admin
  // Biarkan /api diurus oleh file route.ts masing-masing
  if (pathname.startsWith('/admin')) {
    const isAdmin = request.cookies.get('isAdmin')?.value === 'true';
    const userRole = request.cookies.get('userRole')?.value?.toLowerCase();
    
    const isAuthorized = isAdmin && (userRole === 'manager' || userRole === 'admin');

    if (!isAuthorized) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // HAPUS '/api/orders/manage/:path*' DARI SINI
    '/admin/:path*',
  ],
};