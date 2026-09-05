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

const MAX_FILENAME_LENGTH = 200
const ALLOWED_FOLDERS = ["images", "documents", "pdf", "misc"]

function sanitizeFolder(folder) {
  const clean = String(folder || "images").replace(/^\/+|\/+$/g, "")
  return ALLOWED_FOLDERS.includes(clean) ? clean : "images"
}

function sanitizeFileName(fileName) {
  const base = String(fileName || "file").slice(0, MAX_FILENAME_LENGTH)
  return base.replace(/[^a-zA-Z0-9.-]/g, "_")
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
  const contentType = String(body.contentType || "application/octet-stream")
  const folder = sanitizeFolder(body.folder)
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
