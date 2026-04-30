import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userRole = request.cookies.get("user-role")?.value;

  // Task 1: Redirect from root (/) to dashboard if role exists
  if (pathname === "/" && userRole) {
    const dashboardMap: Record<string, string> = {
      SuperAdmin: "/super-admin/dashboard",
      InstitutionAdmin: "/admin/dashboard",
      admin: "/admin/dashboard",
      Teacher: "/teacher/dashboard",
      Student: "/student/dashboard",
    };
    const redirectUrl = dashboardMap[userRole];
    if (redirectUrl) {
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }

  // Define protected routes and their allowed roles
  const protectedRoutes = [
    { path: "/super-admin", roles: ["SuperAdmin"] },
    { path: "/admin", roles: ["InstitutionAdmin", "admin"] },
    { path: "/teacher", roles: ["Teacher"] },
    { path: "/student", roles: ["Student"] },
  ];

  // Check if the current path is a protected route
  const protectedRoute = protectedRoutes.find((route) =>
    pathname.startsWith(route.path)
  );

  if (protectedRoute) {
    // CRITICAL: If no user role is found, redirect to login
    if (!userRole) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      // Hard redirect to clear any state issues
      return NextResponse.redirect(loginUrl);
    }

    // If the user's role is not allowed for this route, redirect to their own dashboard or login
    if (!protectedRoute.roles.includes(userRole)) {
      const dashboardMap: Record<string, string> = {
        SuperAdmin: "/super-admin/dashboard",
        InstitutionAdmin: "/admin/dashboard",
        admin: "/admin/dashboard",
        Teacher: "/teacher/dashboard",
        Student: "/student/dashboard",
      };

      const redirectUrl = dashboardMap[userRole] || "/auth/login";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }

  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    "/super-admin/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
  ],
};
