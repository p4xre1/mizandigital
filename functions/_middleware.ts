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
  headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https:; frame-src https:; frame-ancestors 'self';");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return headers;
}

export async function onRequest(context: { request: Request; next: Next }) {
  const response = await context.next();
  const headers = buildSecurityHeaders();
  const userAgent = context.request.headers.get("user-agent") || "";

  for (const [key, value] of headers.entries()) {
    response.headers.set(key, value);
  }

  if (AI_CRAWLERS.some((crawler) => userAgent.includes(crawler))) {
    response.headers.set("X-Robots-Tag", "index, follow");
  }

  return response;
}
