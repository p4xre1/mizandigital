// functions/api/help/chat.js  →  POST /api/help/chat
//
// مساعد الموقع: يشرح كيف تستعمل ميزان الرقمية من محتواه فقط.
//
// ترتيب الفحوص (كل فشل يُرفض في مكانه، ولا يتقدم الطلب):
//   1) المصدر: Sec-Fetch-Site و Origin يجب أن يكونا من الموقع نفسه
//   2) نوع المحتوى: application/json فقط
//   3) تخزين الحدود المشترك (RATE_LIMIT_KV) متوفر، وإلا 503 (fail closed)
//   4) حد IP ضد الإغراق
//   5) رمز Supabase صالح، والحساب "active" (غير موقوف أو قيد الحذف)
//   6) جسم الطلب بحد صارم للبايتات، كتدفق، ثم UTF-8 صالح
//   7) طول النص، ثم رفض أحرف التحكم
//   8) تطبيع Unicode ثم فحص الحقن والحمولات المموّهة والشيفرة (inspectUserText)
//   9) إعدادات المشرف من الخادم (service role)، وإن تعذّرت فـ503
//  10) حد الاندفاع (6 في الدقيقة) ثم الحصة اليومية (20)
//  11) العربية فقط
//  12) الجواب، ثم فحص الخرج قبل الإرسال
//
// Body:  { "message": "..." }   Header: Authorization: Bearer <access_token>
// Reply: { "mode": ..., "answer": "...", "sources": [{title, url}], "quota": {limit, remaining}? }
// كل رد يحمل ترويسات أمنية و X-Request-Id. لا يُكشف أي سبب داخلي للرفض.

import { checkRateLimit, getClientIp, jsonResponse, tooManyRequests } from "../../_shared/guard.js"
import { CONTROL_CHARS_RE, inspectUserText } from "../../_shared/payloadGuard.js"
import { requireUser } from "../../_shared/auth.js"
import { GuardConfigError, loadHelpConfig } from "../../_shared/helpConfig.js"
import {
  SECURITY_HEADERS,
  checkOrigin,
  logSecurityEvent,
  readBoundedText,
  sanitizeAnswerResult,
  shortHash,
} from "../../_shared/helpSecurity.js"
import { answerQuestion } from "../../../shared/help/answer.js"
import { screenMessage } from "../../../shared/help/guardrails.js"
import { detectLanguage, UNSUPPORTED_LANGUAGE_ANSWER } from "../../../shared/help/language.js"
import { DEFAULT_MESSAGES } from "../../../shared/help/cms.js"

/** حد الـIP ضد الإغراق (يحمي من تعدد الحسابات من عنوان واحد). */
const IP_LIMIT = 20
const IP_WINDOW_SECONDS = 600
/** حد الاندفاع لكل مستخدم: يمنع إرسال عشرات الأسئلة في ثوانٍ (سكربتات). */
const BURST_LIMIT = 6
const BURST_WINDOW_SECONDS = 60
/** الحصة اليومية لكل مستخدم مسجّل. */
const DAILY_LIMIT = 20
const DAY_SECONDS = 86400
/** أقصى طول لسؤال واحد. */
const MAX_MESSAGE_CHARS = 500
/** أقصى حجم لجسم الطلب بالبايت. */
const MAX_BODY_BYTES = 4096

const CONTROL_RE = new RegExp(CONTROL_CHARS_RE.source)

