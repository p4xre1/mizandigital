import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * onboarding (Edge Function)
 * -----------------------------------------------------------------------
 * الغرض: استبيان الترحيب (3 أسئلة) اللي كيبان مرة وحدة بعد أول تسجيل دخول.
 *
 * بعد إزالة Clerk صار Supabase Auth هو مزوّد الهوية الوحيد، والتحقق من الجلسة
 * كيتم بطريقة مدعومة في كل مشاريع Supabase (HS256 بالمفتاح السري أو مفاتيح
 * غير متماثلة مع JWKS): كنرسلو access_token ديال المستخدم إلى
 * `auth.getUser()` عبر عميل service_role، وGoTrue كيتحقق من التوقيع والصلاحية
 * وكيرجع لنا المستخدم الحقيقي. بلا هاد التحقق ما كنستعملو service_role أبداً.
 *
 * التخزين: onboarding_responses.user_id (uuid → auth.users). العمود القديم
 * clerk_user_id بقا nullable للتوافق مع الصفوف التاريخية (شوف الترحيل
 * 20260924000000_supabase_auth_profiles_and_ranks.sql).
 *
 * GET  -> { completed: boolean }
 * POST -> يسجّل { user_type, referral_source, interests }
 *
 * متغيرات البيئة: SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY (موجودان تلقائياً
 * في Supabase Edge Functions). لا حاجة لأي secret خاص بمزوّد خارجي.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

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

/** يتحقق من Supabase access_token ويرجّع معرّف المستخدم (uuid). */
async function verifySupabaseUser(authHeader: string | null): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("رمز الدخول (Authorization) مفقود")
  }
  const token = authHeader.slice("Bearer ".length).trim()
  if (!token) throw new Error("رمز الدخول فارغ")

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user?.id) {
    throw new Error("جلسة غير صالحة أو منتهية")
  }
  return data.user.id
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const userId = await verifySupabaseUser(req.headers.get("Authorization"))
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("onboarding_responses")
        .select("id")
        .eq("user_id", userId)
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
          user_id: userId,
          user_type: userType,
          referral_source: referralSource.trim().slice(0, 200),
          interests,
        },
        { onConflict: "user_id" }
      )

      if (error) throw error
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: "Method Not Allowed" }, 405)
  } catch (err) {
    return jsonResponse({ error: String(err instanceof Error ? err.message : err) }, 401)
  }
})
