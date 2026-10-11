// لعبة «من الواقعة إلى الحل» على PostgreSQL حقيقي (PGlite = PostgreSQL 17 مترجَم إلى WASM).
//
// ما يفعله هذا الملف:
//   1) يطبّق الترحيلات الفعلية من القرص: 20261012000250 (تقاعد التصميم السابق —
//      لا-عملية على قاعدة نظيفة) ثم 20261012000300 (الجدول والعرض ودالة التصحيح)
//      ثم 20261012000400 (بذر الحالات العشر)، فوق بيئة Supabase مصغّرة.
//   2) يتحقق بكل هوية (anon و authenticated عادي ومشرف) من أن الزوار يرون الحالات المنشورة
//      عبر العرض العام فقط، بلا الجواب ولا الشرح ولا نصوص المواد، وأن الكشف يمر عبر
//      legal_case_check وحدها: تلميح عند الخطأ، والجواب والشرح والمواد عند الصواب.
//   3) يتحقق من أن العرض للقراءة فقط: الصلاحيات الافتراضية تحاكي Supabase (كل جدول/عرض
//      جديد في public يُمنح ALL لـ anon و authenticated و service_role)، فلو كان العرض
//      بصلاحية المالك على الجدول مباشرة لاستطاع أي زائر تعديل الحالات المنشورة أو حذفها.
//
// إن لم تكن الحزمة @electric-sql/pglite مثبَّتة، تُعلَّم الاختبارات NOT RUN.
// التشغيل: `npx vitest run tests/legal-cases-rls.test.ts`.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test, beforeAll, afterAll } from "vitest"

const ROOT = join(__dirname, "..")
const migration = (name: string) => readFileSync(join(ROOT, "supabase/migrations", name), "utf8")
const RETIRE = "20261012000250_legal_cases_retire_previous_design.sql"
const SCHEMA = "20261012000300_legal_cases_game.sql"
const SEED = "20261012000400_legal_cases_seed.sql"

const seedData = JSON.parse(readFileSync(join(ROOT, "data/cases/cases.json"), "utf8")) as {
  cases: { slug: string; answer_index: number; hint: string }[]
}

const ALICE = "11111111-1111-4111-8111-111111111111"
const ADMIN = "33333333-3333-4333-8333-333333333333"

const SAFE_COLUMNS = [
  "id", "slug", "title", "law_code", "difficulty", "story", "question", "options",
  "hint", "image_url", "image_alt", "reviewed_by", "reviewed_on", "updated_at",
]

/** الحد الأدنى من بيئة Supabase التي يحتاجها الترحيلان. */
const PRE_STATE = `
  CREATE SCHEMA IF NOT EXISTS auth;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  END $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  -- كما في Supabase: الكائنات التي ينشئها postgres في public تُمنح للأدوار الثلاثة تلقائياً
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  CREATE TABLE public.test_admins (id uuid PRIMARY KEY);
  CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = '' AS $$ SELECT EXISTS (SELECT 1 FROM public.test_admins WHERE id = auth.uid()) $$;
  REVOKE ALL ON public.test_admins FROM anon, authenticated;

  INSERT INTO auth.users (id) VALUES ('${ALICE}'), ('${ADMIN}');
  INSERT INTO public.test_admins (id) VALUES ('${ADMIN}');
`

let PGlite: any = null
try {
  // نستورد عبر متغيّر حتى لا يحاول Vite حلّها وقت البناء إن لم تكن مثبّتة.
  const modName = "@electric-sql/pglite"
  PGlite = (await import(/* @vite-ignore */ modName)).PGlite
} catch {
  PGlite = null
}
const suite = PGlite ? describe.sequential : describe.skip

type RoleResult = { ok: true; rows: any[] } | { ok: false; error: string }

/** تنفيذ استعلام بهوية محددة، ويعيد الصفوف أو نص الخطأ. */
async function asRole(db: any, role: string, uid: string | null, sql: string, params: unknown[] = []): Promise<RoleResult> {
  await db.exec(`SET ROLE ${role}`)
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""])
    const r = await db.query(sql, params)
    return { ok: true, rows: r.rows }
  } catch (e) {
    return { ok: false, error: String((e as Error).message) }
  } finally {
    await db.exec("RESET ROLE")
  }
}

