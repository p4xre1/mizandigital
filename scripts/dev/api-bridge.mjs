// scripts/dev/api-bridge.mjs
//
// ⚠️ DEV-ONLY — Vite plugin يجلب نقاط Cloudflare Pages Functions الخاصة
// بمساعد الموقع إلى خادم التطوير (pnpm dev)، لأن Vite وحده لا ينفّذ
// مجلد functions/. بدونه كل سؤال في المساعد ينتهي بـ«تعذّر الرد الآن».
//
// كيف يعمل:
//  • يعترض /api/help/chat و /api/admin/help/{preview,validate} وينفّذ
//    دوالها الفعلية داخل Node (كود حقيقي، لا محاكاة للمحرك).
//  • نقاط الدوال تحتاج Supabase من جهة الخادم، وبيئة التطوير قد لا تملك
//    مفاتيح/شبكة، فيُوفَّق لها محاكي محلي على /__dev_supabase__/ يعيد:
//      - /auth/v1/user  → هوية مستخرجة من رمز الجلسة دون تحقق توقيعه
//      - /rest/v1/profiles → حساب نشط
//      - /rest/v1/help_settings → صف الإعدادات المفعّل
//      - /rest/v1/help_qa → []
//  • ربط RATE_LIMIT_KV يُحاكى بذاكرة العملية.
//
// 🚫 أمان: فك رمز الجلسة هنا بلا تحقق (وضع تطوير فقط). لا تُنقل هذه
// الآلية إلى الإنتاج أبداً — المساعد في الإنتاج يمر عبر Cloudflare
// Functions بمفاتيح حقيقية. لذلك:
//   - يعمل فقط مع `vite dev` (apply: "serve") ولا يدخل البناء.
//   - قائمة نقاط المسموح بها ثابتة ومحدودة بالمساعد.

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { register } from "node:module"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const FUNCTIONS_DIR = path.join(ROOT, "functions")

/** نقاط الطلب المسموح تشغيلها محلياً (مساعد الموقع فقط). */
const ROUTES = {
  "/api/help/chat": "api/help/chat.js",
  "/api/admin/help/preview": "api/admin/help/preview.js",
  "/api/admin/help/validate": "api/admin/help/validate.js",
}

const MOCK_BASE = "/__dev_supabase__"
/** أقصى حجم لجسم يُقرأ من المتصفح في الجسر (أضعاف حاجة النقاط). */
const MAX_BRIDGE_BODY_BYTES = 1024 * 1024

// السماح باستيراد JSON بلا سمة (كما في بيئة الإنتاج) للملفات المشتركة.
// حارس عام: إعادة تشغيل خادم التطوير تعيد تنفيذ هذا الملف، والتسجيل مرة
// واحدة في العملية يكفي.
if (!globalThis.__mizanDevJsonHooksRegistered) {
  globalThis.__mizanDevJsonHooksRegistered = true
  try {
    const hooksUrl = new URL("./json-import-hooks.mjs", import.meta.url)
    register(hooksUrl)
    console.warn(`[dev-api-bridge] json hooks registered: ${hooksUrl.href} (import.meta.url=${import.meta.url})`)
  } catch (error) {
    console.warn("[dev-api-bridge] json hooks registration failed:", error)
  }
}

let bannerShown = false

/** ── محاكاة ربط KV (واجهة get/put مع انتهاء صلاحية) ── */
function makeMemoryKv() {
  const store = new Map()
  return {
    async get(key) {
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        store.delete(key)
        return null
      }
      return entry.value
    },
    async put(key, value, options = {}) {
      const expiresAt = options.expirationTtl ? Date.now() + options.expirationTtl * 1000 : 0
      store.set(key, { value, expiresAt })
    },
  }
}

/** فك جزء الـpayload من JWT دون أي تحقق من التوقيع — وضع تطوير فقط. */
function decodeJwtPayload(token) {
  const parts = String(token || "").split(".")
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const json = Buffer.from(base64, "base64").toString("utf-8")
    const payload = JSON.parse(json)
    return payload && typeof payload === "object" ? payload : null
  } catch {
    return null
  }
}

/**
 * أسئلة help_qa المنشورة للمعاينة المحلية. إن وُجد ملف
 * `scripts/dev/help-qa.fixture.json` يُقرأ منه (مصفوفة صفوف كما في الجدول)،
 * وإلا أعيدت قائمة فارغة — تماماً كجدول جديد لم يُنشر فيه شيء بعد.
 */
