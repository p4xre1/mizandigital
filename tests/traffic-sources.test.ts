// مصادر الزيارات: تجميع page_views.referrer حسب المضيف على PostgreSQL حقيقي (PGlite).
//
// يتحقق من:
//   1) التصنيف: referrer فارغ ⇒ direct، من نطاقنا ⇒ internal، وما عداهما مضيف بلا www.
//   2) الأعداد: views لكل مصدر و visitors (عدّ distinct لـ visitor_id) صحيحة،
//      والترتيب بالأكثر زيارة، و p_limit يعمل.
//   3) الصلاحيات: لا EXECUTE لـ anon، وEXECUTE لـ authenticated، والباقي محجوب.
//
// إن لم تكن @electric-sql/pglite مثبَّتة تُعلَّم الاختبارات NOT RUN.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

const ROOT = join(__dirname, "..")
const MIGRATION = readFileSync(
  join(ROOT, "supabase/migrations/20261012000500_page_views_traffic_sources.sql"),
  "utf8",
)

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
`

/** صفوف اختبارية: [referrer, visitor_id, منذ كم دقيقة] */
const ROWS: Array<[string | null, string, number]> = [
  // دخول مباشر (بلا مُحيل): 3 مشاهدات لزائرين مختلفين
  [null, "v-direct-1", 10],
  ["", "v-direct-2", 12],
  ["   ", "v-direct-1", 14],
  // من فيسبوك (بحالتَي www و بلا www ⇒ نفس المصدر)
  ["https://www.facebook.com/groups/123", "v-fb-1", 20],
  ["https://facebook.com/l.php?u=x", "v-fb-2", 22],
  ["https://m.facebook.com/some", "v-fb-3", 24], // m.facebook.com مضيف مختلف عمداً
  // من جوجل
  ["https://www.google.com/search?q=mizan", "v-g-1", 30],
  ["https://google.com/", "v-g-2", 32],
  // من داخل الموقع نفسه (www وغير www)
  ["https://www.mizan.page/articles/x", "v-int-1", 40],
  ["https://mizan.page/", "v-int-2", 42],
  // مصدر قديم (خارج النافذة الزمنية)
  ["https://old-source.example/", "v-old", 60 * 24 * 30],
]

let PGlite: any = null
try {
  const modName = "@electric-sql/pglite"
  PGlite = (await import(/* @vite-ignore */ modName)).PGlite
} catch {
  PGlite = null
}
const suite = PGlite ? describe.sequential : describe.skip

async function asRole(db: any, role: string, sql: string): Promise<{ ok: boolean; rows?: any[]; error?: string }> {
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
  for (const [referrer, visitor, minutesAgo] of ROWS) {
    await db.query(
      `INSERT INTO public.page_views (content_type, content_id, path, visitor_id, session_id, referrer, user_agent, created_at)
       VALUES ('page', '/', '/', $1, $2, $3, 'Mozilla/5.0 (real browser)', now() - ($4 || ' minutes')::interval)`,
      [visitor, `s-${visitor}`, referrer, String(minutesAgo)],
    )
  }
  await db.exec(MIGRATION)
  return db
}

suite("مصادر الزيارات (page_views.referrer)", () => {
  test("التصنيف والأعداد: direct و internal والمضيف بلا www", async () => {
    const db = await withDb()
    const r = await db.query(
      "SELECT source, views, visitors FROM public.get_visits_by_referrer(now() - interval '7 days')",
    )
    const rows = r.rows.map((x: any) => ({ ...x, views: Number(x.views), visitors: Number(x.visitors) }))
    const bySource = Object.fromEntries(rows.map((x: any) => [x.source, x]))

    // مباشر: 3 مشاهدات (منها سطران لنفس الزائر) ⇒ زائران
    expect(bySource["direct"]).toEqual({ source: "direct", views: 3, visitors: 2 })
    // فيسبوك: www و بلا www مجموعان، و m.facebook.com مصدر منفصل
    expect(bySource["facebook.com"]).toEqual({ source: "facebook.com", views: 2, visitors: 2 })
    expect(bySource["m.facebook.com"]).toEqual({ source: "m.facebook.com", views: 1, visitors: 1 })
    // جوجل: النطاقان مجموعان
    expect(bySource["google.com"]).toEqual({ source: "google.com", views: 2, visitors: 2 })
    // تنقّل داخلي: نطاقنا بحالتيه
    expect(bySource["internal"]).toEqual({ source: "internal", views: 2, visitors: 2 })
    // المصدر خارج النافذة الزمنية غير محسوب
    expect(bySource["old-source.example"]).toBeUndefined()
    expect(rows).toHaveLength(5)
    await db.close()
  }, 30_000)

  test("الترتيب بالأكثر زيارة ثم p_limit", async () => {
    const db = await withDb()
    const all = await db.query("SELECT source FROM public.get_visits_by_referrer(now() - interval '7 days')")
    expect(all.rows.map((x: any) => x.source)[0]).toBe("direct")

    const limited = await db.query("SELECT source FROM public.get_visits_by_referrer(now() - interval '7 days', 2)")
    expect(limited.rows.map((x: any) => x.source)).toEqual(["direct", "facebook.com"])

    const zeroLimit = await db.query("SELECT source FROM public.get_visits_by_referrer(now() - interval '7 days', 0)")
    expect(zeroLimit.rows.length).toBeGreaterThan(0) // greatest(p_limit,1) لا يسمح بصفر
    await db.close()
  }, 30_000)

  test("مُحيل بلا مخطط (نص حر) لا يُسقط الدالة", async () => {
    const db = await withDb()
    await db.query(
      `INSERT INTO public.page_views (content_type, content_id, path, visitor_id, referrer)
       VALUES ('page', '/', '/', 'v-weird', 'android-app://com.whatsapp')`,
    )
    const r = await db.query(
      "SELECT source, views FROM public.get_visits_by_referrer(now() - interval '7 days', 12) WHERE source LIKE '%whatsapp%'",
    )
    expect(Number((r.rows[0] as any).views)).toBe(1)
    await db.close()
  }, 30_000)

  test("الصلاحيات: anon لا ينفّذ، authenticated ينفّذ، وPUBLIC محجوب", async () => {
    const db = await withDb()
    const anon = await asRole(db, "anon", "SELECT * FROM public.get_visits_by_referrer(now() - interval '1 day')")
    expect(anon.ok).toBe(false)
    expect(anon.error).toMatch(/permission denied/)

    const auth = await asRole(db, "authenticated", "SELECT count(*)::int AS n FROM public.get_visits_by_referrer(now() - interval '1 day')")
    expect(auth.ok).toBe(true)

    // service_role يبقى (اصطلاح Supabase للمفتاح الخادمي)، وanon غائب تماماً
    const acl = await db.query(`
      SELECT grantee FROM information_schema.role_routine_grants
      WHERE routine_schema = 'public' AND routine_name = 'get_visits_by_referrer'
      GROUP BY grantee ORDER BY grantee`)
    const grantees = acl.rows.map((x: any) => x.grantee)
    expect(grantees).toContain("authenticated")
    expect(grantees).not.toContain("anon")
    expect(grantees).not.toContain("PUBLIC")
    await db.close()
  }, 30_000)

  test("نص الترحيل مقيّد بالنمط المتفق عليه لباقي دوال الإحصاء", () => {
    expect(MIGRATION).toMatch(/SECURITY DEFINER/)
    expect(MIGRATION).toMatch(/SET search_path = public/)
    // PUBLIC قبل anon: بلا سطر PUBLIC يبقى anon قادراً على التنفيذ (تحقّق فعلي)
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.get_visits_by_referrer\(timestamptz, int\) FROM PUBLIC/)
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.get_visits_by_referrer\(timestamptz, int\) FROM anon/)
    expect(MIGRATION).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_visits_by_referrer\(timestamptz, int\) TO authenticated/)
    expect(MIGRATION).toMatch(/ALTER FUNCTION public\.get_visits_by_referrer\(timestamptz, int\) OWNER TO postgres/)
  })
})
