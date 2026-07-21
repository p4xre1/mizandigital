import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth Cookie Name
const ADMIN_AUTH_COOKIE = "mizan_admin_auth";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 🛡️ Protect CMS / Admin Routes
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminCookie = request.cookies.get(ADMIN_AUTH_COOKIE);
    const isAuthenticated = adminCookie?.value === "true";

    // Redirect unauthenticated requests to login with a fallback return path
    if (!isAuthenticated) {
      const loginUrl = new URL("/admin/login", request.url);
      const targetPath = `${pathname}${search}`;
      loginUrl.searchParams.set("redirect", targetPath);

      return NextResponse.redirect(loginUrl);
    }
  }

  // 🔒 Create Response & Inject Security Headers for Admin Portal
  const response = NextResponse.next();

  if (pathname.startsWith("/admin")) {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  return response;
}

// 🚀 Execute middleware specifically on /admin routes (excluding static assets)
export const config = {
  matcher: ["/admin/:path*"],
};