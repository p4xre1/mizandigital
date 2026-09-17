/**
 * اختبارات ترحيل 20260926000000 — أساس الإدارة والحذف الناعم والتدقيق.
 *
 * لا PostgreSQL حقيقياً متاحاً هنا، فالاختبارات ساكنة على نص الترحيل. هذا
 * مقصود: ما نختبره هو وجود الضمانات نفسها (سياسات، صلاحيات، search_path،
 * قيود)، وهي خصائص نصية يمكن التحقق منها بدقة. ما لا يمكن اختباره ساكناً —
 * سلوك plpgsql الفعلي — موثّق في DEPLOY-SUPABASE.md كخطوات تحقق يدوية.
 */
import { readFileSync } from "node:fs"
import { beforeAll, describe, expect, it } from "vitest"

const MIGRATION = "supabase/migrations/20260926000000_admin_actions_soft_delete_and_audit.sql"
let sql = ""

beforeAll(() => {
  // "utf8" إلزامي: بدونه تُرجع readFileSync Buffer وتفشل toContain على نص.
  sql = readFileSync(MIGRATION, "utf8")
})

/** يستخرج جسم دالة CREATE FUNCTION بالاسم. */
function fnBody(name: string): string {
  const start = sql.indexOf(`FUNCTION public.${name}(`)
  expect(start, `function ${name} must exist`).toBeGreaterThan(-1)
  const end = sql.indexOf("$$;", start)
  expect(end, `body of ${name} must terminate`).toBeGreaterThan(start)
  return sql.slice(start, end)
}

/** كل مقاطع CREATE ... FUNCTION في الملف. */
function allFunctions(): string[] {
  return [...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.([a-z_]+)\(/g)].map((m) => m[1])
}

// ─────────────────────────────────────────────────────────────────────────────

describe("سجل التدقيق غير قابل للتلاعب", () => {
  it("لا سياسة INSERT ولا UPDATE ولا DELETE على admin_audit_logs", () => {
    const policies = [...sql.matchAll(/CREATE POLICY (\w+)\s+ON public\.admin_audit_logs FOR (\w+)/g)]
    for (const [, name, verb] of policies) {
      expect(verb, `policy ${name} must be read-only`).toBe("SELECT")
    }
    expect(policies.length, "at least the admin read policy").toBeGreaterThan(0)
  })

  it("RLS مفعّل والصلاحيات مسحوبة من anon", () => {
    expect(sql).toContain("ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY")
    expect(sql).toMatch(/REVOKE ALL ON public\.admin_audit_logs FROM PUBLIC, anon, authenticated/)
  })

  it("القراءة مقيّدة بـ is_admin()", () => {
    expect(sql).toMatch(/POLICY admin_audit_logs_admin_read[\s\S]*?USING \(public\.is_admin\(\)\)/)
  })

  it("لا إجراء بلا سبب مكتوب بحدّ أدنى", () => {
    expect(sql).toMatch(/reason\s+text NOT NULL CHECK \(char_length\(btrim\(reason\)\) BETWEEN 10 AND 500\)/)
    expect(fnBody("admin_log_action")).toContain("at least 10 characters is required")
  })

  it("إجراء آلي لا يُنسب إلى فاعل بشري", () => {
    expect(sql).toContain("system_generated boolean NOT NULL DEFAULT false")
    expect(sql).toMatch(/CHECK \(actor_id IS NOT NULL OR system_generated\)/)
    expect(fnBody("admin_log_action")).toContain("a system action must not name a human actor")
  })
})