export async function onRequestPost({ request, env }) {
  const requestId = crypto.randomUUID()
  const reply = (body, status = 200, extra = {}) =>
    jsonResponse(body, status, { ...SECURITY_HEADERS, "X-Request-Id": requestId, ...extra })

  // 1) المصدر
  const source = checkOrigin(request, env)
  if (!source.ok) {
    logSecurityEvent("forbidden_origin", { requestId, reason: source.reason })
    return reply({ error: "forbidden_origin" }, 403)
  }

  // 2) نوع المحتوى
  const contentType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase()
  if (contentType !== "application/json") return reply({ error: "unsupported_media_type" }, 415)

  // 3) الحدود تحتاج تخزيناً مشتركاً بين العُقد. بدونه لا نقبل الطلبات.
  const kv = env?.RATE_LIMIT_KV
  if (!kv && env?.HELP_ALLOW_MEMORY_LIMITER !== "1") {
    logSecurityEvent("limiter_unbound", { requestId })
    return reply({ error: "service_misconfigured" }, 503)
  }

  // 4) حد IP
  const ip = getClientIp(request)
  const ipRate = await checkRateLimit({ kv, bucket: "help-chat-ip", key: ip, limit: IP_LIMIT, windowSeconds: IP_WINDOW_SECONDS })
  if (!ipRate.allowed) {
    logSecurityEvent("ip_rate_limited", { requestId })
    return tooManyRequests(ipRate.retryAfterSeconds)
  }

  // 5) تسجيل الدخول وحالة الحساب
  let user
  try {
    user = await requireUser(request, env)
  } catch {
    return reply({ error: "service_unavailable" }, 503)
  }
  if (!user) return reply({ error: "auth_required" }, 401)
  const userHash = await shortHash(user.id)

  const account = await checkAccountStatus(user, env)
  if (!account.ok) {
    logSecurityEvent(account.event, { requestId, userHash })
    return reply({ error: account.error }, account.status)
  }

  // 6) الجسم
  const body = await readBoundedText(request, MAX_BODY_BYTES)
  if (!body.ok) return reply({ error: body.error }, body.status)
  let parsed
  try {
    parsed = JSON.parse(body.text)
  } catch {
    return reply({ error: "invalid_json" }, 400)
  }

  // 7) الحقل والطول والأحرف
  const raw = parsed?.message
  if (typeof raw !== "string") return reply({ error: "invalid_message" }, 400)
  if (raw.length > MAX_MESSAGE_CHARS) return reply({ error: "message:too_long" }, 400)
  if (CONTROL_RE.test(raw)) {
    logSecurityEvent("control_characters", { requestId, userHash })
    return reply({ error: "invalid_characters" }, 400)
  }

  // 8) التطبيع والفحص الأولي
  const checked = inspectUserText(raw, { field: "message", maxLength: MAX_MESSAGE_CHARS, minLength: 2 })
  if (!checked.ok) {
    if (checked.code.endsWith("too_short")) return reply({ error: checked.code }, 400)
    logSecurityEvent("blocked", { requestId, userHash, reason: checked.code })
    return reply({ mode: "blocked", answer: DEFAULT_MESSAGES.blocked, sources: [] })
  }

  // 10) حد الاندفاع (قبل تحميل الإعدادات حتى لا يُستنزف قاعدة البيانات)
  const burst = await checkRateLimit({
    kv,
    bucket: "help-chat-burst",
    key: user.id,
    limit: BURST_LIMIT,
    windowSeconds: BURST_WINDOW_SECONDS,
  })
  if (!burst.allowed) {
    logSecurityEvent("burst_limited", { requestId, userHash })
    return reply({ error: "too_fast" }, 429, { "Retry-After": String(burst.retryAfterSeconds) })
  }

  // 9) إعدادات المشرف
  let config
  try {
    config = await loadHelpConfig(env)
  } catch (error) {
    const code = error instanceof GuardConfigError ? error.code : "unknown"
    logSecurityEvent("guard_config_unavailable", { requestId, code })
    return reply({ error: "guard_config_unavailable" }, 503)
  }

  if (!config.settings.enabled) {
    return reply({ mode: "disabled", answer: config.settings.messages.disabled, sources: [] })
  }

  // 10a) فحص الحقن والحمولات المموّهة قبل بوابة اللغة. الرفض هنا لا يستهلك الحصة (كالتحقق الأولي).
  const screen = screenMessage(checked.value)
  if (screen.block) {
    logSecurityEvent("blocked", { requestId, userHash, reason: screen.reason ?? "unknown" })
    return reply({ mode: "blocked", answer: config.settings.messages.blocked, sources: [] })
  }

  // 10b) الحصة اليومية. تُحتسب كل رسالة صالحة، حتى المرفوضة.
  const quotaRate = await checkRateLimit({ kv, bucket: "help-chat-daily", key: user.id, limit: DAILY_LIMIT, windowSeconds: DAY_SECONDS })
  const quota = { limit: DAILY_LIMIT, remaining: quotaRate.remaining }
  if (!quotaRate.allowed) {
    return reply({ error: "daily_limit_reached", quota: { limit: DAILY_LIMIT, remaining: 0 } }, 429)
  }

  // 11) العربية فقط
  if (detectLanguage(checked.value) === "other") {
    return reply({ mode: "unsupported_language", answer: UNSUPPORTED_LANGUAGE_ANSWER, sources: [], quota })
  }

  // 12) الجواب والفحص الأخير للخرج
  const result = answerQuestion(checked.value, { customEntries: config.customEntries, settings: config.settings })
  if (result.mode === "blocked" || result.mode === "refused" || result.mode === "out_of_topic") {
    logSecurityEvent("answer_refused", { requestId, userHash, mode: result.mode, reason: result.reason ?? "unknown" })
  }
  const safe = sanitizeAnswerResult(result, DEFAULT_MESSAGES.blocked)
  if (safe.reason === "unsafe_output") {
    logSecurityEvent("unsafe_output_blocked", { requestId, userHash })
  }
  const { reason: _internal, ...publicResult } = safe
  return reply({ ...publicResult, quota })
}

/**
 * الحساب يجب أن يكون "active". القراءة بمفتاح المستخدم نفسه، فتمر عبر RLS
 * ولا تكشف إلا صفّه. أي فشل في القراءة يرفض الطلب.
 * @returns {Promise<{ok: true} | {ok: false, status: number, error: string, event: string}>}
 */
async function checkAccountStatus(user, env) {
  const supabaseUrl = env?.SUPABASE_URL || env?.VITE_SUPABASE_URL
  const anonKey = env?.SUPABASE_ANON_KEY || env?.VITE_SUPABASE_ANON_KEY
  try {
    const res = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=account_status`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${user.token}` }, signal: AbortSignal.timeout(2000) },
    )
    if (!res.ok) return { ok: false, status: 503, error: "service_unavailable", event: "profile_lookup_failed" }
    const rows = await res.json()
    const status = Array.isArray(rows) ? rows[0]?.account_status : undefined
    if (status === "active") return { ok: true }
    return { ok: false, status: 403, error: "account_restricted", event: "account_restricted" }
  } catch {
    return { ok: false, status: 503, error: "service_unavailable", event: "profile_lookup_failed" }
  }
}
