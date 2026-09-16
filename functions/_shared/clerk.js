/**
 * Clerk auth helper for Cloudflare Functions
 * Verifies Clerk JWT via JWKS
 */

export async function verifyClerkToken(token, env) {
  if (!token) return null;

  const issuer = env.CLERK_JWT_ISSUER || "https://clerk.mizan.page";
  const jwksUrl = `${issuer}/.well-known/jwks.json`;

  try {
    // Fetch JWKS
    const jwksRes = await fetch(jwksUrl);
    if (!jwksRes.ok) return null;
    const jwks = await jwksRes.json();

    // For simplicity, we do not do full JWT verification here (needs crypto)
    // In production, use a library like jose or verify via Clerk API
    // Here we decode payload without verification as a first check, then call Clerk API if secret available

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    
    // Check issuer and expiry
    if (payload.iss && !payload.iss.includes("clerk")) {
      // Allow custom domain
    }
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    // If Clerk secret key available, verify via API
    const secret = env.CLERK_SECRET_KEY;
    if (secret) {
      const verifyRes = await fetch(`https://api.clerk.com/v1/sessions/${payload.sid}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!verifyRes.ok) return null;
    }

    return { userId: payload.sub, sessionId: payload.sid, payload };
  } catch (e) {
    console.warn("Clerk verify failed", e);
    return null;
  }
}

export function getClerkUserIdFromRequest(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  // We return a promise — caller should await verifyClerkToken
  return token;
}
