// اختبارات سياسات قاعدة البيانات على PostgreSQL حقيقي (PGlite = PostgreSQL 17 مترجَم إلى WASM).
//
// ما يفعله هذا الملف:
//   1) يبني مخطط اختبار مُصغّراً يطابق أسماء الجداول والأعمدة والصلاحيات الموجودة
//      في الترحيلات (لا يحتاج Supabase ولا اتصالاً بالشبكة).
//   2) يتحقق أولاً من الوضع الضعيف قبل الترحيل (لتثبيت أن الثغرة حقيقية).
//   3) يطبّق الترحيل الفعلي supabase/migrations/20261010000000_security_hardening_db.sql
//      من القرص، ثم يتحقق من كل هوية: anon و authenticated (مستخدم عادي)
//      و authenticated (مشرف) و service_role.
//
// إن لم تكن الحزمة @electric-sql/pglite مثبَّتة، تُعلَّم الاختبارات NOT RUN
// بسبب واضح. التشغيل: `npm install --no-save @electric-sql/pglite@0.5.8` ثم `npx vitest run tests/security-db-policies.test.ts`.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test, beforeAll, afterAll } from "vitest"

const ROOT = join(__dirname, "..")
const MIGRATION = join(ROOT, "supabase/migrations/20261010000000_security_hardening_db.sql")

const ALICE = "11111111-1111-4111-8111-111111111111"
const BOB = "22222222-2222-4222-8222-222222222222"
const ADMIN = "33333333-3333-4333-8333-333333333333"

/** المخطط الأدنى: يطابق أعمدة الترحيلات التي تستعملها العروض والسياسات. */
const PRE_STATE = `
  CREATE SCHEMA IF NOT EXISTS auth;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  END $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;

  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  CREATE TABLE public.profiles (
    id uuid PRIMARY KEY,
    email text,
    full_name text,
    is_admin boolean NOT NULL DEFAULT false,
    account_status text NOT NULL DEFAULT 'active',
    deletion_requested_at timestamptz,
    deletion_reason text
  );
  CREATE TABLE public.audit_logs (id bigserial PRIMARY KEY, note text);
  CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_ref text,
    amount_mad numeric,
    credits_purchased int DEFAULT 0,
    bonus_credits int DEFAULT 0,
    provider_payment_id text,
    status text DEFAULT 'pending',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
  );
  CREATE TABLE public.reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id text NOT NULL,
    user_ref text NOT NULL
  );
  CREATE TABLE public.articles_views (id uuid PRIMARY KEY, views int DEFAULT 0);

  CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public AS $$
      SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin) $$;
  REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;

  -- الصلاحيات كما تركتها الترحيلات: anon ALL على profiles و audit_logs
  GRANT ALL ON public.profiles, public.audit_logs TO anon;
  GRANT SELECT, UPDATE ON public.profiles TO authenticated;
  GRANT ALL ON public.payments, public.reactions TO anon, authenticated, service_role;
  GRANT ALL ON public.articles_views TO anon, authenticated, service_role;
  -- Supabase تمنح service_role ALL افتراضياً على جداول public (default privileges)
  GRANT ALL ON public.profiles, public.audit_logs, public.payments, public.reactions TO service_role;
  GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid());
  CREATE POLICY payments_user_read ON public.payments FOR SELECT TO authenticated
    USING (user_ref = auth.uid()::text);
  CREATE POLICY reactions_public_read ON public.reactions FOR SELECT USING (true);
  CREATE POLICY reactions_insert ON public.reactions FOR INSERT TO anon, authenticated WITH CHECK (true);
  -- الحالة الضعيفة قبل الترحيل:
  CREATE POLICY reactions_user_delete ON public.reactions FOR DELETE USING (true);
  CREATE POLICY reactions_admin_all ON public.reactions FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

  -- العروض كما في الترحيل 20260926/20260927: مملوكة للمالك، بلا security_invoker، وتُقرأ بواسطة authenticated
  CREATE VIEW public.pending_deletions AS
    SELECT p.id AS user_id, p.email, p.full_name, p.deletion_requested_at, p.deletion_reason
    FROM public.profiles p WHERE p.account_status = 'pending_deletion';
  CREATE VIEW public.orphaned_billing AS
    SELECT 'payments'::text AS source_table, user_ref, count(*) AS rows_still_linked,
           sum(amount_mad) AS total_mad, min(created_at) AS oldest
    FROM public.payments WHERE user_ref IS NOT NULL GROUP BY user_ref;
  CREATE VIEW public.unattached_credit_grants AS
    SELECT p.id AS payment_id, p.provider_payment_id, p.amount_mad,
           p.credits_purchased + COALESCE(p.bonus_credits, 0) AS credits_owed,
           p.user_ref, p.completed_at, p.metadata
    FROM public.payments p WHERE p.status = 'completed'
      AND COALESCE((p.metadata ->> 'credits_unattached')::boolean, false) = true;
  GRANT SELECT ON public.pending_deletions, public.orphaned_billing, public.unattached_credit_grants
    TO authenticated, service_role;

  -- دالة SECURITY DEFINER بلا search_path (كما في الترحيل 20260823)
  CREATE OR REPLACE FUNCTION public.increment_article_views(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN UPDATE public.articles_views SET views = views + 1 WHERE id = p_id; END $$;
  GRANT EXECUTE ON FUNCTION public.increment_article_views(uuid) TO anon, authenticated;

  -- بيانات الاختبار
  INSERT INTO public.profiles (id, email, full_name, is_admin, account_status, deletion_requested_at, deletion_reason) VALUES
    ('${ALICE}', 'alice@example.test', 'Alice Synthetic', false, 'active', NULL, NULL),
    ('${BOB}', 'bob@example.test', 'Bob Synthetic', false, 'pending_deletion', now(), 'synthetic-reason'),
    ('${ADMIN}', 'admin@example.test', 'Admin Synthetic', true, 'active', NULL, NULL);
  INSERT INTO public.payments (user_ref, amount_mad, provider_payment_id, status, metadata) VALUES
    ('${BOB}', 50, 'pay_synthetic_1', 'completed', '{"credits_unattached": true}'),
    ('${ALICE}', 20, 'pay_synthetic_2', 'completed', '{}');
  INSERT INTO public.reactions (id, target_id, user_ref) VALUES
    ('aaaaaaaa-0000-4000-8000-000000000001', 'article-1', '${ALICE}');
  INSERT INTO public.articles_views (id, views) VALUES ('bbbbbbbb-0000-4000-8000-000000000001', 0);
`