const QA_FIXTURE_PATH = path.join(ROOT, "scripts", "dev", "help-qa.fixture.json")
function qaRows() {
  if (!existsSync(QA_FIXTURE_PATH)) return []
  try {
    const parsed = JSON.parse(readFileSync(QA_FIXTURE_PATH, "utf-8"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** صف إعدادات المساعد: مفعّل وبالرسائل الافتراضية (كما تبذره الهجرة). */
function settingsRow() {
  return {
    id: 1,
    enabled: true,
    blocked_message: null,
    off_topic_message: null,
    not_found_message: null,
    disabled_message: null,
    blocked_phrases: [],
    off_topic_terms: [],
    updated_at: new Date().toISOString(),
    updated_by: null,
  }
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(body))
}

/** محاكي Supabase المحلي: يكفي ما تقرأه نقاط المساعد فقط. */
function handleMockSupabase(req, res, url) {
  const send = (status, body) => sendJson(res, status, body)
  if (url.pathname === `${MOCK_BASE}/auth/v1/user`) {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim()
    const payload = decodeJwtPayload(token)
    if (!payload || typeof payload.sub !== "string") return send(401, { msg: "invalid token" })
    // مضاهاة GoTrue الحقيقية: الرمز المنتهي يُرفض بـ401 (يُجدَّد من المتصفح)،
    // حتى تُعيد المعاينة المحلية إنتاج سيناريو «انتهت جلستك» كما في الإنتاج.
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return send(401, { msg: "token is expired" })
    }
    return send(200, { id: payload.sub, email: typeof payload.email === "string" ? payload.email : "dev@localhost" })
  }
  if (url.pathname === `${MOCK_BASE}/rest/v1/profiles`) {
    return send(200, [{ account_status: "active", admin_god_mode: true }])
  }
  if (url.pathname === `${MOCK_BASE}/rest/v1/help_settings`) {
    return send(200, [settingsRow()])
  }
  if (url.pathname === `${MOCK_BASE}/rest/v1/help_qa`) {
    return send(200, qaRows())
  }
  return send(404, { error: "mock route not found" })
}

/** قراءة جسم طلب Node بحد أقصى للبايتات. */
function readNodeBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    let settled = false
    req.on("data", (chunk) => {
      if (settled) return
      total += chunk.length
      if (total > maxBytes) {
        settled = true
        reject(new Error("body_too_large"))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => {
      if (!settled) resolve(Buffer.concat(chunks))
    })
    req.on("error", (error) => {
      if (!settled) reject(error)
    })
  })
}

/** تحويل طلب Node إلى Web Request مع أصل يطابق متصفح الزائر (لبوابة المصدر). */
function toWebRequest(req, origin, bodyBuffer) {
  const method = (req.method || "GET").toUpperCase()
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (["host", "connection", "content-length", "accept-encoding"].includes(name.toLowerCase())) continue
    if (typeof value === "string") headers.set(name, value)
    else if (Array.isArray(value)) for (const item of value) headers.append(name, item)
  }
  const hasBody = method !== "GET" && method !== "HEAD"
  if (hasBody) headers.set("Content-Length", String(bodyBuffer.byteLength))
  const init = { method, headers }
  if (hasBody) init.body = new Uint8Array(bodyBuffer)
  return new Request(`${origin}${req.url}`, init)
}

/** كتابة Web Response على رد Node. */
async function writeWebResponse(res, webResponse) {
  res.statusCode = webResponse.status
  webResponse.headers.forEach((value, key) => res.setHeader(key, value))
  const buffer = await webResponse.arrayBuffer()
  res.end(Buffer.from(buffer))
}

/**
 * استيراد أصلي لا يمر عبر مشغّل وحدات Vite: ملفات الدوال وكودها المشترك
 * (مجلد shared/) لا تحتاج أي تحويل من Vite، فهي وحدات ESM عادية تعمل
 * مباشرة على Node. التمرير عبر new Function يُبقي الاستيراد للمحمِّل الأصلي.
 */
const nativeImport = new Function("specifier", "return import(specifier)")

/** تشغيل نقطة الطلب الفعلية (نفس كود الإنتاج) على بيئتها المحلية. */
async function runFunction(relFile, request, env) {
  const filePath = path.join(FUNCTIONS_DIR, relFile)
  const module = await nativeImport(pathToFileURL(filePath).href)
  const methodSuffix = request.method.charAt(0) + request.method.slice(1).toLowerCase()
  const handler = module[`onRequest${methodSuffix}`] || module.onRequest
  if (typeof handler !== "function") {
    return new Response(JSON.stringify({ error: "dev_bridge_no_handler" }), { status: 501 })
  }
  const context = { request, env, params: {}, waitUntil: () => {} }
  return handler(context)
}

/**
 * Vite plugin: جسر نقاط المساعد في وضع التطوير فقط.
 * @returns {import("vite").Plugin}
 */
export function devApiBridge() {
  return {
    name: "mizan-dev-api-bridge",
    apply: "serve",
    configureServer(server) {
      const kv = makeMemoryKv()

      server.middlewares.use(async (req, res, next) => {
        try {
          const url = new URL(req.url || "/", "http://localhost")

          // محاكي Supabase المحلي (تقرأه نقاط الدوال عبر حلقة الشبكة).
          if (url.pathname.startsWith(`${MOCK_BASE}/`)) return handleMockSupabase(req, res, url)

          const relFile = ROUTES[url.pathname]
          if (!relFile) return next()

          if (!bannerShown) {
            bannerShown = true
            console.warn(
              "\n[dev-api-bridge] نقاط مساعد الموقع تعمل محلياً بمحاكي Supabase — " +
                "رموز الجلسة تُفك بلا تحقق توقيع. وضع تطوير/معاينة فقط، لا يصلح للإنتاج.\n",
            )
          }

          let bodyBuffer
          try {
            bodyBuffer = await readNodeBody(req, MAX_BRIDGE_BODY_BYTES)
          } catch {
            return sendJson(res, 413, { error: "payload_too_large" })
          }

          const origin =
            req.headers.origin ||
            (req.headers.host ? `http://${req.headers.host}` : "http://localhost")

          const request = toWebRequest(req, origin, bodyBuffer)
          const addr = server.httpServer && server.httpServer.address()
          const port = addr && typeof addr === "object" ? addr.port : (server.config.server.port ?? 5173)
          const env = {
            SUPABASE_URL: `http://127.0.0.1:${port}${MOCK_BASE}`,
            SUPABASE_ANON_KEY: "dev-anon-key",
            SUPABASE_SERVICE_ROLE_KEY: "dev-service-role-key",
            RATE_LIMIT_KV: kv,
          }

          const response = await runFunction(relFile, request, env)
          return await writeWebResponse(res, response)
        } catch (error) {
          console.error("[dev-api-bridge] error:", error)
          if (!res.headersSent) sendJson(res, 500, { error: "dev_bridge_error" })
          else res.end()
        }
      })
    },
  }
}
