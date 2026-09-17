/**
 * DELETE /api/account/delete
 *
 * القانون 09-08 — طلب محو الحساب.
 *
 * ── ما تغيّر ────────────────────────────────────────────────────────────────
 * كان هذا الطرف يحذف الصفوف فوراً: mizan_profiles وonboarding_responses
 * وreactions وreports و**payments وcredit_transactions** وprofiles وlegal_consents.
 * مشكلتان:
 *
 *   1) حذف payments وcredit_transactions يُتلف السجل المحاسبي الذي توجب
 *      المادة 26 من مدونة التجارة الاحتفاظ به عشر سنوات. الامتثال لقانون
 *      الخصوصية كان يكسر قانوناً آخر.
 *   2) لا رجعة: ضغطة واحدة (أو طلب مكرر من سكربت) تنهي الحساب نهائياً،
 *      بلا مهلة للتراجع وبلا سجل بما جرى.
 *
 * صار الطلب **حذفاً ناعماً**: تُضبط الحالة `pending_deletion` مع تاريخ الطلب،
 * وتمتد مهلة 30 يوماً يمكن للمستخدم التراجع فيها بنفسه
 * (POST /api/account/restore) أو تطلب فيها الإدارة الاستعادة.
 *
 * الإخفاء النهائي ليس هنا: مهمة مجدولة تنفّذ
 *   list_expired_deletions → Auth Admin API DELETE → anonymize_orphaned_billing
 * فتحذف حساب auth (الشلال يزيل الصفوف التابعة) وتفصل الهوية عن السجلات
 * المالية مع إبقاء المبالغ والتواريخ ومعرّفات Stripe.
 *
 * ── صفر ثقة ────────────────────────────────────────────────────────────────
 * لا نستعمل مفتاح service_role هنا إطلاقاً. ننادي الدالة برمزية المستخدم
 * نفسه، فتُقيَّم RLS وتعمل auth.uid() داخل الدالة. المتصفح لا يستطيع طلب
 * حذف حساب غيره لأن الدالة لا تأخذ معرّفاً — تقرأه من الرمز.
 */

import { requireUser, jsonResponse } from "../../_shared/auth.js";
import { checkRateLimit } from "../../_shared/guard.js";

/** مهلة التراجع بالأيام — يجب أن تطابق ما تعرضه الواجهة وما في الترحيل. */
export const GRACE_PERIOD_DAYS = 30;

export async function onRequestDelete(context) {
  const { request, env } = context;

  const user = await requireUser(request, env);
  if (!user) {
    return jsonResponse({ error: "غير مصرّح — سجّل الدخول أولاً" }, 401);
  }

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return jsonResponse({ error: "إعدادات الخادم ناقصة" }, 500);
  }

  // تحديد المعدل: الطلب رخيص لكنه يغيّر حالة الحساب، فلا نريده في حلقة.
  try {
    const limited = await checkRateLimit({
      kv: env.RATE_LIMIT_KV,
      bucket: "account_delete",
      key: user.id,
      limit: 5,
      windowSeconds: 3600,
    });
    if (!limited.allowed) {
      return jsonResponse(
        { error: "محاولات كثيرة — أعد المحاولة لاحقاً", retryAfterSeconds: limited.retryAfterSeconds },
        429
      );
    }
  } catch {
    // فشل KV ليس سبباً لرفض طلب مشروع؛ تحديد المعدل هنا best-effort.
  }

  // سبب اختياري: يفيد في فهم سبب المغادرة، ولا يُشترط للمحو.
  // نُقلّم أولاً: فراغان فقط ليسا سبباً، وتمريرهما كان يخزّن قيمة عديمة المعنى.
  const rawReason = new URL(request.url).searchParams.get("reason");
  const reason = rawReason ? rawReason.trim() : "";

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/request_account_deletion`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_reason: reason ? reason.slice(0, 500) : null }),
  });

  // 404 من PostgREST = الدالة غير موجودة = الترحيل 13 غير مطبَّق على القاعدة.
  // رسالة صريحة أفضل من «خطأ في الخادم»: هذا بالضبط ما حدث في القاعدة الحية.
  if (res.status === 404) {
    return jsonResponse(
      {
        error: "طلب الحذف غير متاح بعد",
        detail:
          "الدالة request_account_deletion غير موجودة في قاعدة البيانات. طبّق الترحيل 20260926000000_admin_actions_soft_delete_and_audit.sql",
      },
      503
    );
  }

  if (!res.ok) {
    const detail = await res.text();
    return jsonResponse(
      { error: "تعذّر تسجيل طلب الحذف", detail: detail.slice(0, 300) },
      500
    );
  }

  const data = await res.json().catch(() => ({}));

  // طلب مكرر: المهلة قائمة أصلاً ولا تُعاد تصفيرها (وإلا امتدت إلى الأبد).
  if (data?.already_requested) {
    return jsonResponse({
      ok: true,
      alreadyRequested: true,
      accountStatus: "pending_deletion",
      gracePeriodDays: GRACE_PERIOD_DAYS,
      message: `طلبك مسجّل مسبقاً — الحساب يُحذف نهائياً بعد انتهاء المهلة، ويمكن التراجع قبل ذلك.`,
    });
  }

  return jsonResponse({
    ok: true,
    accountStatus: "pending_deletion",
    gracePeriodDays: GRACE_PERIOD_DAYS,
    restorePath: "/api/account/restore",
    message: `تم تسجيل طلب حذف الحساب. لديك ${GRACE_PERIOD_DAYS} يوماً للتراجع قبل الإخفاء النهائي.`,
  });
}
