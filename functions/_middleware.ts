type Next = () => Response | Promise<Response>;

const AI_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Gemini",
  "PerplexityBot",
  "Grok",
  "xAI",
];

function buildSecurityHeaders() {
  const headers = new Headers();

  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.googletagmanager.com https://*.adtrafficquality.google",
      "connect-src 'self' https: wss: https://*.supabase.co https://challenges.cloudflare.com https://*.adtrafficquality.google",
      "frame-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.googlesyndication.com https://www.googletagmanager.com",
      "frame-ancestors 'self'",
    ].join("; ")
  );

  headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return headers;
}

function isPrivatePath(pathname: string) {
  return /^(?:\/(?:ar|fr|en|es))?\/(?:admin|login|register|profile|writer)(?:\/|$)/i.test(
    pathname
  );
}

export async function onRequest(context: {
  request: Request;
  next: Next;
}) {
  const response = await context.next();
  const headers = buildSecurityHeaders();
  const userAgent = context.request.headers.get("user-agent") || "";
  const pathname = new URL(context.request.url).pathname;

  for (const [key, value] of headers.entries()) {
    response.headers.set(key, value);
  }

  if (isPrivatePath(pathname)) {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet"
    );
  } else if (AI_CRAWLERS.some((crawler) => userAgent.includes(crawler))) {
    response.headers.set("X-Robots-Tag", "index, follow");
  }

  return response;
}