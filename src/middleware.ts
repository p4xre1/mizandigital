import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth Cookie Name
const ADMIN_AUTH_COOKIE = "mizan_admin_auth";

// Supported Language Prefixes
const SUPPORTED_LOCALES = ["ar", "fr", "en", "es"];

export function middleware(request: NextRequest) {
  const { pathname, search, host } = request.nextUrl;

  // 1️⃣ Enforce Canonical Domain Redirect (mizan.page -> www.mizan.page)
  if (process.env.NODE_ENV === "production" && host === "mizan.page") {
    const url = request.nextUrl.clone();
    url.host = "www.mizan.page";
    url.protocol = "https";
    return NextResponse.redirect(url, 301);
  }

  // 2️⃣ Detect if current route is an Admin Route (matches /admin OR /:lang/admin)
  const segments = pathname.split("/").filter(Boolean);
  const isLocaleAdmin =
    segments.length >= 2 &&
    SUPPORTED_LOCALES.includes(segments[0]) &&
    segments[1] === "admin";
  const isDirectAdmin = pathname.startsWith("/admin");

  const isAdminRoute = isDirectAdmin || isLocaleAdmin;

  // Identify Login routes to prevent infinite redirect loops
  const isLoginRoute =
    pathname.endsWith("/admin/login") || pathname === "/admin/login";

  // 3️⃣ 🛡️ Protect CMS / Admin Routes
  if (isAdminRoute && !isLoginRoute) {
    const adminCookie = request.cookies.get(ADMIN_AUTH_COOKIE);
    const isAuthenticated = adminCookie?.value === "true";

    if (!isAuthenticated) {
      // Determine language prefix for login redirect
      const currentLocale = SUPPORTED_LOCALES.includes(segments[0])
        ? segments[0]
        : "ar";
      const loginUrl = new URL(`/${currentLocale}/admin/login`, request.url);
      const targetPath = `${pathname}${search}`;
      loginUrl.searchParams.set("redirect", targetPath);

      return NextResponse.redirect(loginUrl);
    }
  }

  // 4️⃣ 🔒 Create Response & Inject Security Headers
  const response = NextResponse.next();

  if (isAdminRoute) {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }

  return response;
}

// 🚀 Matcher to capture root admin AND localized language routes (/ar/admin, /fr/admin, etc.)
export const config = {
  matcher: [
    "/admin/:path*",
    "/:lang(ar|fr|en|es)/admin/:path*",
  ],
};