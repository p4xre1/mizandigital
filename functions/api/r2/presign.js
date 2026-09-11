// functions/api/r2/presign.js  →  POST /api/r2/presign
//
// نقطة النهاية الوحيدة المخوّلة بتوليد روابط رفع موقّعة (presigned) نحو
// Cloudflare R2. بيانات اعتماد R2 (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)
// تبقى فـ متغيرات بيئة الخادم فقط (Cloudflare Pages → Settings →
// Environment variables) ولا تُبعث أبداً للمتصفح.
//
// معمارية الأمان:
//   متصفح المدير (مسجّل دخول عبر Supabase)
//        → يرسل Authorization: Bearer <supabase access token>
//        → هذه الدالة تتحقق من الهوية والصلاحية الإدارية عبر Supabase
//          (نفس نظام المصادقة الحالي، بلا نظام موازٍ)
//        → عند التصريح فقط: توليد رابط PUT موقّت (900 ثانية) موقّع بـ
//          SigV4 محلياً (functions/_shared/r2sign.js)
//        → المتصفح يرفع الملف مباشرة لهذا الرابط (لا يمر عبر الخادم)
//
// NEEDS CLOUDFLARE CONFIGURATION: يجب ضبط متغيرات البيئة التالية في
// إعدادات مشروع Cloudflare Pages (وليس فـ .env / الـ ZIP):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
//   R2_PUBLIC_DOMAIN, SUPABASE_URL, SUPABASE_ANON_KEY

import { presignR2PutUrl } from "../../_shared/r2sign.js"
import { requireAdmin, jsonResponse } from "../../_shared/auth.js"
import { checkRateLimit, tooManyRequests } from "../../_shared/guard.js"

const MAX_FILENAME_LENGTH = 200
const ALLOWED_FOLDERS = ["images", "documents", "pdf", "misc"]

/**
 * أنواع MIME المسموح رفعها (قائمة بيضاء صريحة، وليست قائمة سوداء).
 *
 * ⚠️ لماذا لا يوجد `text/html` ولا `image/svg+xml`:
 * ملفات R2 تُقدَّم للجمهور عبر R2_PUBLIC_DOMAIN (media.mizan.page). أي ملف
 * HTML أو SVG مرفوع يصبح صفحة قابلة للتنفيذ على نطاق فرعي موثوق = ثغرة
 * XSS مخزَّنة + منصّة تصيّد جاهزة، حتى لو كان الرافع مسؤولاً (حساب مسروق أو
 * جلسة مختطَفة تكفي). PNG/WebP/PDF تغطي كل الحالات الفعلية في المنصة.
 * لو احتجت SVG فعلاً: أضفه هنا وأضف `.svg` إلى ALLOWED_EXTENSIONS مع ضبط
 * `Content-Disposition: attachment` له على مستوى R2/Cloudflare.
 */
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/rtf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/zip",
])

/** امتدادات الملفات المسموحة — تُطابق قائمة MIME أعلاه. */
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "avif",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "odt", "ods", "odp", "rtf", "txt", "csv", "md", "zip",
])

function sanitizeFolder(folder) {
  const clean = String(folder || "images").replace(/^\/+|\/+$/g, "")
  return ALLOWED_FOLDERS.includes(clean) ? clean : "images"
}

function sanitizeFileName(fileName) {
  const base = String(fileName || "file").slice(0, MAX_FILENAME_LENGTH)
  return base.replace(/[^a-zA-Z0-9.-]/g, "_")
}

/**
 * استخراج الامتداد من اسم الملف (آخر نقطة، بلا مسافة).
 * @returns {string} امتداد بحروف صغيرة أو "" إن لم يوجد
 */
export function fileExtension(fileName) {
  const clean = String(fileName || "")
  const dot = clean.lastIndexOf(".")
  if (dot < 0 || dot === clean.length - 1) return ""
  return clean.slice(dot + 1).toLowerCase().slice(0, 10)
}

/**
 * فحص ثنائي: نوع MIME مسموح **و** امتداد مسموح. الفحصان معاً لأن أيّاً
 * منهما وحده قابل للتلاعب (اسم ملف "x.png" بنوع text/html، أو العكس).
 * @returns {{ok:true, contentType:string}|{ok:false, error:string}}
 */
export function validateUploadType(fileName, contentType) {
  const type = String(contentType || "").trim().toLowerCase().split(";")[0]
  const ext = fileExtension(fileName)

  if (!ALLOWED_CONTENT_TYPES.has(type)) {
    return { ok: false, error: `Content type not allowed: ${type || "(empty)"}` }
  }
  if (!ext) return { ok: false, error: "File extension is required" }
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: `File extension not allowed: .${ext}` }
  }
  return { ok: true, contentType: type }
}


export async function onRequestPost(context) {
  const { request, env } = context

  let admin
  try {
    admin = await requireAdmin(request, env)
  } catch (err) {
    return jsonResponse({ error: "Server misconfiguration", detail: String(err?.message || err) }, 500)
  }
  if (!admin) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  // تحديد المعدل حتى للمدير: رمز إداري مسروق لا يجب أن يسمح بتوليد عدد غير
  // محدود من روابط الرفع (تخزين ضار / استنزاف مساحة R2).
  const rate = await checkRateLimit({
    kv: env.RATE_LIMIT_KV,
    bucket: "r2-presign",
    key: admin.id,
    limit: 120,
    windowSeconds: 600,
  })
  if (!rate.allowed) return tooManyRequests(rate.retryAfterSeconds)

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN } = env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return jsonResponse({ error: "R2 is not configured on the server" }, 500)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400)
  }

  const fileName = sanitizeFileName(body.fileName)
  const folder = sanitizeFolder(body.folder)

  // فحص النوع قبل أي عمل مكلف (توقيع SigV4) — يرفض HTML/SVG/ملفات قابلة للتنفيذ
  const typeCheck = validateUploadType(fileName, body.contentType)
  if (!typeCheck.ok) {
    return jsonResponse({ error: "Unsupported file type", detail: typeCheck.error }, 415)
  }

  const contentType = typeCheck.contentType
  const fileKey = `${folder}/${Date.now()}-${fileName}`

  try {
    const { url: uploadUrl } = await presignR2PutUrl({
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET_NAME,
      key: fileKey,
      contentType,
      expiresIn: 900,
    })

    const publicDomain = (R2_PUBLIC_DOMAIN || "").replace(/\/+$/, "")
    const fileUrl = `${publicDomain}/${fileKey}`

    return jsonResponse({ uploadUrl, fileUrl, fileKey })
  } catch (err) {
    return jsonResponse({ error: "Failed to generate presigned URL", detail: String(err?.message || err) }, 500)
  }
}

// هذه النقطة تُستدعى فقط من نفس الأصل (same-origin fetch من لوحة التحكم)
// فلا حاجة لترويسات CORS عابرة للأصول؛ نتعامل مع OPTIONS بردّ فارغ فقط.
export async function onRequestOptions() {
  return new Response(null, { status: 204 })
}
