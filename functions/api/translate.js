// functions/api/translate.js  →  POST /api/translate
//
// ─────────────────────────────────────────────────────────────────────────────
// وسيط ترجمة على نفس النطاق
// ─────────────────────────────────────────────────────────────────────────────
// بديل عن "Google Website Translator" الذي أوقفته Google نهائياً ابتداءً من
// 1 أكتوبر 2026. الأداة السابقة كانت تُحمّل
// translate.google.com/translate_a/element.js وتتحكم في <select> داخله؛ وهاد
// المسار مات. هنا الترجمة تصير عبر نداء API صريح بلا سكربت خارجي.
//
// لماذا وسيط بدل نداء المزوّدين من المتصفح مباشرة؟
//   1. CORS — بعض المزوّدين لا يرسل Access-Control-Allow-Origin.
//   2. حدود المعدل — تُحتسب لكل IP بدل كل زائر، فنحمي الحصة المجانية.
//   3. التخزين المؤقت — Cache API يخدم نفس المقال المترجم لكل الزوار.
//   4. CSP — يبقى connect-src 'self'، ولا نضيف أي نطاق خارجي للموقع.
//
// سلسلة المزوّدين (shared/i18n/providers.js): Google gtx → MyMemory → Lingva
// → LibreTranslate (اختياري). إن سقط مزوّد ينتقل الطلب للتالي تلقائياً.
//
// CONFIGURATION (كلها اختيارية — الأداة تعمل بلا أي مفتاح):
//   RATE_LIMIT_KV        → KV namespace لتحديد معدّل عالمي ودقيق
//   LIBRETRANSLATE_URL   → تفعيل LibreTranslate (يُضاف آخر السلسلة)
//   LIBRETRANSLATE_API_KEY
//   LINGVA_INSTANCES     → قائمة نسخ Lingva مفصولة بفواصل

import { checkRateLimit, getClientIp, jsonResponse, readJsonBody, tooManyRequests } from "../_shared/guard.js"
import { buildChunks, getProviders, splitChunkResult } from "../../shared/i18n/providers.js"

/** عدد الطلبات المسموح بها لكل IP داخل النافذة. */
const RATE_LIMIT = 60
const RATE_WINDOW_SECONDS = 600

/** أقصى عدد نصوص في الطلب الواحد. */
const MAX_TEXTS = 400
/** أقصى طول لنص واحد. */
const MAX_TEXT_CHARS = 8000

/** مهلة كل مزوّد. */
const PROVIDER_TIMEOUT_MS = 9000

/**
 * تحقق من كود اللغة. لا نستورد سجل اللغات (TypeScript) هنا، لكن الشكل
 * وحده يكفي لمنع حقن أي شيء في مسار/استعلام المزوّد.
 */
function isValidLangCode(value) {
  return typeof value === "string" && /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,8})*$/.test(value) && value.length <= 16
}

/** بصمة بسيطة للطلب كي نُخزّنه مؤقتاً بمفتاح واحد. */
async function requestFingerprint(target, source, texts) {
  const payload = `${target}|${source || "auto"}|${texts.join("\u0001")}`
  const bytes = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * ترجمة دفعة واحدة عبر سلسلة المزوّدين.
 * @returns {Promise<{text: string, provider: string} | null>}
 */
async function translateChunk(providers, chunk, source, target) {
  const text = chunk.join("\n")

  for (const provider of providers) {
    let built
    try {
      built = provider.buildRequest(text, source, target)
    } catch {
      continue
    }
    if (!built || !built.url) continue

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)
    try {
      const response = await fetch(built.url, {
        ...(built.init || {}),
        signal: controller.signal,
        headers: {
          "User-Agent": "mizan-digital-translate/1.0",
          Accept: "application/json, text/plain, */*",
          ...(built.init && built.init.headers ? built.init.headers : {}),
        },
      })
      if (!response.ok) continue

      const contentType = response.headers.get("content-type") || ""
      const raw = await response.text()
      let data
      try {
        data = JSON.parse(raw)
      } catch {
        continue
      }
      // بعض المزوّدين يُرجعون JSON صالحاً لكنه خطأ مغلف
      if (contentType && !contentType.includes("json") && data === null) continue

      const parsed = provider.parseResponse(data)
      if (!parsed) continue

      // نتحقق أن المزوّد حافظ على بنية الدفعة قبل الاعتماد على نتيجته
      const parts = splitChunkResult(chunk, parsed)
      if (parts) return { parts, provider: provider.id }
      // إن دمج الأسطر، نعيد الطلب نصاً نصاً (أبطأ لكن صحيح)
      const individually = []
      let ok = true
      for (const single of chunk) {
        const one = await translateSingle(providers.slice(providers.indexOf(provider)), single, source, target)
        if (!one) {
          ok = false
          break
        }
        individually.push(one)
      }
      if (ok) return { parts: individually, provider: provider.id }
    } catch {
      // مهلة/شبكة/إلغاء → المزوّد التالي
    } finally {
      clearTimeout(timer)
    }
  }
  return null
}

