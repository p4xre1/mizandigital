import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jose from "https://esm.sh/jose@5"

/**
 * onboarding (Edge Function)
 * -----------------------------------------------------------------------
 * الغرض: استبيان الترحيب (3 أسئلة) اللي كيبان مرة وحدة بعد أول تسجيل
 * دخول عبر Clerk. بما أن تسجيل الدخول العام كيمر عبر Clerk (وليس
 * Supabase Auth)، ما نقدروش نعتمدو على RLS المبنية على auth.uid() بشكل
 * مباشر — Supabase ما كيعرفش شكون هو المستخدم الموصول عبر Clerk.
 *
 * الحل: هاد الدالة كتاخد Clerk session token (JWT) من هيدر
 * Authorization، كتحقق من توقيعه بنفسها عبر JWKS ديال Clerk (بلا حاجة
 * لأي مكتبة Node ديال Clerk، وبلا حاجة لإعادة ضبط "Third-party auth"
 * فـ لوحة تحكم Supabase)، وبعد التحقق كتستعمل مفتاح service_role
 * (اللي كيتجاوز RLS) باش تقرا/تكتب فـ جدول onboarding_responses.
 * الفرونت إند (المتصفح) ما عندوش وصول مباشر لهاد الجدول أبداً.
 *
 * GET  -> كيرجع { completed: boolean } لمعرفة واش المستخدم كمّل الاستبيان
 * POST -> كيسجل الإجابات { user_type, referral_source, interests }
 *
 * متغيرات البيئة المطلوبة (تُضبط فـ لوحة تحكم Supabase → Edge Functions
 * → Secrets):
 *   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: موجودين تلقائياً.
 *   - CLERK_JWT_ISSUER: عنوان "Frontend API" ديال Clerk (يبان فـ لوحة
 *     تحكم Clerk → Configure → API Keys، أو هو نفسه النطاق اللي ضفناه
 *     فـ public/_headers، مثلاً: https://clerk.mizan.page أو
 *     https://xxxx.clerk.accounts.dev).
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// القيمة الافتراضية هنا مؤكدة فعلياً (JWKS كيرجع مفتاح حقيقي):
// https://clerk.mizan.page/.well-known/jwks.json
// نخلي CLERK_JWT_ISSUER قابل للتجاوز عبر secret فـ حالة تغيير النطاق
// مستقبلاً، لكن الدالة كتخدم بشكل صحيح حتى بلا ضبط الـ secret يدوياً.
const CLERK_JWT_ISSUER = Deno.env.get("CLERK_JWT_ISSUER") ?? "https://clerk.mizan.page"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })

const USER_TYPES = ["student", "teacher", "normal", "license", "master", "doctorate", "startup", "company"]
const INTERESTS = ["lexicon", "schools", "pdfs", "articles", "news", "events"]

let cachedJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null
function getJwks() {
  if (!CLERK_JWT_ISSUER) return null
  if (!cachedJwks) {
    cachedJwks = jose.createRemoteJWKSet(new URL(`${CLERK_JWT_ISSUER.replace(/\/$/, "")}/.well-known/jwks.json`))
  }
  return cachedJwks
}

/** يتحقق من توقيع Clerk session token ويرجّع معرّف المستخدم (sub). */
async function verifyClerkToken(authHeader: string | null): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("رمز الدخول (Authorization) مفقود")
  }
  if (!CLERK_JWT_ISSUER) {
    throw new Error("CLERK_JWT_ISSUER غير مضبوط فـ إعدادات الدالة")
  }
  const token = authHeader.slice("Bearer ".length)
  const jwks = getJwks()!
  const { payload } = await jose.jwtVerify(token, jwks, { issuer: CLERK_JWT_ISSUER })
  if (!payload.sub) throw new Error("رمز الدخول لا يحتوي على معرّف مستخدم")
  return payload.sub
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const clerkUserId = await verifyClerkToken(req.headers.get("Authorization"))
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("onboarding_responses")
        .select("id")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle()

      if (error) throw error
      return jsonResponse({ completed: Boolean(data) })
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null)
      const userType = body?.user_type
      const referralSource = body?.referral_source
      const interests = Array.isArray(body?.interests) ? body.interests : []

      if (typeof userType !== "string" || !USER_TYPES.includes(userType)) {
        return jsonResponse({ error: "user_type غير صالح" }, 400)
      }
      if (typeof referralSource !== "string" || !referralSource.trim()) {
        return jsonResponse({ error: "referral_source مطلوب" }, 400)
      }
      if (!interests.every((i: unknown) => typeof i === "string" && INTERESTS.includes(i))) {
        return jsonResponse({ error: "interests غير صالحة" }, 400)
      }

      const { error } = await supabaseAdmin.from("onboarding_responses").upsert(
        {
          clerk_user_id: clerkUserId,
          user_type: userType,
          referral_source: referralSource.trim().slice(0, 200),
          interests,
        },
        { onConflict: "clerk_user_id" }
      )

      if (error) throw error
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: "Method Not Allowed" }, 405)
  } catch (err) {
    return jsonResponse({ error: String(err instanceof Error ? err.message : err) }, 401)
  }
})
