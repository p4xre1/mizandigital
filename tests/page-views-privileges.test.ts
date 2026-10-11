// تضييق صلاحيات page_views على PostgreSQL حقيقي (PGlite).
//
// الأساس: Supabase يمنح ALL تلقائياً لكل جدول جديد في public، فوصل anon و
// authenticated (في القاعدة الحية فعلاً) إلى TRUNCATE/UPDATE/DELETE على جدول
// الزيارات. TRUNCATE تحديداً يتجاوز RLS، وهذا ما لا يجوز أن يملكه زائر.
//
// المطلوب بعد الترحيل 20261012000700:
//   * INSERT يبقى (متتبّع الزيارة يكتب بهوية anon/member) — وإلا انقطع التتبّع.
//   * SELECT يبقى (سلوك قائم تعتمد عليه سياسة القراءة الخام للمشرف).
//   * UPDATE/DELETE/TRUNCATE ممنوعة على anon و authenticated.
//
// إن لم تكن @electric-sql/pglite مثبَّتة تُعلَّم الاختبارات NOT RUN.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

const ROOT = join(__dirname, "..")
const MIGRATION = readFileSync(
  join(ROOT, "supabase/migrations/20261012000700_page_views_privilege_tightening.sql"),
  "utf8",
)

/** بيئة Supabase مصغّرة: نفس المنح الافتراضي السخي الذي أنتج المشكلة. */
const PRE_STATE = `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  END $$;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;

  CREATE TABLE public.page_views (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_type text NOT NULL,
    content_id text NOT NULL,
    path text,
    visitor_id text,
    session_id text,
    referrer text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  -- كما في Supabase: ALL لكل جدول جديد
  GRANT ALL ON public.page_views TO anon, authenticated;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

  ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "anyone can log a page view" ON public.page_views
    FOR INSERT TO anon, authenticated WITH CHECK (true);
  CREATE POLICY "authenticated can read page views" ON public.page_views
    FOR SELECT TO authenticated USING (true);

  INSERT INTO public.page_views (content_type, content_id, path, visitor_id, session_id, user_agent)
  VALUES ('page', '/existing', '/existing', 'v-seed', 's-seed', 'Mozilla/5.0 (seed)');
`

let PGlite: any = null
try {
  const modName = "@electric-sql/pglite"
  PGlite = (await import(/* @vite-ignore */ modName)).PGlite
} catch {
  PGlite = null
}
const suite = PGlite ? describe.sequential : describe.skip

async function asRole(db: any, role: string, sql: string): Promise<{ ok: boolean; error?: string; rows?: any[] }> {
  await db.exec(`SET ROLE ${role}`)
  try {
    const r = await db.query(sql)
    return { ok: true, rows: r.rows }
  } catch (e) {
    return { ok: false, error: String((e as Error).message) }
  } finally {
    await db.exec("RESET ROLE")
  }
}

async function withDb() {
  const db = new PGlite()
  await db.exec(PRE_STATE)
  await db.exec(MIGRATION)
  return db
}

const INSERT_SQL = `
  INSERT INTO public.page_views (content_type, content_id, path, visitor_id, session_id, user_agent)
  VALUES ('page', '/from-test', '/from-test', 'v-test', 's-test', 'Mozilla/5.0 (browser)')
`

suite("تضييق صلاحيات page_views", () => {
  test("الحقوق المتبقية: INSERT وSELECT فقط (لا TRUNCATE/UPDATE/DELETE/REFERENCES/TRIGGER)", async () => {
    const db = await withDb()
    const r = await db.query(`
      SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = 'page_views' AND grantee IN ('anon', 'authenticated')
      GROUP BY grantee ORDER BY grantee`)
    const map = Object.fromEntries(r.rows.map((x: any) => [x.grantee, x.privs]))
    expect(map["anon"]).toBe("INSERT,SELECT")
    expect(map["authenticated"]).toBe("INSERT,SELECT")
    // ولا واحدة من الخطرة على أي من الدورين
    for (const privs of Object.values(map)) {
      expect(String(privs)).not.toMatch(/TRUNCATE|UPDATE|DELETE|REFERENCES|TRIGGER/)
    }
    await db.close()
  }, 30_000)

  test("التتبّع ما زال يعمل: anon يُدرج صفاً، ويراه المشرف عبر السياسة القائمة", async () => {
    const db = await withDb()
    const ins = await asRole(db, "anon", INSERT_SQL)
    expect(ins.ok, ins.error).toBe(true)

    const read = await asRole(db, "authenticated", "SELECT count(*)::int AS n FROM public.page_views")
    expect(read.ok).toBe(true)
    expect((read as any).rows[0].n).toBe(2)

    // وanon لا يقرأ الصفوف الخام (لا سياسة قراءة له) رغم امتلاكه صلاحية SELECT
    const anonRead = await asRole(db, "anon", "SELECT count(*)::int AS n FROM public.page_views")
    expect(anonRead.ok).toBe(true)
    expect((anonRead as any).rows[0].n).toBe(0)
    await db.close()
  }, 30_000)

  test("العمليات الخطرة ممنوعة على anon: TRUNCATE (يتجاوز RLS) وUPDATE وDELETE", async () => {
    const db = await withDb()
    const truncate = await asRole(db, "anon", "TRUNCATE public.page_views")
    expect(truncate.ok).toBe(false)
    expect(truncate.error).toMatch(/permission denied/)

    const update = await asRole(db, "anon", "UPDATE public.page_views SET content_id = 'hacked'")
    expect(update.ok).toBe(false)
    expect(update.error).toMatch(/permission denied/)

    const del = await asRole(db, "anon", "DELETE FROM public.page_views")
    expect(del.ok).toBe(false)
    expect(del.error).toMatch(/permission denied/)

    // الصف الأصلي سليم بعد كل المحاولات
    const left = await db.query("SELECT count(*)::int AS n FROM public.page_views")
    expect((left.rows[0] as any).n).toBe(1)
    await db.close()
  }, 30_000)

  test("نفس الممنوعات على authenticated (TRUNCATE/UPDATE/DELETE)", async () => {
    const db = await withDb()
    for (const sql of [
      "TRUNCATE public.page_views",
      "UPDATE public.page_views SET path = '/x'",
      "DELETE FROM public.page_views",
    ]) {
      const r = await asRole(db, "authenticated", sql)
      expect(r.ok, sql).toBe(false)
      expect(r.error).toMatch(/permission denied/)
    }
    await db.close()
  }, 30_000)

  test("نص الترحيل: سحب دقيق بلا حذف بيانات ولا لمس RLS", () => {
    expect(MIGRATION).toMatch(/REVOKE TRUNCATE, REFERENCES, TRIGGER, UPDATE, DELETE\s+ON public\.page_views FROM anon, authenticated/)
    expect(MIGRATION).not.toMatch(/DROP POLICY|DELETE FROM|TRUNCATE TABLE|ALTER TABLE/)
    // INSERT وSELECT محفوظان عن قصد
    expect(MIGRATION).not.toMatch(/REVOKE[^;]*\bINSERT\b[^;]*anon/)
    expect(MIGRATION).not.toMatch(/REVOKE[^;]*\bSELECT\b[^;]*authenticated/)
  })
})
