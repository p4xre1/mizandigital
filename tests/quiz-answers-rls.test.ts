// ترحيل «إجابات الاختبارات على الخادم فقط» على PostgreSQL حقيقي (PGlite = PostgreSQL 17 مترجَم إلى WASM).
//
// ما يفعله هذا الملف:
//   1) يبني الحالة السابقة من الترحيلات الفعلية على القرص: 20260914000000 (الجدول والسياسات)
//      ثم 20260920000000 (عرض quiz_questions_public القديم بعمودَي explanation و reference).
//   2) يطبّق supabase/migrations/20261012000000_quiz_answers_server_only.sql فوقها.
//      كان يفشل هنا بـ «cannot drop columns from view (SQLSTATE 42P16)» لأن
//      CREATE OR REPLACE VIEW لا يحذف أعمدة من عرض قائم.
//   3) يتحقق بكل هوية (anon و authenticated عادي ومشرف) من أن الزوار يرون الأسئلة المنشورة
//      عبر العرض، ولا يصلون إلى answer/explanation/reference إلا عبر quiz_reveal_answer.
//
// الصلاحيات الافتراضية تحاكي Supabase: كل جدول/عرض جديد في public يُمنح ALL لـ anon و
// authenticated و service_role، فاختبار «القراءة فقط» يقيس السحب الصريح في الترحيل.
//
// إن لم تكن الحزمة @electric-sql/pglite مثبَّتة، تُعلَّم الاختبارات NOT RUN.
// التشغيل: `npx vitest run tests/quiz-answers-rls.test.ts`.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test, beforeAll, afterAll } from "vitest"

const ROOT = join(__dirname, "..")
const migration = (name: string) => readFileSync(join(ROOT, "supabase/migrations", name), "utf8")
const QUIZ_ENGINE = "20260914000000_quiz_engine_and_rpg.sql"
const OLD_VIEW = "20260920000000_protect_progression_and_quiz_answers.sql"
const SERVER_ONLY = "20261012000000_quiz_answers_server_only.sql"

const ALICE = "11111111-1111-4111-8111-111111111111"
const ADMIN = "33333333-3333-4333-8333-333333333333"

const SAFE_COLUMNS = [
  "slug", "tier", "semester", "module", "body", "track", "difficulty",
  "question", "options", "is_published", "created_at", "updated_at",
]

/** الحد الأدنى من بيئة Supabase التي تحتاجها الترحيلات الثلاثة. */
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