describe("كل دالة إدارية مقفلة", () => {
  const adminFns = [
    "admin_log_action",
    "admin_adjust_credits",
    "admin_set_pro",
    "admin_restore_account",
    "admin_log_session_revocation",
    "list_expired_deletions",
    "anonymize_orphaned_billing",
  ]

  it.each(adminFns)("%s: SECURITY DEFINER + search_path مثبّت", (name) => {
    // search_path غير مثبّت في SECURITY DEFINER = اختطاف عبر مخطط خبيث.
    const block = sql.slice(sql.indexOf(`FUNCTION public.${name}(`))
    const head = block.slice(0, block.indexOf("$$;"))
    expect(head, `${name} must be SECURITY DEFINER`).toContain("SECURITY DEFINER")
    expect(head, `${name} must pin search_path`).toMatch(/SET search_path = public|SET "search_path" TO 'public'/)
  })

  it.each(adminFns)("%s: ممنوحة لـ service_role فقط", (name) => {
    const re = new RegExp(
      `REVOKE ALL ON FUNCTION public\\.${name}\\([^)]*\\) FROM PUBLIC;\\s*GRANT EXECUTE ON FUNCTION public\\.${name}\\([^)]*\\) TO service_role;`,
      "g"
    )
    expect(sql.match(re), `${name} must be service_role-only`).not.toBeNull()
    // وألا تُمنح لـ authenticated إطلاقاً
    expect(sql, `${name} must NOT be granted to authenticated`).not.toMatch(
      new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^)]*\\) TO authenticated`)
    )
  })

  it("طلب الحذف الذاتي هو الوحيد الممنوح للمستخدمين", () => {
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.request_account_deletion\(text\) TO authenticated/
    )
    expect(fnBody("request_account_deletion")).toContain("SELECT auth.uid()")
    // ولا يقبل معرّف مستخدم آخر: لا معامَل له أصلاً
    expect(fnBody("request_account_deletion")).not.toContain("p_target_user_id")
  })

  it("لا دالة إدارية جديدة بلا تسجيل في السجل", () => {
    for (const name of ["admin_adjust_credits", "admin_set_pro", "admin_restore_account"]) {
      expect(fnBody(name), `${name} must audit itself`).toContain("admin_log_action")
    }
  })
})

describe("الحذف الناعم والمادة 26", () => {
  it("أعمدة الحالة موجودة مع قيد اتساق", () => {
    expect(sql).toMatch(/account_status text NOT NULL DEFAULT 'active'/)
    expect(sql).toContain("deletion_requested_at timestamptz NULL")
    expect(sql).toMatch(/CHECK \(\(account_status = 'pending_deletion'\) = \(deletion_requested_at IS NOT NULL\)\)/)
  })

  it("الحالة نصّية لا enum (إضافة قيمة enum داخل معاملة تفشل)", () => {
    expect(sql).not.toMatch(/CREATE TYPE public\.account_status/)
    expect(sql).toContain("CHECK (account_status IN ('active','pending_deletion','suspended'))")
  })

  it("عرض اللوحة يحسب العدّاد التنازلي", () => {
    expect(sql).toMatch(/VIEW public\.pending_deletions/)
    expect(sql).toContain("days_remaining")
    expect(sql).toContain("interval '30 days'")
    // لا قيمة سالبة بعد انقضاء المهلة
    expect(sql).toMatch(/GREATEST\(0,[\s\S]*?days_remaining/)
  })

  it("الطلب المكرر لا يمدّد المهلة إلى الأبد", () => {
    expect(fnBody("request_account_deletion")).toContain("already_requested")
  })

  it("الإخفاء يحفظ المبالغ والتواريخ ومعرّفات Stripe", () => {
    const body = fnBody("anonymize_orphaned_billing")
    // ما يُصفَّر هو الهوية وحدها
    expect(body).toContain("user_ref = NULL")
    expect(body).toContain("clerk_user_id = NULL")
    // لا يمسّ الأرقام ولا التواريخ ولا معرّفات Stripe
    expect(body).not.toMatch(/SET[\s\S]{0,400}?amount_mad\s*=/)
    expect(body).not.toMatch(/SET[\s\S]{0,400}?created_at\s*=/)
    expect(body).not.toMatch(/SET[\s\S]{0,400}?provider_payment_id\s*=/)
    expect(body).not.toMatch(/DELETE FROM public\.payments/)
    expect(body).not.toMatch(/DELETE FROM public\.credit_transactions/)
  })

  it("الإخفاء يستثني معرّفات Clerk القديمة — لا يخمّن", () => {
    const body = fnBody("anonymize_orphaned_billing")
    expect(body).toMatch(/user_ref ~ '\^\[0-9a-fA-F\]\{8\}-/)
  })

  it("الإخفاء قابل للتكرار بلا إعادة كتابة", () => {
    expect(fnBody("anonymize_orphaned_billing")).toContain("user_ref <> 'anonymized'")
  })

  it("لا حذف SQL لـ auth.users — الطريق المدعوم Auth Admin API", () => {
    expect(sql).not.toMatch(/DELETE FROM auth\.users/i)
    expect(sql).not.toMatch(/DELETE FROM public\.profiles/)
    expect(sql).toContain("auth/v1/admin/users/")
  })

  it("يوجد عرض يكشف السجلات التي فات إخفاؤها", () => {
    expect(sql).toMatch(/VIEW public\.orphaned_billing/)
  })
})

describe("تسليم محتوى Pro", () => {
  it("وعاء pro-documents خاص لا عام", () => {
    expect(sql).toMatch(/VALUES \('pro-documents', 'pro-documents', false,/)
  })

  it("القراءة تشترط is_pro ومطابقة المالك وحساباً نشطاً", () => {
    const policy = sql.slice(sql.indexOf("CREATE POLICY pro_documents_owner_read"))
    const body = policy.slice(0, policy.indexOf(";"))
    expect(body).toContain("bucket_id = 'pro-documents'")
    expect(body).toMatch(/\(storage\.foldername\(name\)\)\[1\] = \(SELECT auth\.uid\(\)\)::text/)
    expect(body).toContain("p.is_pro = true")
    expect(body).toContain("p.account_status = 'active'")
  })

  it("الوعاء العام documents لم يُقيَّد — المكتبة المجانية تبقى متاحة", () => {
    expect(sql).not.toMatch(/DROP POLICY IF EXISTS "documents_public_read"/)
    expect(sql).not.toMatch(/DROP POLICY IF EXISTS documents_public_read/)
  })

  it("الرفع للأدمن فقط — لا يستبدل العميل ملفه الممهور", () => {
    const policy = sql.slice(sql.indexOf("CREATE POLICY pro_documents_admin_manage"))
    expect(policy.slice(0, policy.indexOf(";"))).toContain("public.is_admin()")
  })
})

describe("حدود الصلاحيات", () => {
  it("is_admin_or_dev() القنبلة الموقوتة أُزيلت", () => {
    // كانت تقارن role بـ 'Admin'/'Developer' وقيم enum الفعلية
    // ('super_admin','member','editor') ⇒ ترمي وقت التنفيذ، وممنوحة لـ authenticated.
    expect(sql).toMatch(/DROP FUNCTION IF EXISTS public\.is_admin_or_dev\(\)/)
  })

  it("لا اختراع لقيمة role غير موجودة", () => {
    // 'admin' و'root' ليستا من قيم user_role — استعمالهما يرمي
    // «invalid input value for enum user_role».
    expect(sql).not.toMatch(/role IN \('admin'/)
    expect(sql).not.toMatch(/role = 'admin'/)
  })

  it("منح الكريدتس مقيّد بسقف يمنع الخطأ المطبعي", () => {
    const body = fnBody("admin_adjust_credits")
    expect(body).toContain("abs(p_amount) > 100000")
    expect(body).toContain("p_amount = 0")
  })

  it("منح الكريدتس يمرّ عبر الدفتر العام لا عبر عمود وحيد", () => {
    const body = fnBody("admin_adjust_credits")
    expect(body).toContain("INSERT INTO public.credit_transactions")
    expect(body).toMatch(/'admin_grant' ELSE 'admin_revoke'/)
    // يعدّل bonus_credits لا daily_credits (اليومي يتجدد فيضيع التعديل)
    expect(body).toMatch(/SET bonus_credits = GREATEST\(0, bonus_credits \+ p_amount\)/)
  })

  it("تمديد Pro يستعمل قيم enum موجودة فعلاً", () => {
    const body = fnBody("admin_set_pro")
    expect(body).toContain("'active'::public.subscription_status")
    expect(body).toContain("'canceled'::public.subscription_status")
    expect(body).toContain("abs(p_days) > 3650")
  })

  it("لا يبتدع عمود انتهاء — subscription_ends_at موجود في القاعدة الحية", () => {
    // كان في المسودة الأولى عمود pro_expires_at جديد، وهو ثالث عمود انتهاء
    // بجانب subscription_ends_at وsubscription_current_period_end.
    // نفحص التعريف والاستعمال لا ذكر الاسم في تعليق يشرح لماذا رُفض.
    expect(sql).not.toMatch(/ADD COLUMN IF NOT EXISTS pro_expires_at/)
    expect(sql).not.toMatch(/SET pro_expires_at|pro_expires_at =/)
    expect(sql).toContain("subscription_ends_at")
  })

  it("يحدّث نسختي is_pro معاً — profiles وmizan_profiles", () => {
    // is_pro مكرَّر على الجدولين، والواجهة العامة تقرأ mizan_profiles.
    const body = fnBody("admin_set_pro")
    expect(body).toContain("UPDATE public.mizan_profiles")
    expect(body).toMatch(/SET is_pro = v_active/)
    expect(body).toContain("WHERE owner_id = p_target_user_id")
  })

  it("يعدّل رصيد الاستهلاك الصحيح: bonus_credits على profiles", () => {
    // mizan_profiles.credits عملة تقدّم RPG مختلفة، لا رصيداً مشتريً.
    expect(fnBody("admin_adjust_credits")).not.toContain("mizan_profiles")
    expect(fnBody("admin_adjust_credits")).toContain("INSERT INTO public.credit_transactions")
  })

  it("الاستعادة ترفض حساباً ليس في مهلة الحذف بدل نجاح كاذب", () => {
    expect(fnBody("admin_restore_account")).toContain("account is not pending deletion")
  })

  it("كل دوال الملف مثبّتة search_path", () => {
    for (const name of allFunctions()) {
      expect(fnBody(name).length, name).toBeGreaterThan(0)
    }
    const defs = [...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.([a-z_]+)\(([\s\S]*?)\$\$;/g)]
    // ثماني دوال: admin_log_action, admin_adjust_credits, admin_set_pro,
    // admin_restore_account, admin_log_session_revocation, request_account_deletion,
    // list_expired_deletions, anonymize_orphaned_billing.
    expect(defs.length, "should have found every function").toBe(8)
    for (const [, name, block] of defs) {
      expect(block, `${name} must pin search_path`).toMatch(/SET search_path = public/)
    }
  })
})
