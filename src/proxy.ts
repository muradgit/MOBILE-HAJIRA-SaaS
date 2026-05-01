import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let userRole = request.cookies.get("user-role")?.value?.toLowerCase().replace(/[\s-]/g, "_");
  const userEmail = request.cookies.get("user-email")?.value; 

  // Aggressive Normalization for Stale Cookies
  if (userRole === "admin" || userRole === "institutionadmin" || userRole === "instituteadmin") {
    userRole = "institute_admin";
  } else if (userRole === "superadmin") {
    userRole = "super_admin";
  }

  const SUPER_ADMIN_EMAILS = ["hello@muradkhank31.com", "muradkhan31@gmail.com"];

  // Task 1: Redirect from root (/) to dashboard if role exists
  if (pathname === "/" && userRole) {
    const dashboardMap: Record<string, string> = {
      super_admin: "/super-admin/dashboard",
      institute_admin: "/admin/dashboard",
      teacher: "/teacher/dashboard",
      student: "/student/dashboard",
    };
    const redirectUrl = dashboardMap[userRole];
    if (redirectUrl) {
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }

  // Define protected routes and their allowed roles
  const protectedRoutes = [
    { path: "/super-admin", roles: ["super_admin"] },
    { path: "/admin", roles: ["institute_admin"] },
    { path: "/teacher", roles: ["teacher"] },
    { path: "/student", roles: ["student"] },
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
      return NextResponse.redirect(loginUrl);
    }

    // STRICT Super Admin Security: Even if role matches, check email
    if (pathname.startsWith("/super-admin")) {
      const normalizedEmail = userEmail?.toLowerCase() || "";
      if (!normalizedEmail || !SUPER_ADMIN_EMAILS.includes(normalizedEmail)) {
        console.warn(`Unauthorized Super Admin attempt by ${normalizedEmail}`);
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
    }

    // Role-based access check
    if (!protectedRoute.roles.includes(userRole)) {
      const dashboardMap: Record<string, string> = {
        super_admin: "/super-admin/dashboard",
        institute_admin: "/admin/dashboard",
        teacher: "/teacher/dashboard",
        student: "/student/dashboard",
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
