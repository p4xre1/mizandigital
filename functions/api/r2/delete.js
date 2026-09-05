// functions/api/r2/delete.js  →  POST /api/r2/delete
// نفس نموذج الأمان فـ presign.js: يتحقق من صلاحية admin_god_mode عبر
// Supabase قبل حذف أي كائن من R2. بيانات اعتماد R2 تبقى فـ الخادم فقط.

import { deleteR2Object } from "../../_shared/r2sign.js"
import { requireAdmin, jsonResponse } from "../../_shared/auth.js"

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

  const fileKey = String(body.fileKey || "").replace(/^\/+/, "")
  if (!fileKey) {
    return jsonResponse({ error: "fileKey is required" }, 400)
  }

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
