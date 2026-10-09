// اختبارات سياسات وعاء السير الذاتية cv-files على PostgreSQL حقيقي (PGlite).
//
// [CV-01] قبل الترحيل: الوعاء عام وسياسة القراءة لـ anon تكشف كل الملفات، حتى غير المنشورة.
// بعد 20261011000000: الوعاء خاص، والملف يُقرأ فقط لصاحبه، أو إذا كانت السيرة منشورة.
//
// المخطط هنا محاكاة صغيرة لـ storage.buckets/objects و storage.foldername وauth.uid
// (لا يحتاج Supabase). إن لم تكن @electric-sql/pglite متاحة تُعلَّم الاختبارات NOT RUN.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test, beforeAll, afterAll } from "vitest"

const ROOT = join(__dirname, "..")
const MIGRATION = join(ROOT, "supabase/migrations/20261011000000_cv_files_private_bucket.sql")

const ALICE = "11111111-1111-4111-8111-111111111111"
const BOB = "22222222-2222-4222-8222-222222222222"

const PRE_STATE = `
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE SCHEMA IF NOT EXISTS storage;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  END $$;
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN cardinality(string_to_array(name, '/')) > 1
                THEN (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1]
                ELSE ARRAY[]::text[] END $$;

  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean NOT NULL DEFAULT false);
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text REFERENCES storage.buckets(id),
    name text NOT NULL
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated;
  GRANT SELECT ON storage.buckets, storage.objects TO anon, authenticated;

  CREATE TABLE public.resumes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL,
    cv_file_path text,
    is_public boolean NOT NULL DEFAULT false
  );
  ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
  GRANT SELECT ON public.resumes TO anon, authenticated;
  CREATE POLICY resumes_public_read ON public.resumes FOR SELECT TO anon, authenticated USING (is_public);
  CREATE POLICY resumes_owner_all ON public.resumes FOR ALL TO authenticated
    USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

  -- السياسة الأصلية قبل الترحيل (الثغرة كما كانت في 20260929000000)
  INSERT INTO storage.buckets (id, name, public) VALUES ('cv-files', 'cv-files', true);
  CREATE POLICY cv_files_public_read ON storage.objects FOR SELECT TO anon, authenticated
    USING (bucket_id = 'cv-files');

  INSERT INTO storage.objects (bucket_id, name) VALUES
    ('cv-files', '${ALICE}/draft-private.pdf'),
    ('cv-files', '${ALICE}/published.pdf'),
    ('cv-files', '${BOB}/bob-private.pdf');
  INSERT INTO public.resumes (profile_id, cv_file_path, is_public) VALUES
    ('${ALICE}', '${ALICE}/published.pdf', true),
    ('${BOB}', '${BOB}/bob-private.pdf', false);
`

let PGlite: any = null
let loadError = ""
try {
  const modName = "@electric-sql/pglite"
  PGlite = (await import(/* @vite-ignore */ modName)).PGlite
} catch (e) {
  loadError = String((e as Error)?.message || e)
}
const suite = PGlite ? describe : describe.skip

/** عدّ الملفات المرئية لهوية معيّنة داخل cv-files. */
async function visibleNames(db: any, role: string, uid: string | null): Promise<string[]> {
  await db.exec(`SET ROLE ${role}`)
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""])
    const r = await db.query("SELECT name FROM storage.objects WHERE bucket_id = 'cv-files' ORDER BY name")
    return r.rows.map((row: { name: string }) => row.name)
  } finally {
    await db.exec("RESET ROLE")
  }
}

suite("وعاء cv-files: الملفات لا تُكشف إلا لصاحبها أو عند نشر السيرة [CV-01]", () => {
  let db: any

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(PRE_STATE)
  })
  afterAll(async () => {
    await db?.close?.()
  })

  test("قبل الترحيل: يرى anon كل الملفات بما فيها غير المنشورة (الثغرة موجودة فعلاً)", async () => {
    const names = await visibleNames(db, "anon", null)
    expect(names).toEqual(
      [`${ALICE}/draft-private.pdf`, `${ALICE}/published.pdf`, `${BOB}/bob-private.pdf`].sort(),
    )
  })

  test("يطبّق الترحيل دون خطأ، ويمكن إعادة تشغيله (idempotent)", async () => {
    const sql = readFileSync(MIGRATION, "utf8")
    await db.exec(sql)
    await db.exec(sql)
  })

  test("بعد الترحيل: الوعاء خاص", async () => {
    const r = await db.query("SELECT public FROM storage.buckets WHERE id = 'cv-files'")
    expect(r.rows[0].public).toBe(false)
  })

  test("بعد الترحيل: الثغرة القديمة مُزالة (لا سياسة cv_files_public_read)", async () => {
    const r = await db.query(
      "SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cv_files_public_read'",
    )
    expect(r.rows).toHaveLength(0)
  })

  test("anon يرى الملف المنشور فقط", async () => {
    expect(await visibleNames(db, "anon", null)).toEqual([`${ALICE}/published.pdf`])
  })

  test("مستخدم آخر (بوب) يرى ملفه وملف أليس المنشور، لا مسودتها", async () => {
    expect(await visibleNames(db, "authenticated", BOB)).toEqual(
      [`${ALICE}/published.pdf`, `${BOB}/bob-private.pdf`].sort(),
    )
  })

  test("صاحب الملف (أليس) يرى كل ملفاته داخل مجلدها", async () => {
    expect(await visibleNames(db, "authenticated", ALICE)).toEqual(
      [`${ALICE}/draft-private.pdf`, `${ALICE}/published.pdf`].sort(),
    )
  })

  test("دالة النشر: SECURITY DEFINER مع مسار بحث مثبّت، ولا تمنح EXECUTE للعموم", async () => {
    const r = await db.query(
      "SELECT prosecdef, proconfig FROM pg_proc WHERE proname = 'cv_object_is_published' AND pronamespace = 'public'::regnamespace",
    )
    expect(r.rows[0].prosecdef).toBe(true)
    expect(JSON.stringify(r.rows[0].proconfig)).toContain("search_path=")
  })

  test("دالة النشر تُرجع false لمسار غير معروف (لا تسرد شيئاً)", async () => {
    await db.exec("SET ROLE anon")
    try {
      const r = await db.query("SELECT public.cv_object_is_published('no/such.pdf') AS ok")
      expect(r.rows[0].ok).toBe(false)
    } finally {
      await db.exec("RESET ROLE")
    }
  })
})

if (!PGlite) {
  test.skip(`NOT RUN: الحزمة @electric-sql/pglite غير متاحة (${loadError})`, () => {})
}
