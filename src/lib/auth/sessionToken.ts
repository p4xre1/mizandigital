// src/lib/auth/sessionToken.ts
//
// رمز وصول صالح للنداءات الخادمة (/api/*).
//
// المشكلة التي يحلها: رمز Supabase (JWT) يعيش ساعة واحدة. إن بقيت الصفحة
// مفتوحة طويلاً (خاملة أو الجهاز نائم) ثم أرسل المستخدم سؤاله قبل أن يكتمل
// تجديد supabase-js التلقائي، يصل الرمز المنتهي إلى الخادم فيردّ 401 وتظهر
// «انتهت جلستك» رغم أن الجلسة قابلة للتجديد. لذلك:
//   • عند كل نداء: قراءة الجلسة المخزنة وتجديدها استباقياً إن قاربت على الانتهاء.
//   • بعد 401: محاولة تجديد صريحة واحدة وإعادة المحاولة قبل إعلان الانتهاء.

import { supabase } from "@/lib/supabase/client"

/** هامش الأمان قبل الانتهاء: جدّد الآن بدل المخاطرة بوصول رمز ميت للخادم. */
export const EXPIRY_MARGIN_MS = 30_000

/**
 * رمز وصول صالح من الجلسة الحالية، أو null إن لم توجد جلسة أصلاً.
 * يقرأ الجلسة المخزنة بلا نداء شبكة، ويجدّد فقط عند اقتراب الانتهاء.
 */
export async function freshAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) return null
    const expiresAtMs = (data.session.expires_at ?? 0) * 1000
    if (expiresAtMs > 0 && expiresAtMs - Date.now() < EXPIRY_MARGIN_MS) {
      return refreshedAccessToken()
    }
    return data.session.access_token
  } catch {
    return null
  }
}

/**
 * تجديد صريح للجلسة (بعد 401 مثلاً). يعيد الرمز الجديد، أو null إن كان
 * التجديد مستحيلاً (رمز التحديث ملغى أو منتهي) — وعندها الجلسة منتهية فعلاً.
 */
export async function refreshedAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.session) return null
    return data.session.access_token
  } catch {
    return null
  }
}

/**
 * نفّذ نداءً خادماً برمزي معرَّف صالح، مع إعادة محاولة واحدة بعد 401.
 *
 *   1. يقرأ رمزاً صالحاً لحظة النداء (تجديد استباقي قرب الانتهاء).
 *   2. إن ردّ الخادم 401، جدّد الجلسة صراحةً وأعد النداء بالرمز الجديد مرة
 *      واحدة. إن نجح التجديد حدّثت مكتبة المصادقة الجلسة تلقائياً، وإن فشل
 *      فالجلسة منتهية فعلاً ويستدعي العرض «انتهت جلستك».
 *
 * `fallbackToken` رمز احتياطي (المعروض وقت التصيير مثلاً) يُستعمل فقط إن لم
 * توجد جلسة صالحة للقراءة.
 */
export async function withAuthRetry<T>(
  run: (accessToken: string) => Promise<{ res: Response; data: T | null }>,
  fallbackToken?: string | null,
): Promise<{ res: Response; data: T | null }> {
  let accessToken = (await freshAccessToken()) ?? fallbackToken ?? ""
  let out = await run(accessToken)
  if (out.res.status === 401) {
    const renewed = await refreshedAccessToken()
    if (renewed && renewed !== accessToken) {
      accessToken = renewed
      out = await run(accessToken)
    }
  }
  return out
}
