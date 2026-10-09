// functions/api/admin/help/validate.js
//
// [AI-SEC] التحقق من محتوى المساعد قبل الحفظ يتم على الخادم وليس في الحزمة المتصفحية.
// السبب: قواعد الفحص (guardrails.js) كانت تُشحن في الـchunk الإداري، فيقرؤها أي زائر
// يعرف رابط الملف. هنا تبقى القواعد على الخادم، ويستدعيها المشرف عبر هذه النقطة.
//
// POST { kind: "qa", draft: { question, answer, keywords?, sourceUrl? } }
// POST { kind: "settings", draft: { messages, blockedPhrases?, offTopicTerms? } }
// الرد: 200 { ok: true, error: string | null }  — الخطأ هنا خطأ مدخل وليس خطأ خادم.
// الرفض: 401 بلا رمز صالح لمشرف، 413 لجسم كبير، 405 لغير POST، 429 عند تجاوز الحد.

import { requireAdmin, jsonResponse } from "../../../_shared/auth.js"
import { checkRateLimit, tooManyRequests } from "../../../_shared/guard.js"
import { readBoundedJson } from "../../../_shared/bodyLimit.js"
import { logServerError } from "../../../_shared/errors.js"
import { validateQaDraft, validateSettingsDraft } from "../../../../shared/help/cms.js"

const MAX_BODY_BYTES = 32 * 1024
const RATE_LIMIT = 60
const RATE_WINDOW_SECONDS = 600

export async function onRequestPost({ request, env }) {
  let admin
  try {
    admin = await requireAdmin(request, env || {})
  } catch (err) {
    logServerError("help.validate.auth", err)
    return jsonResponse({ error: "service_unavailable" }, 503)
  }
  if (!admin) return jsonResponse({ error: "unauthorized" }, 401)

  const rate = await checkRateLimit({
    kv: env?.RATE_LIMIT_KV,
    bucket: "admin-help-validate",
    key: admin.id ?? "admin",
    limit: RATE_LIMIT,
    windowSeconds: RATE_WINDOW_SECONDS,
  })
  if (!rate.allowed) return tooManyRequests(rate.retryAfterSeconds || 60)

  const parsed = await readBoundedJson(request, MAX_BODY_BYTES)
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, parsed.status === 413 ? 413 : 400)
  const body = parsed.data
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "invalid_body" }, 400)
  }

  const draft = body.draft && typeof body.draft === "object" ? body.draft : {}
  if (body.kind === "qa") {
    const error = validateQaDraft({
      question: typeof draft.question === "string" ? draft.question : "",
      answer: typeof draft.answer === "string" ? draft.answer : "",
      keywords: Array.isArray(draft.keywords) ? draft.keywords.filter((k) => typeof k === "string") : [],
      sourceUrl: typeof draft.sourceUrl === "string" ? draft.sourceUrl : "",
    })
    return jsonResponse({ ok: true, error }, 200)
  }
  if (body.kind === "settings") {
    const messages = draft.messages && typeof draft.messages === "object" ? draft.messages : {}
    const cleanMessages = {}
    for (const [key, value] of Object.entries(messages)) {
      if (typeof value === "string") cleanMessages[key] = value
    }
    const error = validateSettingsDraft({
      messages: cleanMessages,
      blockedPhrases: Array.isArray(draft.blockedPhrases) ? draft.blockedPhrases.filter((t) => typeof t === "string") : [],
      offTopicTerms: Array.isArray(draft.offTopicTerms) ? draft.offTopicTerms.filter((t) => typeof t === "string") : [],
    })
    return jsonResponse({ ok: true, error }, 200)
  }
  return jsonResponse({ error: "unknown_kind" }, 400)
}
