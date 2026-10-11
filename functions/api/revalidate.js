// functions/api/revalidate.js
//
// نقطة «أعد البناء» — يجعل نشر المحتوى في CMS يصل إلى الموقع خلال دقائق.
//
// ── الفكرة ───────────────────────────────────────────────────────────────────
// الموقع ثابت: صفحات المحتوى وخريطة الموقع تُولَّد وقت البناء. لذلك النشر في
// لوحة التحكم لا يظهر وحده؛ يحتاج أحد أمرين:
//   1) طبقة وقت-الطلب: functions/sitemap.xml.js + contentFallback في
//      functions/[[path]].js — تعمل بلا أي إعداد، وتُغطّي الرابط والخريطة
//      فوراً، لكن الصفحة تُبنى في المتصفح لا في ملف ثابت.
//   2) إعادة بناء كاملة: فيصبح للرابط ملف ثابت (الأفضل للفهرسة)، وهنا تأتي
//      هذه النقطة: Supabase Database Webhook (أو أي منادٍ) يناديها عند
//      النشر/التعديل، فتنادي Deploy Hook في Cloudflare Pages.
// الطبقتان مكمّلتان لا متعارضتان: (1) تسدّ النافذة، و(2) تُثبّت النتيجة.
//
// ── الإعداد (مرة واحدة، في لوحة Cloudflare وSupabase) ───────────────────────
//   Cloudflare Pages → Settings → Environment variables:
//     REVALIDATE_SECRET   = نصّ عشوائي طويل (سرّ المناداة)
//     CF_DEPLOY_HOOK_URL  = رابط Deploy Hook (Settings → Builds & deployments
//                           → Deploy hooks → Add)
//   Supabase → Database → Webhooks → Create:
//     Table: articles / news / pdf_summaries / laws / lexicon_terms / seminars
//            / faculties (واحد لكل جدول)
//     Events: Insert, Update
//     Type: HTTP Request → POST
//     URL: https://www.mizan.page/api/revalidate?secret=<REVALIDATE_SECRET>
//     (أو الترويسة: Authorization: Bearer <REVALIDATE_SECRET>)
//
// ── الأمان ───────────────────────────────────────────────────────────────────
// لا سرّ افتراضي في الكود: بلا REVALIDATE_SECRET مضبوطاً تُرجع النقطة 503 ولا
// تنفّذ شيئاً. المقارنة بزمن ثابت، وتحديد معدل (KV عند توفره، وإلا ذاكرة
// العامل) حتى لا يتحول السرّ المسرَّب إلى بناء لا نهائي. والردّ لا يكشف أي
// إعداد داخلي — لا رابط الـhook ولا قيمته.

import { checkRateLimit, getClientIp, jsonResponse, tooManyRequests } from "../_shared/guard.js";

const RATE_LIMIT = 6;
const RATE_WINDOW_SECONDS = 300;

/** مقارنة بزمن ثابت (لا تُقصي عند أول حرف مختلف). */
function safeEqual(a, b) {
  const left = String(a ?? "");
  const right = String(b ?? "");
  if (!left || !right || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

function secretFrom(request, url) {
  const header = request.headers.get("Authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  return bearer || url.searchParams.get("secret") || request.headers.get("X-Revalidate-Secret") || "";
}

function hookUrl(env) {
  return String(env.CF_DEPLOY_HOOK_URL || env.CLOUDFLARE_DEPLOY_HOOK_URL || "").trim();
}

async function handle(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const secret = String(env.REVALIDATE_SECRET || "");
  if (!secret) {
    return jsonResponse(
      {
        ok: false,
        error: "not_configured",
        message:
          "REVALIDATE_SECRET is not set. Add REVALIDATE_SECRET and CF_DEPLOY_HOOK_URL in Cloudflare Pages → Settings → Environment variables.",
      },
      503,
    );
  }

  if (!safeEqual(secretFrom(request, url), secret)) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  const limited = await checkRateLimit({
    kv: env.RATE_LIMIT_KV,
    bucket: "revalidate",
    key: getClientIp(request),
    limit: RATE_LIMIT,
    windowSeconds: RATE_WINDOW_SECONDS,
  });
  if (!limited.allowed) return tooManyRequests(limited.retryAfterSeconds);

  const hook = hookUrl(env);
  const dryRun = url.searchParams.get("dry") === "1" || !hook;

  if (dryRun) {
    return jsonResponse({
      ok: true,
      dryRun: true,
      hookConfigured: Boolean(hook),
      message: hook
        ? "Dry run — no rebuild triggered. Remove ?dry=1 to trigger."
        : "CF_DEPLOY_HOOK_URL is not set — nothing to trigger. The dynamic sitemap and the request-time content fallback already serve this content in the meantime.",
    });
  }

  try {
    const response = await fetch(hook, { method: "POST" });
    if (!response.ok) {
      console.error(`[revalidate] deploy hook HTTP ${response.status}`);
      return jsonResponse({ ok: false, error: "hook_failed" }, 502);
    }
  } catch (error) {
    console.error(`[revalidate] deploy hook error: ${String(error?.message || error).slice(0, 120)}`);
    return jsonResponse({ ok: false, error: "hook_failed" }, 502);
  }

  return jsonResponse({ ok: true, triggered: true, message: "Rebuild triggered." }, 202);
}

export async function onRequestPost(context) {
  return handle(context);
}

// GET مسموح فقط بالوضع الجاف (تشخيص الإعداد بلا إطلاق بناء): /api/revalidate?dry=1&secret=…
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  if (url.searchParams.get("dry") !== "1") {
    return jsonResponse({ ok: false, error: "method_not_allowed", hint: "Use POST, or GET with ?dry=1." }, 405, {
      Allow: "POST",
    });
  }
  return handle(context);
}
