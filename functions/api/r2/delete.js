// functions/api/r2/delete.js  →  POST /api/r2/delete
// نفس نموذج الأمان فـ presign.js: يتحقق من صلاحية admin_god_mode عبر
// Supabase قبل حذف أي كائن من R2. بيانات اعتماد R2 تبقى فـ الخادم فقط.

import { deleteR2Object } from "../../_shared/r2sign.js"
import { requireAdmin, jsonResponse } from "../../_shared/auth.js"
import { checkRateLimit, tooManyRequests } from "../../_shared/guard.js"

/** نفس قائمة المجلدات المعتمدة في presign.js — لا يُحذف شيء خارجها. */
const ALLOWED_FOLDERS = ["images", "documents", "pdf", "misc"]

/**
 * فحص مفتاح الكائن قبل الحذف: يمنع اجتياز المسارات (`../`) ويحصر الحذف
 * داخل مجلدات المشروع، حتى لو وصل مفتاح مُتلاعب به من الواجهة.
 * @returns {{ok:true, key:string}|{ok:false, error:string}}
 */
export function validateObjectKey(fileKey) {
  const raw = String(fileKey || "")
  if (!raw || raw.length > 400) return { ok: false, error: "Invalid fileKey" }
  if (raw.includes("..")) return { ok: false, error: "Path traversal detected" }
  if (/\s/.test(raw)) return { ok: false, error: "Invalid fileKey" }

  const key = raw.replace(/^\/+/, "")
  const folder = key.split("/")[0]
  if (!ALLOWED_FOLDERS.includes(folder)) {
    return { ok: false, error: `Folder not allowed: ${folder}` }
  }
  if (key.split("/").length < 2 || !key.split("/")[1]) {
    return { ok: false, error: "fileKey must point to an object, not a folder" }
  }
  return { ok: true, key }
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

  // الحذف الجماعي برمز مسروق = فقدان محتوى كامل. نحدّ المعدل لتقليص الضرر.
  const rate = await checkRateLimit({
    kv: env.RATE_LIMIT_KV,
    bucket: "r2-delete",
    key: admin.id,
    limit: 200,
    windowSeconds: 600,
  })
  if (!rate.allowed) return tooManyRequests(rate.retryAfterSeconds)

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return jsonResponse({ error: "R2 is not configured on the server" }, 500)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400)
  }

  const fileKeyCheck = validateObjectKey(body.fileKey)
  if (!fileKeyCheck.ok) {
    return jsonResponse({ error: "Invalid fileKey", detail: fileKeyCheck.error }, 400)
  }
  const fileKey = fileKeyCheck.key

  try {
    await deleteR2Object({
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET_NAME,
      key: fileKey,
    })
    return jsonResponse({ ok: true })
  } catch (err) {
    return jsonResponse({ error: "Failed to delete object", detail: String(err?.message || err) }, 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 })
}
