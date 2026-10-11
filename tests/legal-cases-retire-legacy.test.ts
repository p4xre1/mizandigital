// تقاعد التصميم السابق لحالات «من الواقعة إلى الحل» على PostgreSQL حقيقي (PGlite = PostgreSQL 17/WASM).
//
// الخلفية: تصميم سابق لم يُنشر (legal_cases بأعمدة facts/court + legal_case_questions)
// كان يمنع الترحيل 20261012000300 من المتابعة (رسالة P0001 مقصودة). هذا الاختبار
// يتحقق من الترحيل 20261012000250 الذي يتقاعد من ذلك التصميم:
//   1) لا حذف بلا نسخة: كل صف يُؤرشف في legacy_archive قبل الحذف، وتُحفظ تعريفات
//      العروض والدوال المحذوفة في legacy_archive.retired_objects.
//   2) الأرشيف غير مكشوف: لا صلاحية لـ anon ولا لـ authenticated عليه.
//   3) قاعدة نظيفة ⟹ لا عملية. قاعدة بالتصميم الجديد ⟹ لا عملية (لا تُلمس بياناته).
//   4) بعده يمرّ الترحيلان 20261012000300 و 20261012000400 كما في قاعدة نظيفة.
//
// إن لم تكن الحزمة @electric-sql/pglite مثبَّتة، تُعلَّم الاختبارات NOT RUN.
// التشغيل: `npx vitest run tests/legal-cases-retire-legacy.test.ts`.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

const ROOT = join(__dirname, "..")
const migration = (name: string) => readFileSync(join(ROOT, "supabase/migrations", name), "utf8")

const RETIRE = "20261012000250_legal_cases_retire_previous_design.sql"
const SCHEMA = "20261012000300_legal_cases_game.sql"
const SEED = "20261012000400_legal_cases_seed.sql"

const seedData = JSON.parse(readFileSync(join(ROOT, "data/cases/cases.json"), "utf8")) as {
  cases: { slug: string; answer_index: number; hint: string }[]
}
const first = seedData.cases[0]

const ALICE = "11111111-1111-4111-8111-111111111111"

/** الحد الأدنى من بيئة Supabase التي يحتاجها الترحيلان. */
const PRE_STATE = `
  CREATE SCHEMA IF NOT EXISTS auth;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  END $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE TABLE public.test_admins (id uuid PRIMARY KEY);
  CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = '' AS $$ SELECT EXISTS (SELECT 1 FROM public.test_admins WHERE id = auth.uid()) $$;
  INSERT INTO auth.users (id) VALUES ('${ALICE}');
`

/** التصميم السابق (لم يُنشر): أعمدة facts/court + جدول أسئلة + عرض ودالة بالأسماء نفسها. */
const LEGACY_STATE = `
  CREATE TABLE public.legal_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    court text,
    facts text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.legal_case_questions (
    id bigserial PRIMARY KEY,
    case_id uuid NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
    question text NOT NULL,
    options jsonb,
    answer_index smallint
  );
  CREATE TABLE public.legal_case_attempts (
    id bigserial PRIMARY KEY,
    case_id uuid NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
    score smallint
  );
  ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.legal_case_questions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY legacy_anon_read ON public.legal_cases FOR SELECT TO anon USING (true);
  CREATE VIEW public.legal_cases_public AS SELECT slug, title, court FROM public.legal_cases;
  CREATE FUNCTION public.legal_case_check(p_slug text) RETURNS text LANGUAGE sql AS $$
    SELECT title FROM public.legal_cases WHERE slug = p_slug $$;
  INSERT INTO public.legal_cases (slug, title, court, facts) VALUES
    ('legacy-1', 'حالة قديمة أولى', 'المحكمة الابتدائية', 'وقائع قديمة محفوظة'),
    ('legacy-2', 'حالة قديمة ثانية', 'محكمة الاستئناف', 'وقائع أخرى');
  INSERT INTO public.legal_case_questions (case_id, question, options, answer_index)
    SELECT id, 'سؤال قديم؟', '["أ","ب"]'::jsonb, 0 FROM public.legal_cases WHERE slug = 'legacy-1';
  INSERT INTO public.legal_case_attempts (case_id, score)
    SELECT id, 1 FROM public.legal_cases;
`

