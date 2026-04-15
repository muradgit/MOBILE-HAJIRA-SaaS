import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware to protect routes based on authentication and roles.
 * 
 * In a production environment with Firebase Auth, you would typically:
 * 1. Use Firebase Session Cookies (set via an API route after client-side login).
 * 2. Verify the session cookie using `firebase-admin` (which requires a Node.js runtime, 
 *    so you might need to use a standard API route or a Edge-compatible JWT library).
 * 3. Check custom claims (e.g., { role: 'SuperAdmin' }) embedded in the token.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Example: Get the session cookie
  const session = request.cookies.get('session')?.value;

  // Define protected route patterns
  const isSuperAdminRoute = pathname.startsWith('/super-admin');
  const isAdminRoute = pathname.startsWith('/admin');
  const isTeacherRoute = pathname.startsWith('/teacher');
  const isStudentRoute = pathname.startsWith('/student');
  const isProtectedRoute = isSuperAdminRoute || isAdminRoute || isTeacherRoute || isStudentRoute;

  if (isProtectedRoute && !session) {
    // Redirect to login if no session is found
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control logic would go here:
  // if (isSuperAdminRoute && userRole !== 'SuperAdmin') {
  //   return NextResponse.redirect(new URL('/unauthorized', request.url));
  // }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/super-admin/:path*',
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
  ],
};
