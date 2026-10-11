// «هل توقّف جمع الزيارات؟» — دالة صحة التتبّع على PostgreSQL حقيقي (PGlite).
//
// كتابة الزيارة من المتصفح تتجاهل أخطاء الإدراج عمداً (لا خطأ ظاهر للزائر)، فأي
// عطل في الإدراج (مشروع موقوف، مفتاح تغيّر، سياسة سُحذفت، CSP) يوقف الأرقام
// بصمت. هذه الدالة تعطي الحقيقة: متى وصل آخر صف، وكم صفاً/زائراً في 24 ساعة.
//
// إن لم تكن @electric-sql/pglite مثبَّتة تُعلَّم الاختبارات NOT RUN.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

const ROOT = join(__dirname, "..")
const MIGRATION = readFileSync(join(ROOT, "supabase/migrations/20261012000600_tracking_health.sql"), "utf8")
const ADMIN_PAGE = readFileSync(join(ROOT, "src/pages/admin/AnalyticsPage.tsx"), "utf8")

const PRE_STATE = `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  END $$;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

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

/** [content_type, visitor_id, منذ كم دقيقة] */
type Row = [string, string, number]

const HEALTHY: Row[] = [
  ["page", "v1", 5],
  ["page", "v2", 30],
  ["article", "v1", 60],
  ["page", "v1", 90],
  ["news", "v3", 60 * 20],
  ["page", "v4", 60 * 30],
  ["term", "v5", 60 * 24 * 5],
]

const STALE: Row[] = [
  ["page", "v1", 60 * 24 * 3],
  ["article", "v2", 60 * 24 * 4],
]

let PGlite: any = null
try {
  const modName = "@electric-sql/pglite"
  PGlite = (await import(/* @vite-ignore */ modName)).PGlite
} catch {
  PGlite = null
}
const suite = PGlite ? describe.sequential : describe.skip

async function withDb(rows: Row[]) {
  const db = new PGlite()
  await db.exec(PRE_STATE)
  for (const [type, visitor, minutesAgo] of rows) {
    await db.query(
      `INSERT INTO public.page_views (content_type, content_id, visitor_id, session_id, created_at)
       VALUES ($1, '/x', $2, $3, now() - ($4 || ' minutes')::interval)`,
      [type, visitor, `s-${visitor}`, String(minutesAgo)],
    )
  }
  await db.exec(MIGRATION)
  return db
}

async function health(db: any) {
  const r = await db.query("SELECT public.get_tracking_health() AS h")
  const h = (r.rows[0] as any).h
  return {
    ...h,
    age_minutes: h.age_minutes === null ? null : Number(h.age_minutes),
    rows_24h: Number(h.rows_24h),
    rows_7d: Number(h.rows_7d),
    visitors_24h: Number(h.visitors_24h),
    by_type_24h: (h.by_type_24h ?? []).map((t: any) => ({ content_type: t.content_type, rows: Number(t.rows) })),
  }
}

suite("صحة تتبّع الزيارات", () => {
  test("وضع سليم: آخر حدث قبل دقائق، وعدّ 24 ساعة/7 أيام صحيح", async () => {
    const db = await withDb(HEALTHY)
    const h = await health(db)
    // آخر صف = قبل 5 دقائق
    expect(h.age_minutes).toBeGreaterThanOrEqual(4)
    expect(h.age_minutes).toBeLessThan(10)
    // 24 ساعة: page(5,30,90) + article(60) + news(20h) = 5 صفوف
    // الزوّار الفريدون: v1 (ثلاث مرات) وv2 وv3 = 3 (صفّا 30h و5 أيام خارج النافذة)
    expect(h.rows_24h).toBe(5)
    expect(h.visitors_24h).toBe(3)
    // 7 أيام تشمل كل الصفوف
    expect(h.rows_7d).toBe(HEALTHY.length)
    // التوزيع مرتّب بالأكثر
    expect(h.by_type_24h[0]).toEqual({ content_type: "page", rows: 3 })
    // آخر زيارة موقع (content_type='page')
    expect(h.last_site_visit_at).not.toBeNull()
    await db.close()
  }, 30_000)

  test("وضع متوقّف: آخر صف قبل أيام ⇒ عمره بالدقائق يكشف العطل", async () => {
    const db = await withDb(STALE)
    const h = await health(db)
    expect(h.age_minutes).toBeGreaterThan(60 * 24 * 2) // > يومين
    expect(h.rows_24h).toBe(0) // لا شيء في النافذة الأخيرة ⇒ البطاقة تُظهر التوقف
    expect(h.visitors_24h).toBe(0)
    expect(h.by_type_24h).toEqual([])
    expect(h.rows_7d).toBe(2)
    await db.close()
  }, 30_000)

  test("جدول فارغ: لا عمر ولا صفوف، ولا خطأ", async () => {
    const db = await withDb([])
    const h = await health(db)
    expect(h.last_event_at).toBeNull()
    expect(h.age_minutes).toBeNull()
    expect(h.rows_24h).toBe(0)
    expect(h.by_type_24h).toEqual([])
    await db.close()
  }, 30_000)

  test("الصلاحيات: anon لا ينفّذ، authenticated ينفّذ", async () => {
    const db = await withDb(HEALTHY)
    await db.exec("SET ROLE anon")
    let denied = false
    try {
      await db.query("SELECT public.get_tracking_health()")
    } catch (e) {
      denied = /permission denied/.test(String((e as Error).message))
    } finally {
      await db.exec("RESET ROLE")
    }
    expect(denied).toBe(true)

    await db.exec("SET ROLE authenticated")
    const ok = await db.query("SELECT public.get_tracking_health() AS h")
    expect((ok.rows[0] as any).h).toBeTruthy()
    await db.exec("RESET ROLE")
    await db.close()
  }, 30_000)

  test("البطاقة في لوحة التحكم تعرض الحالة وتشرح الأسباب، ولا تخلطها بـ Search Console", () => {
    expect(ADMIN_PAGE).toContain('rpc("get_tracking_health"')
    expect(ADMIN_PAGE).toContain("20261012000600_tracking_health.sql")
    expect(ADMIN_PAGE).toContain("توقّف جمع الزيارات")
    expect(ADMIN_PAGE).toContain("مشروع Supabase موقوف")
    // لا يجوز أن يُفهم أن «آخر قراءة» في Search Console عطل في التتبّع
    expect(ADMIN_PAGE).toContain("Search Console ليست تتبّع زيارات")
    // 24 ساعة هي حد التوقف، وساعتان حد التحذير
    expect(ADMIN_PAGE).toMatch(/if \(age < 120\)/)
    expect(ADMIN_PAGE).toMatch(/if \(age < 1440\)/)
  })

  test("نص الترحيل مقيّد بالنمط المتفق عليه", () => {
    expect(MIGRATION).toMatch(/SECURITY DEFINER/)
    expect(MIGRATION).toMatch(/SET search_path = public/)
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.get_tracking_health\(\) FROM PUBLIC/)
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.get_tracking_health\(\) FROM anon/)
    expect(MIGRATION).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_tracking_health\(\) TO authenticated/)
  })
})
