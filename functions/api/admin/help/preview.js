// functions/api/admin/help/preview.js
//
// [AI-SEC] معاينة المساعد للمشرف تُنفَّذ على الخادم بنفس خط المعالجة الذي يراه الزائر.
// قبل ذلك كانت الواجهة تستورد runPipeline مباشرة، فيُشحن محرّك الفحص وقواعده في الـchunk
// الإداري. الآن تبقى القواعد على الخادم، والمشرف يرى النتيجة فقط.
//
// POST { question: string }   (2 إلى 300 حرف)
// الرد: 200 { mode, answer, sources, reason? }
// الحقل reason رمز داخلي يظهر للمشرف فقط؛ نقطة الزائر /api/help/chat لا تُرجعه.

import { requireAdmin, jsonResponse } from "../../../_shared/auth.js"
import { checkRateLimit, tooManyRequests } from "../../../_shared/guard.js"
import { readBoundedJson } from "../../../_shared/bodyLimit.js"
import { loadHelpConfig } from "../../../_shared/helpConfig.js"
import { logServerError } from "../../../_shared/errors.js"
import { runPipeline } from "../../../../shared/help/pipeline.js"

const MAX_BODY_BYTES = 4 * 1024
const MAX_QUESTION_CHARS = 300
const RATE_LIMIT = 120
const RATE_WINDOW_SECONDS = 600

export async function onRequestPost({ request, env }) {
  let admin
  try {
    admin = await requireAdmin(request, env || {})
  } catch (err) {
    logServerError("help.preview.auth", err)
    return jsonResponse({ error: "service_unavailable" }, 503)
  }
  if (!admin) return jsonResponse({ error: "unauthorized" }, 401)

  const rate = await checkRateLimit({
    kv: env?.RATE_LIMIT_KV,
    bucket: "admin-help-preview",
    key: admin.id ?? "admin",
    limit: RATE_LIMIT,
    windowSeconds: RATE_WINDOW_SECONDS,
  })
  if (!rate.allowed) return tooManyRequests(rate.retryAfterSeconds || 60)

  const parsed = await readBoundedJson(request, MAX_BODY_BYTES)
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, parsed.status === 413 ? 413 : 400)
  const question = typeof parsed.data?.question === "string" ? parsed.data.question.trim() : ""
  if (question.length < 2 || question.length > MAX_QUESTION_CHARS) {
    return jsonResponse({ error: "invalid_question" }, 400)
  }

  let config
  try {
    config = await loadHelpConfig(env || {})
  } catch (err) {
    logServerError("help.preview.config", err)
    return jsonResponse({ error: "service_unavailable" }, 503)
  }

  const result = runPipeline(question, {
    customEntries: config.customEntries,
    settings: config.settings,
  })
  return jsonResponse(result, 200)
}
