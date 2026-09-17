/**
 * اختبارات 20260927000000 — الدفعة تُكمَل والرصيد يزيد فعلاً.
 *
 * الخلل كان: complete_payment_and_grant_credits تحدّث حالة الدفعة وتكتب سطر
 * الدفتر، ولا تزيد profiles.bonus_credits. العميل يدفع ويستلم سطراً في سجل
 * لا رصيداً يُنفِق منه.
 */
import { readFileSync } from "node:fs"
import { beforeAll, describe, expect, it } from "vitest"

const MIGRATION = "supabase/migrations/20260927000000_fix_credit_grant_balance.sql"
let sql = ""
let body = ""

beforeAll(() => {
  sql = readFileSync(MIGRATION, "utf8")
  const start = sql.indexOf('FUNCTION "public"."complete_payment_and_grant_credits"')
  expect(start).toBeGreaterThan(-1)
  body = sql.slice(start, sql.indexOf("$$;", start))
})

describe("الرصيد يزيد فعلاً", () => {
  it("تحدّث profiles.bonus_credits — وهو ما كان ناقصاً", () => {
    expect(body).toMatch(/UPDATE public\.profiles\s+SET bonus_credits = bonus_credits \+ v_grant/)
  })

  it("الزيادة محسوبة من صفّ الدفعة لا من معامَل مفقود", () => {
    expect(body).toContain("v_payment.credits_purchased + COALESCE(v_payment.bonus_credits, 0)")
  })

  it("ترفض منحة غير موجبة بدل تمرير صفر بصمت", () => {
    expect(body).toContain("Computed grant must be positive")
  })

  it("تكتب balance_after الحقيقي في الدفتر", () => {
    expect(body).toMatch(/RETURNING bonus_credits INTO v_new_balance/)
    expect(body).toContain("v_new_balance")
  })
})

describe("idempotency — لا منح مزدوج", () => {
  it("ما زالت تشترط status = 'pending'", () => {
    expect(body).toMatch(/WHERE id = p_payment_id AND status = 'pending'/)
    expect(body).toContain("Payment not found or not pending")
  })

  it("التوقيع والعائد بلا تغيير حتى لا ينكسر الـ webhook", () => {
    expect(sql).toMatch(/p_payment_id uuid\s*\)\s*RETURNS boolean/)
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toMatch(/SET search_path = ''/)
  })

  it("الصلاحيات مطابقة للترحيل الأصلي", () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION "public"\."complete_payment_and_grant_credits"\(uuid\) FROM PUBLIC/)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION "public"\."complete_payment_and_grant_credits"\(uuid\) TO authenticated/)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION "public"\."complete_payment_and_grant_credits"\(uuid\) TO service_role/)
  })
})

describe("الدفع الضيف: المال مقبوض فلا يُتلف", () => {
  it("user_ref يُتحقَّق من شكله قبل التحويل — لا رمي على معرّف Clerk", () => {
    expect(body).toMatch(/v_payment\.user_ref ~ '\^\[0-9a-fA-F\]\{8\}-/)
    expect(body).toContain("v_user := v_payment.user_ref::uuid")
  })

  it("عند تعذّر المصاحبة تعلّم الدفعة ولا تُبقيها معلّقة", () => {
    // إبقاء الدفعة معلّقة كان يجعل Stripe تعيد التسليم إلى الأبد على دفعة صحيحة.
    expect(body).toContain("'credits_unattached', true")
    expect(body).toContain("unattached_reason")
    // والحالة تبقى completed
    expect(body).toMatch(/SET status = 'completed'/)
  })

  it("إن لم يوجد صفّ بروفايل يُعاد اعتبار الدفعة غير مصاحَبة", () => {
    // RETURNING يبقى NULL عندما لا يطابق التحديث أي صفّ
    expect(body).toMatch(/IF v_new_balance IS NULL THEN\s+v_user := NULL;/)
  })

  it("user_ref في الدفتر NOT NULL فيُعوَّض بقيمة صريحة", () => {
    expect(body).toContain("COALESCE(v_payment.user_ref, 'unattached')")
  })

  it("يوجد عرض يكشف الدفعات المكتملة بلا رصيد مُلحَق", () => {
    expect(sql).toMatch(/VIEW public\.unattached_credit_grants/)
    expect(sql).toContain("credits_owed")
    expect(sql).toMatch(/status = 'completed'/)
  })
})

describe("حدود", () => {
  it("لا تلمس mizan_profiles.credits — عملة RPG مختلفة", () => {
    expect(body).not.toContain("mizan_profiles")
  })

  it("لا سياسة على view (كانت سترمي «is not a table»)", () => {
    expect(sql).not.toMatch(/CREATE POLICY \w+ ON public\.unattached_credit_grants/)
    expect(sql).not.toMatch(/DROP POLICY IF EXISTS \w+ ON public\.unattached_credit_grants/)
  })

  it("لا تعيد اشتقاق الرصيد من الدفتر — الدفتر غير مكتمل تاريخياً", () => {
    expect(body).not.toMatch(/sum\(/i)
    expect(body).not.toContain("SELECT sum")
  })
})