const VISITORS: Array<[string, string, string | null]> = [
  ["زائر (anon)", "anon", null],
  ["مستخدم عادي (authenticated)", "authenticated", ALICE],
]

const first = seedData.cases[0]
const wrongChoice = (first.answer_index + 1) % 4

suite("لعبة الحالات القانونية — الجدول والعرض ودالة التصحيح (PostgreSQL حقيقي)", () => {
  let db: any

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(PRE_STATE)
    await db.exec(migration(RETIRE))
    await db.exec(migration(SCHEMA))
    await db.exec(migration(SEED))
    // مسودة غير منشورة لاختبار أنها لا تظهر للزوار
    await db.exec(`
      INSERT INTO public.legal_cases (slug, title, law_code, difficulty, story, question, options, answer_index, hint, explanation, articles, published)
      VALUES ('draft-case', 'حالة مسودة', 'constitution-2011', 'easy',
        'قصة تجريبية طويلة بما يكفي لتجاوز الحد الأدنى من الطول المطلوب في القيد.',
        'ما الحكم في هذه الحالة؟', '["أ1","ب2","ج3","د4"]', 2, 'تلميح المسودة', 'شرح المسودة السري',
        '[{"law":"constitution-2011","article":24,"text":"نص"}]', false);
    `)
  }, 30_000)

  afterAll(async () => {
    await db?.close?.()
  })

  test("البذر: الحالات العشر منشورة بمراجع مسجّل", async () => {
    const r = await db.query("SELECT count(*)::int AS n, count(*) FILTER (WHERE reviewed_by <> '')::int AS reviewed FROM public.legal_cases WHERE published")
    expect(r.rows[0]).toEqual({ n: seedData.cases.length, reviewed: seedData.cases.length })
  })

  test("العرض العام: الأعمدة الآمنة فقط، وصلاحية SELECT وحدها للزوار", async () => {
    const cols = await db.query(
      `SELECT attname FROM pg_attribute WHERE attrelid = 'public.legal_cases_public'::regclass AND attnum > 0 ORDER BY attnum`,
    )
    expect(cols.rows.map((r: any) => r.attname)).toEqual(SAFE_COLUMNS)
    const privs = await db.query(`
      SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS p
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = 'legal_cases_public' AND grantee IN ('anon', 'authenticated', 'PUBLIC')
      GROUP BY grantee ORDER BY grantee`)
    expect(privs.rows).toEqual([
      { grantee: "anon", p: "SELECT" },
      { grantee: "authenticated", p: "SELECT" },
    ])
  })

  for (const [label, role, uid] of VISITORS) {
    test(`${label}: يرى الحالات المنشورة فقط عبر العرض`, async () => {
      const r = await asRole(db, role, uid, "SELECT slug FROM public.legal_cases_public ORDER BY slug")
      expect(r.ok).toBe(true)
      const slugs = (r as any).rows.map((x: any) => x.slug)
      expect(slugs).toHaveLength(seedData.cases.length)
      expect(slugs).not.toContain("draft-case")
    })

    test(`${label}: لا يقرأ الجدول الأساسي (لا جواب ولا شرح ولا مواد)`, async () => {
      const r = await asRole(db, role, uid, "SELECT answer_index, explanation, articles FROM public.legal_cases")
      // anon: لا صلاحية أصلاً. authenticated: صلاحية للإدارة عبر RLS فقط ⇒ لا صفوف.
      if (r.ok) expect(r.rows).toEqual([])
      else expect(r.error).toMatch(/permission denied/)
    })

    test(`${label}: لا يكتب عبر العرض العام ولا في الجدول`, async () => {
      for (const sql of [
        "UPDATE public.legal_cases_public SET title = 'مخترَق' WHERE slug = '" + first.slug + "'",
        "DELETE FROM public.legal_cases_public WHERE slug = '" + first.slug + "'",
        "UPDATE public.legal_cases SET title = 'مخترَق' WHERE slug = '" + first.slug + "'",
        "DELETE FROM public.legal_cases WHERE slug = '" + first.slug + "'",
      ]) {
        await asRole(db, role, uid, sql)
      }
      const r = await db.query("SELECT title FROM public.legal_cases WHERE slug = $1", [first.slug])
      expect(r.rows).toHaveLength(1)
      expect(r.rows[0].title).not.toBe("مخترَق")
    })

    test(`${label}: الخطأ يعيد التلميح فقط، والصواب يكشف الجواب والشرح والمواد`, async () => {
      const wrong = await asRole(db, role, uid, "SELECT public.legal_case_check($1, $2) AS r", [first.slug, wrongChoice])
      expect(wrong.ok).toBe(true)
      const w = (wrong as any).rows[0].r
      expect(w).toEqual({ status: "wrong", hint: first.hint })

      const right = await asRole(db, role, uid, "SELECT public.legal_case_check($1, $2) AS r", [first.slug, first.answer_index])
      const c = (right as any).rows[0].r
      expect(c.status).toBe("correct")
      expect(c.correct_index).toBe(first.answer_index)
      expect(c.explanation.length).toBeGreaterThan(10)
      expect(Array.isArray(c.articles) && c.articles.length).toBeGreaterThan(0)
      expect(c.articles[0].text.length).toBeGreaterThan(0)
    })

    test(`${label}: اختيار خارج النطاق أو حالة غير منشورة لا يكشف شيئاً`, async () => {
      const cases: Array<[string, number, string]> = [
        [first.slug, 4, "invalid"],
        [first.slug, -1, "invalid"],
        ["no-such-case", 0, "not_found"],
        ["draft-case", 2, "not_found"],
      ]
      for (const [slug, choice, status] of cases) {
        const r = await asRole(db, role, uid, "SELECT public.legal_case_check($1, $2) AS r", [slug, choice])
        expect((r as any).rows[0].r).toEqual({ status })
      }
    })
  }

  test("المشرف: يقرأ كل الصفوف بما فيها المسودات والأجوبة، ويعدّل", async () => {
    const r = await asRole(db, "authenticated", ADMIN, "SELECT count(*)::int AS n, bool_or(slug = 'draft-case') AS has_draft FROM public.legal_cases WHERE answer_index IS NOT NULL")
    expect((r as any).rows[0]).toEqual({ n: seedData.cases.length + 1, has_draft: true })
    const u = await asRole(db, "authenticated", ADMIN, "UPDATE public.legal_cases SET hint = 'تلميح معدّل من الإدارة' WHERE slug = 'draft-case' RETURNING hint")
    expect((u as any).rows).toEqual([{ hint: "تلميح معدّل من الإدارة" }])
  })

  test("قيود الإدخال: لا نشر بلا مراجع، ولا خيارات مكررة", async () => {
    const publish = await asRole(db, "authenticated", ADMIN, "UPDATE public.legal_cases SET published = true WHERE slug = 'draft-case'")
    expect(publish.ok).toBe(false)
    expect((publish as any).error).toMatch(/المراجع/)
    const dup = await asRole(db, "authenticated", ADMIN, `UPDATE public.legal_cases SET options = '["أ1","أ1","ج3","د4"]' WHERE slug = 'draft-case'`)
    expect(dup.ok).toBe(false)
    expect((dup as any).error).toMatch(/مختلفة/)
  })

  test("إعادة تطبيق الترحيلات آمنة (لا أخطاء ولا تكرار)", async () => {
    await db.exec(migration(RETIRE))
    await db.exec(migration(SCHEMA))
    await db.exec(migration(SEED))
    const r = await db.query("SELECT count(*)::int AS n FROM public.legal_cases")
    expect(r.rows[0].n).toBe(seedData.cases.length + 1)
    const v = await asRole(db, "anon", null, "SELECT count(*)::int AS n FROM public.legal_cases_public")
    expect((v as any).rows[0].n).toBe(seedData.cases.length)
  })
})
