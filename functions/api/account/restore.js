/**
 * POST /api/account/restore
 *
 * تراجع المستخدم عن طلب الحذف خلال مهلة الثلاثين يوماً.
 *
 * لماذا طرف مستقل وليس DELETE عكسياً؟
 * ------------------------------------
 * الطلب الأصلي DELETE /api/account/delete يعني «احذف حسابي»، وعكسه المنطقي
 * هو «أعد حسابي». جعل التراجع POST على مسار restore أوضح من DELETE على مسار
 * delete-cancel، ولا يحمّل مساراً واحداً معنيين متعارضين.
 *
 * التراجع حق لا منّة: القانون 09-08 يجعل الموافقة قابلة للسحب، وطلب المحو
 * موافقة على المحو. وإلزام المستخدم بمراسلة الإدارة ليتراجع عن طلبه هو
 * احتكاك بلا فائدة يحسب عملياً كعرقلة.
 *
 * يعمل فقط ما دامت الحالة pending_deletion. بعد انتهاء المهلة يكون الإخفاء قد
 * جرى وحُذف حساب auth، فلا يبقى ما يُستعاد — وعندها الاستعادة إجراء إداري
 * (admin_restore_account) إن كان الحساب ما زال قائماً.
 *
 * صفر ثقة: لا مفتاح خدمة. ننادي الدالة برمز المستخدم نفسه فتعمل auth.uid()
 * وتُقيَّم RLS، ولا تأخذ الدالة معرّفاً فلا يمكن استعادة حساب الغير.
 */

import { requireUser, jsonResponse } from "../../_shared/auth.js";

export async function onRequestPost(context) {
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

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/cancel_account_deletion`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (res.status === 404) {
    return jsonResponse(
      {
        error: "الاستعادة غير متاحة بعد",
        detail:
          "الدالة cancel_account_deletion غير موجودة في قاعدة البيانات. طبّق الترحيل 20260926000000_admin_actions_soft_delete_and_audit.sql",
      },
      503
    );
  }

  if (!res.ok) {
    const detail = await res.text();
    return jsonResponse({ error: "تعذّرت الاستعادة", detail: detail.slice(0, 300) }, 500);
  }

  const data = await res.json().catch(() => ({}));

  if (data?.already_active) {
    return jsonResponse({
      ok: true,
      alreadyActive: true,
      accountStatus: data.account_status ?? "active",
      message: "حسابك نشط — لا يوجد طلب حذف للتراجع عنه.",
    });
  }

  return jsonResponse({
    ok: true,
    accountStatus: "active",
    message: "تم إلغاء طلب الحذف — حسابك نشط كما كان.",
  });
}
