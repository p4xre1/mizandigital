// functions/api/help/chat.js  →  POST /api/help/chat
//
// مساعد الموقع: يشرح كيف تستعمل ميزان الرقمية من محتواه فقط.
// - للمستخدمين المسجّلين فقط (رمز Supabase في Authorization).
// - حصة يومية لكل مستخدم (DAILY_LIMIT)، وحد إضافي لكل IP ضد الإغراق.
// - العربية فقط: أي سؤال غير عربي يتوقف برسالة واضحة دون إجابة.
// - لا يقدم استشارة قانونية في حالات فردية (shared/help/guardrails.js).
// - الرد حالياً من الاسترجاع فقط بلا نموذج لغوي، فلا يحتاج أي مفتاح API.
//
// Body:  { "message": "..." }   Header: Authorization: Bearer <access_token>
// Reply: { "mode": "answer" | "refused" | "not_found" | "unsupported_language",
//          "answer": "...", "sources": [{title, url}], "quota": {limit, remaining} }

import { checkRateLimit, getClientIp, jsonResponse, readJsonBody, tooManyRequests } from "../../_shared/guard.js"
import { inspectUserText } from "../../_shared/payloadGuard.js"
import { requireUser } from "../../_shared/auth.js"
import { answerQuestion } from "../../../shared/help/answer.js"
import { detectLanguage, UNSUPPORTED_LANGUAGE_ANSWER } from "../../../shared/help/language.js"

/** حد الـIP ضد الإغراق (يحمي من تعدد الحسابات من عنوان واحد). */
const IP_LIMIT = 20
const IP_WINDOW_SECONDS = 600
/** الحصة اليومية لكل مستخدم مسجّل: عدّل هذا الرقم عند الحاجة. */
const DAILY_LIMIT = 20
const DAY_SECONDS = 86400
/** أقصى طول لسؤال واحد. */
const MAX_MESSAGE_CHARS = 500
/** أقصى حجم لجسم الطلب بالبايت. */
const MAX_BODY_BYTES = 4096

const SAFE_HEADERS = { "Cache-Control": "no-store" }

function json(body, status = 200) {
  return jsonResponse(body, status, SAFE_HEADERS)
}

export async function onRequestPost({ request, env }) {
  // 1) حد الـIP أولاً، فهو أرخص فحص.
  const ip = getClientIp(request)
  const ipRate = await checkRateLimit({
    kv: env?.RATE_LIMIT_KV,
    bucket: "help-chat-ip",
    key: ip,
    limit: IP_LIMIT,
    windowSeconds: IP_WINDOW_SECONDS,
  })
  if (!ipRate.allowed) return tooManyRequests(ipRate.retryAfterSeconds)

  // 2) تسجيل الدخول إلزامي.
  let user
  try {
    user = await requireUser(request, env)
  } catch {
    return json({ error: "service_unavailable" }, 503)
  }
  if (!user) return json({ error: "auth_required" }, 401)

  // 3) التحقق من الجسم.
  const parsed = await readJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status)

  const raw = parsed.body?.message
  if (typeof raw !== "string") return json({ error: "invalid_message" }, 400)
  // نفحص الطول الخام قبل التطهير، لأن التطهير يقصّ النص بصمت ولا يُعيد خطأ الطول.
  if (raw.length > MAX_MESSAGE_CHARS) return json({ error: "message:too_long" }, 400)

  const checked = inspectUserText(raw, { field: "message", maxLength: MAX_MESSAGE_CHARS, minLength: 2 })
  if (!checked.ok) {
    if (checked.code.endsWith("too_short")) return json({ error: checked.code }, 400)
    // حقن أو سبام: رفض عام بلا كشف سبب الاكتشاف، ولا يُستهلك منه شيء من الحصة.
    return json({
      mode: "refused",
      answer: "لا أستطيع معالجة هذا الطلب. اكتب سؤالك عن استعمال الموقع أو محتواه.",
      sources: [],
    })
  }

  // 4) الحصة اليومية للمستخدم. تُحتسب كل رسالة صالحة، حتى المرفوضة لغوياً،
  // كي لا يصبح الرفض وسيلة لتجربة لا نهائية.
  const quotaRate = await checkRateLimit({
    kv: env?.RATE_LIMIT_KV,
    bucket: "help-chat-daily",
    key: user.id,
    limit: DAILY_LIMIT,
    windowSeconds: DAY_SECONDS,
  })
  const quota = { limit: DAILY_LIMIT, remaining: quotaRate.remaining }
  if (!quotaRate.allowed) {
    return json({ error: "daily_limit_reached", quota: { limit: DAILY_LIMIT, remaining: 0 } }, 429)
  }

  // 5) العربية فقط.
  if (detectLanguage(checked.value) === "other") {
    return json({ mode: "unsupported_language", answer: UNSUPPORTED_LANGUAGE_ANSWER, sources: [], quota })
  }

  // 6) الجواب من محتوى الموقع.
  return json({ ...answerQuestion(checked.value), quota })
}
