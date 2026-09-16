/**
 * DELETE /api/account/delete
 * GDPR — حذف بيانات المستخدم
 *
 * بعد إزالة Clerk صارت الهوية Supabase Auth: نتحقق من access_token عبر
 * requireUser (‎/auth/v1/user) ثم نحذف صفوف الحساب من الجداول المرتبطة
 * بـ auth.uid(). حذف حساب auth.users نفسه يتم من لوحة تحكم Supabase (أو
 * عبر Admin API بمفتاح service_role) لأن المتصفح لا يملك صلاحية ذلك.
 */

import { requireUser, jsonResponse } from "../../_shared/auth.js";

/** جداول مرتبطة بمعرّف الحساب (uuid) في عمود محدد. */
const TABLES_BY_OWNER = [
  ["mizan_profiles", "owner_id"],
  ["onboarding_responses", "user_id"],
  ["reactions", "user_ref"],
  ["reports", "reporter_ref"],
  ["payments", "user_ref"],
  ["credit_transactions", "user_ref"],
  ["content_reactions", "owner_id"],
];

export async function onRequestDelete(context) {
  const { request, env } = context;

  const user = await requireUser(request, env);
  if (!user) {
    return jsonResponse({ error: "غير مصرّح — سجّل الدخول أولاً" }, 401);
  }

  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "إعدادات الخادم ناقصة" }, 500);
  }

  const deleted = [];
  const failed = [];

  for (const [table, column] of TABLES_BY_OWNER) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${table}?${column}=eq.${encodeURIComponent(user.id)}`,
        {
          method: "DELETE",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        }
      );
      // 404/42P01 = الجدول غير موجود في هذا المشروع: لا نعتبره فشلاً
      if (response.ok || response.status === 404) deleted.push(table);
      else failed.push(table);
    } catch {
      failed.push(table);
    }
  }

  return jsonResponse({
    ok: failed.length === 0,
    message: failed.length === 0 ? "تم حذف بياناتك" : "حُذفت بعض بياناتك — راسل contact@mizan.page لإكمال الحذف",
    deleted,
    failed,
  });
}
