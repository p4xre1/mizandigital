// src/lib/r2/upload.ts
//
// ⚠️ هذا الملف لم يعد يحمل أي بيانات اعتماد R2. توليد الروابط الموقّعة
// (presigned URLs) انتقل بالكامل إلى دالة خادم Cloudflare Pages Function
// (functions/api/r2/presign.js) التي تتحقق من صلاحية الإدارة عبر Supabase
// قبل توليد أي رابط. المتصفح يطلب فقط رابطاً موقّتاً صالحاً لملف واحد،
// ثم يرفع إليه مباشرة (Upload from browser → R2)، بلا أي وسيط للسر.
//
// راجع: functions/api/r2/presign.js و functions/_shared/r2sign.js

import { supabase } from "../supabase/client"

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error("يجب تسجيل الدخول كمسؤول لرفع الملفات")
  }
  return { Authorization: `Bearer ${token}` }
}

export async function createPresignedUploadUrl(fileName: string, contentType: string, folder: string = "images") {
  const authHeader = await getAuthHeader()

  const response = await fetch("/api/r2/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({ fileName, contentType, folder }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error || `تعذّر توليد رابط الرفع (${response.status})`)
  }

  const { uploadUrl, fileUrl, fileKey } = await response.json()
  return { uploadUrl, fileUrl, fileKey }
}

export async function deleteFileFromR2(fileKey: string) {
  const authHeader = await getAuthHeader()

  const response = await fetch("/api/r2/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({ fileKey }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error || `تعذّر حذف الملف (${response.status})`)
  }

  return response.json()
}