/** التصميم القديم كما هو فعلاً في القاعدة الحية (من تفريغ المخطط الذي أرسله المالك). */
const LIVE_LEGACY_STATE = `
  CREATE TABLE public.legal_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL CHECK (char_length(title) >= 4 AND char_length(title) <= 200),
    summary text NOT NULL CHECK (char_length(summary) >= 20 AND char_length(summary) <= 500),
    facts text NOT NULL CHECK (char_length(facts) >= 40),
    court text NOT NULL CHECK (char_length(court) >= 2 AND char_length(court) <= 150),
    image_public_path text CHECK (image_public_path IS NULL OR char_length(image_public_path) >= 2 AND char_length(image_public_path) <= 200 AND image_public_path ~~ '/cases/%' AND image_public_path !~~ '/cases/%/%/%'),
    reviewer_label text NOT NULL DEFAULT '' CHECK (char_length(reviewer_label) <= 120),
    published boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid,
    CONSTRAINT legal_cases_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
  );
  CREATE TABLE public.legal_case_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_slug text NOT NULL,
    "position" integer NOT NULL CHECK ("position" >= 1 AND "position" <= 20),
    question text NOT NULL CHECK (char_length(question) >= 4 AND char_length(question) <= 500),
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    answer integer NOT NULL CHECK (answer >= 0 AND answer <= 3),
    explanation text NOT NULL CHECK (char_length(explanation) >= 4 AND char_length(explanation) <= 1500),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT legal_case_questions_case_slug_fkey FOREIGN KEY (case_slug) REFERENCES public.legal_cases(slug)
  );
  ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.legal_case_questions ENABLE ROW LEVEL SECURITY;
  INSERT INTO public.legal_cases (slug, title, summary, facts, court, image_public_path, reviewer_label, published, updated_by) VALUES
    ('live-case-1', 'نزاع إيجاري تجريبي', 'ملخص كافٍ لاجتياز الحد الأدنى لطول الملخص في التصميم القديم.', 'وقائع مطولة بما يكفي لتجاوز الحد الأدنى لطول الوقائع في التصميم القديم.', 'المحكمة الابتدائية بالرباط', '/cases/live-1.jpg', 'مراجعة داخلية', true, '${ALICE}'),
    ('live-case-2', 'قضية شغل تجريبية', 'ملخص ثانٍ كافٍ لاجتياز الحد الأدنى لطول الملخص في التصميم القديم.', 'وقائع ثانية مطولة بما يكفي لتجاوز الحد الأدنى المطلوب في القيد.', 'محكمة الاستئناف بطنجة', NULL, '', false, NULL);
  INSERT INTO public.legal_case_questions (case_slug, "position", question, options, answer, explanation) VALUES
    ('live-case-1', 1, 'ما هو الحكم في هذه الواقعة التجريبية؟', '["خيار أول","خيار ثانٍ","خيار ثالث","خيار رابع"]'::jsonb, 1, 'شرح كافٍ لاجتياز الحد الأدنى لطول الشرح في التصميم القديم.'),
    ('live-case-1', 2, 'ما هو السؤال الثاني في هذه الواقعة؟', '["أ","ب","ج","د"]'::jsonb, 0, 'شرح ثانٍ كافٍ لاجتياز الحد الأدنى لطول الشرح المطلوب.'),
    ('live-case-2', 1, 'سؤال الحالة الثانية التجريبية؟', '["أ","ب","ج","د"]'::jsonb, 3, 'شرح الحالة الثانية كافٍ لاجتياز الحد الأدنى للطول هنا.');
`

let PGlite: any = null
try {
  const modName = "@electric-sql/pglite"
  PGlite = (await import(/* @vite-ignore */ modName)).PGlite
} catch {
  PGlite = null
}
const suite = PGlite ? describe.sequential : describe.skip

type Result = { ok: true; rows: any[] } | { ok: false; error: string }

async function run(db: any, sql: string): Promise<Result> {
  // exec لا query: ملفات الترحيل تحوي عدة جمل، وquery ترفضها (prepared statement).
  try {
    const r = await db.exec(sql)
    return { ok: true, rows: r.flatMap((x: any) => x.rows ?? []) }
  } catch (e) {
    return { ok: false, error: String((e as Error).message) }
  }
}