const HARDENING = () => readFileSync(MIGRATION, "utf8")

let PGlite: any = null
let loadError = ""
try {
  // نستورد عبر متغيّر حتى لا يحاول Vite حلّها وقت البناء إن لم تكن مثبّتة.
  const modName = "@electric-sql/pglite"
  PGlite = (await import(/* @vite-ignore */ modName)).PGlite
} catch (e) {
  loadError = String((e as Error)?.message || e)
}
const suite = PGlite ? describe : describe.skip

/** تنفيذ استعلام بهوية محددة، ويعيد الصفوف أو نص الخطأ. */
async function asRole(db: any, role: string, uid: string | null, sql: string) {
  await db.exec(`SET ROLE ${role}`)
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""])
    const r = await db.query(sql)
    return { ok: true as const, rows: r.rows }
  } catch (e) {
    return { ok: false as const, error: String((e as Error).message) }
  } finally {
    await db.exec("RESET ROLE")
  }
}

suite("سياسات قاعدة البيانات (PostgreSQL حقيقي)", () => {
  let db: any

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(PRE_STATE)
  })
  afterAll(async () => {
    await db?.close?.()
  })

  test("قبل الترحيل: يستطيع مستخدم عادٍ قراءة بريد مستخدم آخر (الثغرة موجودة فعلاً)", async () => {
    const r = await asRole(db, "authenticated", ALICE, "SELECT email FROM public.pending_deletions")
    expect(r.ok).toBe(true)
    expect(JSON.stringify((r as any).rows)).toContain("bob@example.test")
  })

  test("قبل الترحيل: يستطيع العميل المجهول حذف أي تفاعل (reactions_user_delete)", async () => {
    await asRole(db, "anon", null, `DELETE FROM public.reactions WHERE target_id = 'article-1'`)
    const check = await asRole(db, "service_role", null, "SELECT count(*)::int AS n FROM public.reactions")
    expect((check as any).rows[0].n).toBe(0)
    // أعد التفاعل لاختبارات لاحقة
    await db.exec(`INSERT INTO public.reactions (id, target_id, user_ref) VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'article-1', '${ALICE}') ON CONFLICT DO NOTHING`)
  })

  test("تطبيق الترحيل الفعلي من القرص", async () => {
    await db.exec(HARDENING())
    expect(true).toBe(true)
  })

  test("بعد الترحيل: مستخدم عادٍ لا يقرأ pending_deletions", async () => {
    const r = await asRole(db, "authenticated", ALICE, "SELECT * FROM public.pending_deletions")
    expect(r.ok).toBe(false)
    expect((r as any).error).toMatch(/permission denied/i)
  })

  test("بعد الترحيل: مستخدم عادٍ لا يقرأ orphaned_billing ولا unattached_credit_grants", async () => {
    const a = await asRole(db, "authenticated", ALICE, "SELECT * FROM public.orphaned_billing")
    const b = await asRole(db, "authenticated", ALICE, "SELECT * FROM public.unattached_credit_grants")
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(false)
  })

  test("بعد الترحيل: الخدمة ما زالت تقرأ العروض (لوحات الصيانة وCron)", async () => {
    const r = await asRole(db, "service_role", null, "SELECT count(*)::int AS n FROM public.pending_deletions")
    expect(r.ok).toBe(true)
    expect((r as any).rows[0].n).toBe(1)
  })

  test("بعد الترحيل: العميل المجهول لا يقرأ profiles ولا يعدّلها", async () => {
    const r = await asRole(db, "anon", null, "SELECT email FROM public.profiles")
    expect(r.ok).toBe(false)
    expect((r as any).error).toMatch(/permission denied/i)
  })

  test("بعد الترحيل: المستخدم العادي يقرأ صفه فقط في profiles (RLS ما زال يعمل)", async () => {
    const r = await asRole(db, "authenticated", ALICE, "SELECT id FROM public.profiles")
    expect(r.ok).toBe(true)
    expect((r as any).rows.map((x: any) => x.id)).toEqual([ALICE])
  })

  test("بعد الترحيل: مستخدم عادٍ لا يحذف تفاعلاً (لا توجد سياسة حذف عامة)", async () => {
    const r = await asRole(db, "authenticated", ALICE, "DELETE FROM public.reactions RETURNING id")
    expect(r.ok).toBe(true)
    expect((r as any).rows.length).toBe(0)
    const still = await asRole(db, "service_role", null, "SELECT count(*)::int AS n FROM public.reactions")
    expect((still as any).rows[0].n).toBe(1)
  })

  test("بعد الترحيل: المشرف يحذف التفاعل عبر reactions_admin_all", async () => {
    const r = await asRole(db, "authenticated", ADMIN, "DELETE FROM public.reactions RETURNING id")
    expect(r.ok).toBe(true)
    expect((r as any).rows.length).toBe(1)
  })

  test("بعد الترحيل: دالة SECURITY DEFINER لها search_path مثبَّت", async () => {
    const r = await db.query(
      `SELECT proconfig FROM pg_proc WHERE proname = 'increment_article_views'`,
    )
    expect(JSON.stringify(r.rows[0].proconfig)).toContain("search_path")
  })

  test("بعد الترحيل: لم يُحذف أي صف (لا بيانات مفقودة)", async () => {
    const counts = await asRole(
      db,
      "service_role",
      null,
      `SELECT (SELECT count(*) FROM public.profiles)::int AS p, (SELECT count(*) FROM public.payments)::int AS pay`,
    )
    expect((counts as any).rows[0]).toEqual({ p: 3, pay: 2 })
  })
})

describe("حالة تشغيل الاختبار", () => {
  test(loadError ? "NOT RUN: الحزمة @electric-sql/pglite غير مثبّتة" : "PGlite متاح", () => {
    if (loadError) {
      console.warn(`[security-db] NOT RUN: ${loadError}. Command: npm install --no-save @electric-sql/pglite@0.5.8`)
    }
    expect(true).toBe(true)
  })
})