const SEED = `
  INSERT INTO public.quiz_questions (slug, tier, question, options, answer, explanation, reference, is_published) VALUES
    ('pub-1', 'general', 'سؤال منشور؟', '["أ","ب","ج","د"]', 2, 'شرح سري', 'مرجع سري', true),
    ('draft-1', 'general', 'مسودة؟', '["أ","ب","ج","د"]', 1, 'شرح المسودة', NULL, false);
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
async function asRole(db: any, role: string, uid: string | null, sql: string): Promise<RoleResult> {
  await db.exec(`SET ROLE ${role}`)
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""])
    const r = await db.query(sql)
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

suite("ترحيل 20261012000000 — إجابات الاختبارات على الخادم فقط (PostgreSQL حقيقي)", () => {
  let db: any

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(PRE_STATE)
    await db.exec(migration(QUIZ_ENGINE))
    await db.exec(migration(OLD_VIEW))
    await db.exec(SEED)
  }, 30_000)

  afterAll(async () => {
    await db?.close?.()
  })

  test("قبل الترحيل: العرض القديم يحمل explanation و reference، والزائر يقرأ answer من الجدول (الثغرة موجودة فعلاً)", async () => {
    const cols = await db.query(
      `SELECT attname FROM pg_attribute WHERE attrelid = 'public.quiz_questions_public'::regclass AND attnum > 0`
    )
    const names = cols.rows.map((r: any) => r.attname)
    expect(names).toContain("explanation")
    expect(names).toContain("reference")

    const leak = await asRole(db, "anon", null, "SELECT slug, answer FROM public.quiz_questions")
    expect(leak).toEqual({ ok: true, rows: [{ slug: "pub-1", answer: 2 }] })
  })

  test("الترحيل يُطبَّق فوق عرض 20260920000000 (كان: cannot drop columns from view، SQLSTATE 42P16)", async () => {
    await db.exec(migration(SERVER_ONLY))
  })

  test("العرض يحمل الأعمدة الآمنة فقط ويبقى security_invoker", async () => {
    const cols = await db.query(
      `SELECT attname FROM pg_attribute WHERE attrelid = 'public.quiz_questions_public'::regclass AND attnum > 0 ORDER BY attnum`
    )
    expect(cols.rows.map((r: any) => r.attname)).toEqual(SAFE_COLUMNS)

    const opts = await db.query(`SELECT reloptions FROM pg_class WHERE oid = 'public.quiz_questions_public'::regclass`)
    expect(opts.rows[0].reloptions).toContain("security_invoker=true")
  })

  for (const [label, role, uid] of VISITORS) {
    test(`${label}: يرى الأسئلة المنشورة فقط عبر العرض`, async () => {
      const r = await asRole(db, role, uid, "SELECT slug, question, options FROM public.quiz_questions_public ORDER BY created_at LIMIT 500")
      expect(r).toEqual({ ok: true, rows: [{ slug: "pub-1", question: "سؤال منشور؟", options: ["أ", "ب", "ج", "د"] }] })
    })

    test(`${label}: لا يصل إلى answer/explanation/reference من الجدول ولا من العرض ولا من دالة المصدر`, async () => {
      const base = await asRole(db, role, uid, "SELECT slug, answer, explanation, reference FROM public.quiz_questions")
      expect(base).toEqual({ ok: true, rows: [] })

      for (const column of ["answer", "explanation", "reference"]) {
        const viaView = await asRole(db, role, uid, `SELECT ${column} FROM public.quiz_questions_public`)
        expect(viaView.ok).toBe(false)
        expect((viaView as any).error).toMatch(/does not exist/)
      }

      const viaFn = await asRole(db, role, uid, "SELECT * FROM public.quiz_questions_public_rows()")
      expect(viaFn.ok).toBe(true)
      const rows = (viaFn as any).rows
      expect(rows.map((r: any) => r.slug)).toEqual(["pub-1"])
      expect(Object.keys(rows[0]).sort()).toEqual([...SAFE_COLUMNS].sort())
    })

    test(`${label}: العرض للقراءة فقط — لا إدراج ولا تعديل ولا حذف عبره`, async () => {
      const attempts = [
        `INSERT INTO public.quiz_questions_public (slug, tier, difficulty, question, options, is_published)
           VALUES ('x-1', 'general', 'easy', 'مزيف؟', '["أ","ب","ج","د"]', true)`,
        "UPDATE public.quiz_questions_public SET question = 'مخترق' WHERE slug = 'pub-1'",
        "DELETE FROM public.quiz_questions_public WHERE slug = 'pub-1'",
      ]
      for (const sql of attempts) {
        const r = await asRole(db, role, uid, sql)
        expect(r.ok, sql).toBe(false)
      }
      const intact = await db.query("SELECT question FROM public.quiz_questions WHERE slug = 'pub-1'")
      expect(intact.rows).toEqual([{ question: "سؤال منشور؟" }])
    })

    test(`${label}: quiz_reveal_answer يكشف بعد اختيار صالح لسؤال منشور فقط`, async () => {
      const ok = await asRole(db, role, uid, "SELECT * FROM public.quiz_reveal_answer('pub-1', 0)")
      expect(ok).toEqual({ ok: true, rows: [{ revealed: true, answer: 2, explanation: "شرح سري", reference: "مرجع سري" }] })

      const hidden = { revealed: false, answer: null, explanation: null, reference: null }
      expect(await asRole(db, role, uid, "SELECT * FROM public.quiz_reveal_answer('draft-1', 0)")).toEqual({ ok: true, rows: [hidden] })
      expect(await asRole(db, role, uid, "SELECT * FROM public.quiz_reveal_answer('pub-1', 4)")).toEqual({ ok: true, rows: [hidden] })
    })
  }

  test("صلاحيات العرض: SELECT فقط لـ anon و authenticated (رغم منح Supabase الافتراضي ALL)", async () => {
    const grants = await db.query(`
      SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privileges
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = 'quiz_questions_public'
        AND grantee IN ('anon', 'authenticated', 'PUBLIC')
      GROUP BY grantee ORDER BY grantee`)
    expect(grants.rows).toEqual([
      { grantee: "anon", privileges: "SELECT" },
      { grantee: "authenticated", privileges: "SELECT" },
    ])
  })

  test("المشرف يحتفظ بالقراءة والكتابة على الجدول الأساس (لوحة التحكم)", async () => {
    const read = await asRole(db, "authenticated", ADMIN, "SELECT slug, answer FROM public.quiz_questions ORDER BY slug")
    expect(read).toEqual({ ok: true, rows: [{ slug: "draft-1", answer: 1 }, { slug: "pub-1", answer: 2 }] })

    // نفس شكل upsert في saveQuestion (onConflict: slug)
    const upsert = await asRole(db, "authenticated", ADMIN, `
      INSERT INTO public.quiz_questions (slug, tier, difficulty, question, options, answer, explanation, is_published)
      VALUES ('pub-1', 'general', 'hard', 'سؤال معدّل؟', '["أ","ب","ج","د"]', 3, 'شرح جديد', true)
      ON CONFLICT (slug) DO UPDATE SET question = EXCLUDED.question, answer = EXCLUDED.answer, difficulty = EXCLUDED.difficulty
      RETURNING slug, answer`)
    expect(upsert).toEqual({ ok: true, rows: [{ slug: "pub-1", answer: 3 }] })

    const seen = await asRole(db, "anon", null, "SELECT slug, question, difficulty FROM public.quiz_questions_public")
    expect(seen).toEqual({ ok: true, rows: [{ slug: "pub-1", question: "سؤال معدّل؟", difficulty: "hard" }] })

    const del = await asRole(db, "authenticated", ADMIN, "DELETE FROM public.quiz_questions WHERE slug = 'draft-1' RETURNING slug")
    expect(del).toEqual({ ok: true, rows: [{ slug: "draft-1" }] })
  })

  test("الترحيل قابل لإعادة التنفيذ (مثلاً لصقه مرة ثانية في محرر SQL)", async () => {
    await db.exec(migration(SERVER_ONLY))
    const r = await asRole(db, "anon", null, "SELECT slug FROM public.quiz_questions_public")
    expect(r).toEqual({ ok: true, rows: [{ slug: "pub-1" }] })
  })
})