async function translateSingle(providers, text, source, target) {
  for (const provider of providers) {
    let built
    try {
      built = provider.buildRequest(text, source, target)
    } catch {
      continue
    }
    if (!built || !built.url) continue
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)
    try {
      const response = await fetch(built.url, {
        ...(built.init || {}),
        signal: controller.signal,
        headers: { "User-Agent": "mizan-digital-translate/1.0", Accept: "application/json, text/plain, */*" },
      })
      if (!response.ok) continue
      const data = JSON.parse(await response.text())
      const parsed = provider.parseResponse(data)
      if (parsed) return parsed
    } catch {
      // التالي
    } finally {
      clearTimeout(timer)
    }
  }
  return null
}

export async function onRequestPost(context) {
  const { request, env } = context

  // ── 1) تحديد المعدل ────────────────────────────────────────────────────
  const ip = getClientIp(request)
  const rate = await checkRateLimit({
    kv: env && env.RATE_LIMIT_KV,
    bucket: "translate",
    key: ip,
    limit: RATE_LIMIT,
    windowSeconds: RATE_WINDOW_SECONDS,
  })
  // checkRateLimit يُرجع {allowed, remaining, retryAfterSeconds, backend}
  if (!rate.allowed) return tooManyRequests(rate.retryAfterSeconds || 60)

  // ── 2) قراءة الجسم والتحقق منه ─────────────────────────────────────────
  // readJsonBody يُرجع غلافاً {ok, body} وليس الجسم مباشرةً
  const parsedBody = await readJsonBody(request, 256 * 1024)
  if (!parsedBody.ok) return jsonResponse({ error: parsedBody.error || "طلب غير صالح" }, parsedBody.status || 400)
  const body = parsedBody.body
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "طلب غير صالح" }, 400)
  }

  const target = body.target
  const source = typeof body.source === "string" ? body.source : "auto"
  const texts = body.texts

  if (!isValidLangCode(target)) return jsonResponse({ error: "لغة الهدف غير صالحة" }, 400)
  if (source !== "auto" && !isValidLangCode(source)) {
    return jsonResponse({ error: "لغة المصدر غير صالحة" }, 400)
  }
  if (!Array.isArray(texts) || texts.length === 0) {
    return jsonResponse({ error: "لا توجد نصوص للترجمة" }, 400)
  }
  if (texts.length > MAX_TEXTS) {
    return jsonResponse({ error: `الحد الأقصى ${MAX_TEXTS} نصاً في الطلب` }, 400)
  }

  const clean = []
  for (const item of texts) {
    if (typeof item !== "string") return jsonResponse({ error: "كل النصوص يجب أن تكون سلاسل نصية" }, 400)
    if (item.length > MAX_TEXT_CHARS) {
      return jsonResponse({ error: `نص يتجاوز ${MAX_TEXT_CHARS} حرفاً` }, 400)
    }
    clean.push(item)
  }

  // ── 3) التخزين المؤقت (Cache API) ──────────────────────────────────────
  const cacheAvailable = typeof caches !== "undefined" && caches && caches.default
  const fingerprint = await requestFingerprint(target, source, clean)
  const cacheUrl = `https://translate-cache.internal/${fingerprint}`
  const cache = cacheAvailable ? caches.default : null

  if (cache) {
    try {
      const hit = await cache.match(cacheUrl)
      if (hit) {
        const payload = await hit.json()
        return jsonResponse({ ...payload, cached: true }, 200, {
          "Cache-Control": "public, max-age=86400",
        })
      }
    } catch {
      // فشل الكاش لا يُفشل الطلب
    }
  }

  // ── 4) الترجمة عبر السلسلة ─────────────────────────────────────────────
  const providers = getProviders({
    lingvaInstances:
      env && env.LINGVA_INSTANCES
        ? String(env.LINGVA_INSTANCES).split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
    libreUrl: env && env.LIBRETRANSLATE_URL,
    libreKey: env && env.LIBRETRANSLATE_API_KEY,
  })

  const chunks = buildChunks(clean)
  const results = new Array(clean.length).fill(null)
  let usedProvider = null
  let cursor = 0

  for (const chunk of chunks) {
    const translated = await translateChunk(providers, chunk, source, target)
    if (translated) {
      if (!usedProvider) usedProvider = translated.provider
      for (const part of translated.parts) {
        if (cursor < results.length) results[cursor] = part
        cursor += 1
      }
    } else {
      cursor += chunk.length
    }
  }

  const translatedCount = results.filter((r) => r !== null).length
  if (translatedCount === 0) {
    return jsonResponse(
      { error: "تعذّرت الترجمة — جميع المزوّدين لم يستجيبوا", providers: providers.map((p) => p.id) },
      502
    )
  }

  const payload = {
    results: results.map((r, i) => (r === null ? clean[i] : r)),
    provider: usedProvider,
    translatedCount,
    total: clean.length,
    partial: translatedCount < clean.length,
  }

  if (cache) {
    try {
      await cache.put(
        cacheUrl,
        new Response(JSON.stringify(payload), {
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=604800" },
        })
      )
    } catch {
      // التخزين المؤقت تحسين وليس شرطاً
    }
  }

  return jsonResponse(payload, 200, { "Cache-Control": "public, max-age=3600" })
}

export async function onRequestGet() {
  // فحص صحة بسيط: هل الوسيط حيّ؟
  const providers = getProviders({}).map((p) => p.id)
  return jsonResponse({ ok: true, providers })
}
