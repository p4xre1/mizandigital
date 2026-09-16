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

/**
 * جداول مرتبطة بمعرّف الحساب (uuid) في عمود محدد.
 *
 * ملاحظة: سياسة الخصوصية (/privacy §6) تعد بحذف profiles و quiz_attempts أيضاً،
 * وكانا غائبين هنا — فالحذف كان جزئياً مع رسالة نجاح كاملة.
 */
const TABLES_BY_OWNER = [
  ["mizan_profiles", "owner_id"],
  ["onboarding_responses", "user_id"],
  ["reactions", "user_ref"],
  ["reports", "reporter_ref"],
  ["payments", "user_ref"],
  ["credit_transactions", "user_ref"],
  ["content_reactions", "owner_id"],
  ["profiles", "id"],
  // مرتبطة بـ auth.users بـ ON DELETE CASCADE، فنحذفها صراحةً هنا أيضاً.
  ["legal_consents", "user_id"],
];

/**
 * quiz_attempts.user_ref نصّي: الحسابات المسجّلة تستعمل uuid، والقديمة تستعمل
 * local:<username> أو معرّف جهاز مجهول. نحذف المطابق لـ uuid ولـ username معاً.
 */
const ATTEMPTS_TABLE = "quiz_attempts";

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

  // نقرأ اسم المستخدم قبل حذف mizan_profiles لنعرف صفوف المحاولات القديمة.
  let username = null;
  try {
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/mizan_profiles?owner_id=eq.${encodeURIComponent(user.id)}&select=username`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (profileResponse.ok) {
      const rows = await profileResponse.json();
      if (Array.isArray(rows) && rows[0]?.username) username = rows[0].username;
    }
  } catch {
    /* نتابع بالحذف عبر uuid وحده */
  }

  // المحاولات أولاً: بعدها يختفي البروفايل الذي نستمد منه username.
  try {
    // اسم المستخدم مقيّد بـ [a-zA-Z0-9_] في generate_profile_username،
    // ومع ذلك نمرّر القيمة عبر encodeURIComponent لا عبر شرط كامل.
    const conditions = [`user_ref.eq.${encodeURIComponent(user.id)}`];
    if (username) conditions.push(`user_ref.eq.local:${encodeURIComponent(username)}`);
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${ATTEMPTS_TABLE}?or=(${conditions.join(",")})`,
      {
        method: "DELETE",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      }
    );
    if (response.ok || response.status === 404) deleted.push(ATTEMPTS_TABLE);
    else failed.push(ATTEMPTS_TABLE);
  } catch {
    failed.push(ATTEMPTS_TABLE);
  }

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

  // حساب auth.users نفسه لا يُحذف من هنا: يتطلب Supabase Admin API ولا يُنجز
  // إلا عبر المشرف (لوحة Supabase → Authentication → Users). لا نعد بما لا نفعله.
  return jsonResponse({
    ok: failed.length === 0,
    message:
      failed.length === 0
        ? "تم حذف بياناتك. لإزالة الحساب نهائياً (auth.users) راسل contact@mizan.page"
        : "حُذفت بعض بياناتك — راسل contact@mizan.page لإكمال الحذف",
    deleted,
    failed,
    authUserRemoved: false,
  });
}
