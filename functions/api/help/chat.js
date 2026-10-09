// functions/api/help/chat.js  →  POST /api/help/chat
//
// مساعد الموقع: يشرح كيف تستعمل ميزان الرقمية من محتواها فقط.
// لا يقدم استشارة قانونية في حالات فردية (انظر shared/help/guardrails.js).
// الرد حالياً من الاسترجاع فقط بلا نموذج لغوي، فلا يحتاج أي مفتاح API.
//
// Body:    { "message": "..." }
// Reply:   { "mode": "answer" | "refused" | "not_found", "answer": "...", "sources": [{title, url}] }

import { checkRateLimit, getClientIp, jsonResponse, readJsonBody, tooManyRequests } from "../../_shared/guard.js"
import { inspectUserText } from "../../_shared/payloadGuard.js"
import { answerQuestion } from "../../../shared/help/answer.js"

/** عدد الرسائل المسموح بها لكل IP داخل النافذة. */
const RATE_LIMIT = 20
const RATE_WINDOW_SECONDS = 600
/** أقصى طول لسؤال واحد. */
const MAX_MESSAGE_CHARS = 500
/** أقصى حجم لجسم الطلب بالبايت. */
const MAX_BODY_BYTES = 4096

const SAFE_HEADERS = { "Cache-Control": "no-store" }

export async function onRequestPost({ request, env }) {
  const ip = getClientIp(request)
  const rate = await checkRateLimit({
    kv: env?.RATE_LIMIT_KV,
    bucket: "help-chat",
    key: ip,
    limit: RATE_LIMIT,
    windowSeconds: RATE_WINDOW_SECONDS,
  })
  if (!rate.allowed) return tooManyRequests(rate.retryAfterSeconds)

  const parsed = await readJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, parsed.status, SAFE_HEADERS)

  const raw = parsed.body?.message
  if (typeof raw !== "string") {
    return jsonResponse({ error: "invalid_message" }, 400, SAFE_HEADERS)
  }

  // نفحص الطول الخام قبل التطهير، لأن التطهير يقصّ النص بصمت ولا يُعيد خطأ الطول.
  if (raw.length > MAX_MESSAGE_CHARS) {
    return jsonResponse({ error: "message:too_long" }, 400, SAFE_HEADERS)
  }

  const checked = inspectUserText(raw, { field: "message", maxLength: MAX_MESSAGE_CHARS, minLength: 2 })
  if (!checked.ok) {
    // طول خاطئ: خطأ صريح. حقن أو سبام: رفض عام بلا كشف سبب الاكتشاف.
    if (checked.code.endsWith("too_short") || checked.code.endsWith("too_long")) {
      return jsonResponse({ error: checked.code }, 400, SAFE_HEADERS)
    }
    return jsonResponse(
      {
        mode: "refused",
        answer: "لا أستطيع معالجة هذا الطلب. اكتب سؤالك عن استعمال الموقع أو محتواه.",
        sources: [],
      },
      200,
      SAFE_HEADERS,
    )
  }

  const result = answerQuestion(checked.value)
  return jsonResponse(result, 200, SAFE_HEADERS)
}