async function asRole(db: any, role: string, uid: string | null, sql: string): Promise<Result> {
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

async function newDb(withLegacy: boolean) {
  const db = new PGlite()
  await db.exec(PRE_STATE)
  if (withLegacy) await db.exec(LEGACY_STATE)
  return db
}

suite("تقاعد التصميم السابق للحالات القانونية (PostgreSQL حقيقي)", () => {
  test("قبل التقاعد: الترحيل 20261012000300 يتوقف برسالة واضحة ولا يمسّ شيئاً", async () => {
    const db = await newDb(true)
    const r = await run(db, migration(SCHEMA))
    expect(r.ok).toBe(false)
    expect((r as any).error).toMatch(/previous unreleased design/)
    // الملف يبدأ بـ BEGIN: بعد الفشل نتراجع صراحةً كما يفعل أي عميل حقيقي.
    await db.exec("ROLLBACK")
    // القاعدة كما هي: التصميم القديم موجود ولم يُنشأ شيء من الجديد
    expect((await db.query("SELECT to_regclass('public.legal_cases') AS t")).rows[0].t).toBe("legal_cases")
    expect(
      (await db.query(`SELECT count(*)::int AS n FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'legal_cases' AND column_name = 'story'`)).rows[0].n,
    ).toBe(0)
    await db.close()
  }, 30_000)

  test("التقاعد: أرشفة كل صف ثم حذف كائنات التصميم القديم ثم نجاح الترحيلين الجديدين", async () => {
    const db = await newDb(true)
    const retire = await run(db, migration(RETIRE))
    expect(retire.ok, (retire as any).error).toBe(true)

    // 1) الأرشيف يحمل كل الصفوف كما كانت
    expect((await db.query("SELECT count(*)::int AS n FROM legacy_archive.legal_cases")).rows[0].n).toBe(2)
    expect((await db.query("SELECT count(*)::int AS n FROM legacy_archive.legal_case_questions")).rows[0].n).toBe(1)
    expect((await db.query("SELECT count(*)::int AS n FROM legacy_archive.legal_case_attempts")).rows[0].n).toBe(2)
    expect(
      (await db.query("SELECT slug, facts FROM legacy_archive.legal_cases WHERE slug = 'legacy-1'")).rows[0],
    ).toEqual({ slug: "legacy-1", facts: "وقائع قديمة محفوظة" })

    // 2) تعريفات العروض والدوال المحذوفة محفوظة للنظر البشري
    const retiredKinds = (
      await db.query("SELECT object_kind, object_name FROM legacy_archive.retired_objects ORDER BY object_kind, object_name")
    ).rows.map((r: any) => `${r.object_kind}:${r.object_name}`)
    expect(retiredKinds).toEqual([
      "function:legal_case_check(p_slug text)",
      "table:legal_case_attempts",
      "table:legal_case_questions",
      "table:legal_cases",
      "view:legal_cases_public",
    ])
    const fnDef = (await db.query("SELECT definition FROM legacy_archive.retired_objects WHERE object_kind = 'function'")).rows[0].definition
    expect(fnDef).toMatch(/CREATE OR REPLACE FUNCTION public\.legal_case_check/)

    // 3) كائنات التصميم القديم اختفت من public
    for (const name of ["legal_cases", "legal_case_questions", "legal_case_attempts", "legal_cases_public", "legal_case_check"]) {
      expect((await db.query(`SELECT to_regclass('public.${name}') AS t`)).rows[0].t, name).toBe(null)
    }

    // 4) الترحيلان الجديدان يمرّان الآن، والبذر يصل، واللعبة تعمل من طرف زائر
    expect(await run(db, migration(SCHEMA))).toMatchObject({ ok: true })
    expect(await run(db, migration(SEED))).toMatchObject({ ok: true })
    expect((await db.query("SELECT count(*)::int AS n FROM public.legal_cases_public")).rows[0].n).toBe(seedData.cases.length)
    const visitor = await asRole(db, "anon", null, `SELECT public.legal_case_check('${first.slug}', ${(first.answer_index + 1) % 4}) AS r`)
    expect((visitor as any).rows[0].r).toEqual({ status: "wrong", hint: first.hint })
    await db.close()
  }, 60_000)

  test("الأرشيف رفّ محفوظات لا واجهة: لا anon ولا مستخدم مسجّل يقرأه", async () => {
    const db = await newDb(true)
    expect(await run(db, migration(RETIRE))).toMatchObject({ ok: true })
    for (const [role, uid] of [["anon", null], ["authenticated", ALICE]] as const) {
      const r = await asRole(db, role, uid, "SELECT count(*)::int AS n FROM legacy_archive.legal_cases")
      expect(r.ok, role).toBe(false)
      expect((r as any).error).toMatch(/permission denied/)
      const t = await asRole(db, role, uid, "SELECT count(*)::int AS n FROM legacy_archive.retired_objects")
      expect(t.ok, role).toBe(false)
    }
    await db.close()
  }, 30_000)

  test("قاعدة نظيفة: التقاعد بلا عملية (لا مخطط أرشيف يُنشأ)", async () => {
    const db = await newDb(false)
    expect(await run(db, migration(RETIRE))).toMatchObject({ ok: true })
    expect((await db.query("SELECT to_regclass('legacy_archive.legal_cases') AS t")).rows[0].t).toBe(null)
    expect((await db.query("SELECT count(*)::int AS n FROM pg_namespace WHERE nspname = 'legacy_archive'")).rows[0].n).toBe(0)
    // وقاعدة صارت بالتصميم الجديد: إعادة تشغيل التقاعد بعد التطبيق لا تفعل شيئاً
    expect(await run(db, migration(SCHEMA))).toMatchObject({ ok: true })
    expect(await run(db, migration(SEED))).toMatchObject({ ok: true })
    expect(await run(db, migration(RETIRE))).toMatchObject({ ok: true })
    expect((await db.query("SELECT count(*)::int AS n FROM public.legal_cases")).rows[0].n).toBe(seedData.cases.length)
    await db.close()
  }, 60_000)

  test("بقية قديمة وحدها (legal_case_questions) مع تصميم جديد: تُؤرشف وتُحذف وحدها", async () => {
    const db = await newDb(false)
    expect(await run(db, migration(SCHEMA))).toMatchObject({ ok: true })
    expect(await run(db, migration(SEED))).toMatchObject({ ok: true })
    await db.exec(`
      CREATE TABLE public.legal_case_questions (id bigserial PRIMARY KEY, question text);
      INSERT INTO public.legal_case_questions (question) VALUES ('سؤال يتيم');
    `)
    expect(await run(db, migration(RETIRE))).toMatchObject({ ok: true })
    expect((await db.query("SELECT to_regclass('public.legal_case_questions') AS t")).rows[0].t).toBe(null)
    expect((await db.query("SELECT count(*)::int AS n FROM legacy_archive.legal_case_questions")).rows[0].n).toBe(1)
    // التصميم الجديد لم يُمسّ
    expect((await db.query("SELECT count(*)::int AS n FROM public.legal_cases")).rows[0].n).toBe(seedData.cases.length)
    expect((await db.query("SELECT to_regclass('public.legal_cases_public') AS t")).rows[0].t).toBe("legal_cases_public")
    await db.close()
  }, 60_000)

  test("جدول قديم فُرضت عليه RLS (FORCE): الأرشيف نسخة كاملة لا ما سمحت به السياسة", async () => {
    const db = await newDb(false)
    await db.exec(`
      CREATE TABLE public.legal_cases (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE, facts text);
      CREATE TABLE public.legal_case_questions (id bigserial PRIMARY KEY, case_id uuid REFERENCES public.legal_cases(id));
      INSERT INTO public.legal_cases (slug, facts) VALUES ('a', 'واقعة أولى'), ('b', 'واقعة ثانية');
      INSERT INTO public.legal_case_questions (case_id) SELECT id FROM public.legal_cases;
      ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.legal_cases FORCE ROW LEVEL SECURITY;
      ALTER TABLE public.legal_case_questions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.legal_case_questions FORCE ROW LEVEL SECURITY;
      CREATE POLICY legacy_deny ON public.legal_cases FOR SELECT USING (false);
      CREATE POLICY legacy_deny_q ON public.legal_case_questions FOR SELECT USING (false);
    `)
    // الفرع الآخر أيضاً: legal_case_questions وحدها بـ FORCE RLS مع تصميم جديد
    const db2 = await newDb(false)
    expect(await run(db2, migration(SCHEMA))).toMatchObject({ ok: true })
    await db2.exec(`
      CREATE TABLE public.legal_case_questions (id bigserial PRIMARY KEY, question text);
      INSERT INTO public.legal_case_questions (question) VALUES ('سؤال يتيم');
      ALTER TABLE public.legal_case_questions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.legal_case_questions FORCE ROW LEVEL SECURITY;
      CREATE POLICY legacy_deny_orphan ON public.legal_case_questions FOR SELECT USING (false);
    `)
    expect(await run(db2, migration(RETIRE))).toMatchObject({ ok: true })
    expect((await db2.query("SELECT count(*)::int AS n FROM legacy_archive.legal_case_questions")).rows[0].n).toBe(1)
    expect((await db2.query("SELECT count(*)::int AS n FROM public.legal_cases")).rows[0].n).toBe(0)
    await db2.close()
    // بلا إلغاء الفرض كان النسخ سيُصدَّر بخطأ row_security=off بدل نسخ جزئي صامت
    expect(await run(db, migration(RETIRE))).toMatchObject({ ok: true })
    expect((await db.query("SELECT count(*)::int AS n FROM legacy_archive.legal_cases")).rows[0].n).toBe(2)
    expect((await db.query("SELECT count(*)::int AS n FROM legacy_archive.legal_case_questions")).rows[0].n).toBe(2)
    expect((await db.query("SELECT to_regclass('public.legal_cases') AS t")).rows[0].t).toBe(null)
    await db.close()
  }, 30_000)

  test("الشكل الفعلي من القاعدة الحية: التصميم القديم (summary/facts/court + case_slug) يُؤرشف ويُحذف ثم يمرّ الجديد", async () => {
    const db = new PGlite()
    await db.exec(PRE_STATE)
    await db.exec(LIVE_LEGACY_STATE)

    expect(await run(db, migration(RETIRE))).toMatchObject({ ok: true })

    // كل الصفوف محفوظة بكل أعمدتها، بأعداد صحيحة
    expect((await db.query("SELECT count(*)::int AS n FROM legacy_archive.legal_cases")).rows[0].n).toBe(2)
    expect((await db.query("SELECT count(*)::int AS n FROM legacy_archive.legal_case_questions")).rows[0].n).toBe(3)
    const archived = (await db.query(
      "SELECT title, court, image_public_path, published FROM legacy_archive.legal_cases WHERE slug = 'live-case-1'",
    )).rows[0]
    expect(archived).toEqual({
      title: "نزاع إيجاري تجريبي",
      court: "المحكمة الابتدائية بالرباط",
      image_public_path: "/cases/live-1.jpg",
      published: true,
    })
    // المفتاح الأجنبي case_slug → legal_cases.slug لم يمنع الحذف
    expect((await db.query("SELECT to_regclass('public.legal_case_questions') AS t")).rows[0].t).toBe(null)
    expect((await db.query("SELECT to_regclass('public.legal_cases') AS t")).rows[0].t).toBe(null)

    // ثم الترحيلان الجديدان يمرّان والبذر يصل
    expect(await run(db, migration(SCHEMA))).toMatchObject({ ok: true })
    expect(await run(db, migration(SEED))).toMatchObject({ ok: true })
    expect((await db.query("SELECT count(*)::int AS n FROM public.legal_cases_public")).rows[0].n).toBe(seedData.cases.length)
    await db.close()
  }, 60_000)

  test("ترتيب آمن في نص الترحيل: الأرشفة قبل أي حذف، ولا حذف خارج public", () => {
    // بلا تعليقات: نفحص الجمل الفعلية وحدها (التعليق يشرح الحذف اليدوي للمخطط)
    const sql = migration(RETIRE).replace(/--[^\n]*/g, "")
    const firstDrop = sql.search(/DROP\s+(TABLE|VIEW|ROUTINE|MATERIALIZED)/i)
    expect(firstDrop).toBeGreaterThan(-1)
    expect(sql.indexOf("CREATE TABLE legacy_archive.")).toBeGreaterThan(-1)
    expect(sql.indexOf("CREATE TABLE legacy_archive.")).toBeLessThan(firstDrop)
    // الحذف مؤهَّل دائماً بـ public. (لا حذف في legacy_archive نفسها)
    for (const m of sql.matchAll(/DROP\s+(?:TABLE|VIEW|MATERIALIZED VIEW|ROUTINE)\s+IF EXISTS\s+(\S+)/gi)) {
      expect(m[1]).toMatch(/^public\./)
    }
    expect(sql).toMatch(/RAISE EXCEPTION/)
    expect(sql).not.toMatch(/DROP\s+SCHEMA/i)
  })
})
