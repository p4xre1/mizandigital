import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const GSC_SERVICE_ACCOUNT_KEY = Deno.env.get("GSC_SERVICE_ACCOUNT_KEY")
const GSC_SITE_URL = Deno.env.get("GSC_SITE_URL")

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson)
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: "RS256", typ: "JWT" }
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

  const unsigned = `${enc(header)}.${enc(claims)}`

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "")
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

  const jwt = `${unsigned}.${sigB64}`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  if (!tokenRes.ok) {
    throw new Error(`فشل الحصول على رمز الدخول من Google: ${await tokenRes.text()}`)
  }
  const tokenJson = await tokenRes.json()
  return tokenJson.access_token as string
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const { url } = await req.json()
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url مطلوب" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    if (!GSC_SERVICE_ACCOUNT_KEY || !GSC_SITE_URL) {
      return new Response(JSON.stringify({ notConfigured: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const accessToken = await getGoogleAccessToken(GSC_SERVICE_ACCOUNT_KEY)

    const inspectRes = await fetch(
      "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inspectionUrl: url, siteUrl: GSC_SITE_URL }),
      }
    )

    if (!inspectRes.ok) {
      const text = await inspectRes.text()
      return new Response(JSON.stringify({ error: `Search Console API: ${text}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const inspectJson = await inspectRes.json()
    const result = inspectJson.inspectionResult?.indexStatusResult
    const coverageState: string | undefined = result?.coverageState
    const isIndexed = coverageState ? /submitted and indexed|indexed/i.test(coverageState) : null
    const lastCrawlTime: string | undefined = result?.lastCrawlTime

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    await supabaseAdmin.from("index_status").upsert({
      url,
      is_indexed: isIndexed,
      coverage_state: coverageState ?? null,
      last_crawl_time: lastCrawlTime ?? null,
      checked_at: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ url, is_indexed: isIndexed, coverage_state: coverageState, last_crawl_time: lastCrawlTime }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})