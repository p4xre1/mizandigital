/**
 * اختبارات عزل «تدريبي المهني» على مستوى قاعدة البيانات.
 *
 * لماذا PGlite حقيقي؟ لأن ما نختبره ليس نصّ ترحيل بل سلوك RLS: هل يستطيع
 * مستخدم قراءة صف غيره؟ هل يستطيع الزائر الكتابة؟ وهل تُقبل قيم خارج النطاق؟
 * الاعتماد على فحص نصّي فقط كان سيمرّر ترحيماً يفتح البيانات للجميع.
 *
 * البيئة تُبنى مصغّرة عن الحقيقة: أدوار anon/authenticated، دالة auth.uid()
 * تقرأ claim الـ JWT (نفس صيغة Supabase)، وجدول auth.users الذي تشير إليه
 * المفاتيح الأجنبية.
 *
 * التصحيح المعماري المغطى هنا: الملكية بـ `owner_id` (لا user_id)، ومفتاح
 * أساسي مركّب (owner_id, career_slug)، وسياسة واحدة لكل جدول باسم موحّد،
 * و weak_topics من نوع jsonb.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const userA = "00000000-0000-0000-0000-00000000000a";
const userB = "00000000-0000-0000-0000-00000000000b";

const MIGRATIONS = [
  "supabase/migrations/20260930000000_career_training_tables.sql",
  "supabase/migrations/20260931000000_career_owner_id_and_laws_bridge.sql",
];

async function asUser(id?: string) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id || ""]);
  await db.exec(`SET ROLE ${id ? "authenticated" : "anon"}`);
}

async function rows(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]> {
  return (await db.query(sql, params as never)).rows as Record<string, unknown>[];
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role; -- موجودة في Supabase؛ تُنشأ هنا لأن PGlite لا يوفرها
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
    -- أرشيف القوانين كما هو في المخطط الحقيقي (public.laws): id uuid + slug فريد
    CREATE TABLE public.laws (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      slug text NOT NULL UNIQUE
    );
  `);
  for (const id of [userA, userB]) {
    await db.query("INSERT INTO auth.users VALUES ($1)", [id]);
  }

  for (const file of MIGRATIONS) {
    await db.exec(readFileSync(file, "utf8"));
  }
  // الهجرة الثانية قابلة لإعادة التطبيق (تشغيل جزئي سابق لا يكسر النشر).
  await db.exec(readFileSync(MIGRATIONS[1], "utf8"));
}, 30000);

afterAll(async () => {
  await db.close();
});

describe("تدريبي المهني — جداول خاصة بالمستخدم", () => {
  it("الزائر (anon) لا يمكنه قراءة أي صف ولا كتابته", async () => {
    await asUser();
    await expect(rows("SELECT * FROM career_training_profiles")).rejects.toThrow(/permission denied/);
    await expect(rows("SELECT * FROM career_training_progress")).rejects.toThrow(/permission denied/);
    await expect(
      db.exec("INSERT INTO career_training_profiles(owner_id, career_slug) VALUES (gen_random_uuid(), 'avocat')")
    ).rejects.toThrow(/permission denied/);
  });

  it("الملكية بـ owner_id بقيمة افتراضية من الجلسة (بلا تمرير يدوي)", async () => {
    await asUser(userA);
    // بلا تمرير owner_id: القيمة الافتراضية auth.uid() تمنع انتحال صف غيره
    await db.exec("INSERT INTO career_training_profiles(career_slug) VALUES ('avocat')");
    await db.exec(
      "INSERT INTO career_training_progress(career_slug, attempted_count, best_score, weak_topics) VALUES ('avocat', 2, 70, '[\"avocat\",\"mandat\"]'::jsonb)"
    );
    expect(await rows("SELECT career_slug, owner_id FROM career_training_profiles")).toEqual([
      { career_slug: "avocat", owner_id: userA },
    ]);

    // انتحال owner_id لشخص آخر: ترفضه سياسة WITH CHECK
    await expect(
      db.query("INSERT INTO career_training_profiles(owner_id, career_slug) VALUES ($1, 'notaire')", [userB])
    ).rejects.toThrow(/row-level security/);
  });

  it("كل مستخدم يرى صفوفه وحدها — لا تسرّب بين الحسابين", async () => {
    await asUser(userB);
    expect(await rows("SELECT * FROM career_training_profiles")).toHaveLength(0);
    expect(await rows("SELECT * FROM career_training_progress")).toHaveLength(0);

    await db.exec("INSERT INTO career_training_profiles(career_slug) VALUES ('magistrat')");
    expect(await rows("SELECT career_slug FROM career_training_profiles")).toEqual([{ career_slug: "magistrat" }]);

    expect(
      await rows("UPDATE career_training_profiles SET is_following=false WHERE career_slug='avocat' RETURNING career_slug")
    ).toHaveLength(0);
    expect(await rows("SELECT count(*)::int AS n FROM career_training_profiles")).toEqual([{ n: 1 }]);

    await asUser(userA);
    expect(await rows("SELECT career_slug FROM career_training_profiles")).toEqual([{ career_slug: "avocat" }]);
  });

  it("حدود القيم تمنع تخزين أرقاماً مضللة أو مصطلحات بشكل غير مصفوفة", async () => {
    await asUser(userA);
    await expect(
      db.exec("INSERT INTO career_training_progress(career_slug, best_score) VALUES ('greffe', 140)")
    ).rejects.toThrow(/check/i);
    await expect(
      db.exec("INSERT INTO career_training_progress(career_slug, attempted_count) VALUES ('greffe', -5)")
    ).rejects.toThrow(/check/i);
    await expect(
      db.exec("INSERT INTO career_training_progress(career_slug, weak_topics) VALUES ('greffe', '{}'::jsonb)")
    ).rejects.toThrow(/check/i);
    await expect(
      db.exec("INSERT INTO career_training_profiles(career_slug) VALUES ('م')")
    ).rejects.toThrow(/check/i);
  });

  it("مفتاح أساسي مركّب (owner_id, career_slug) — لا صف مكرّر ولا عمود id بديل", async () => {
    await asUser(userA);
    await expect(
      db.exec("INSERT INTO career_training_profiles(career_slug) VALUES ('avocat')")
    ).rejects.toThrow(/duplicate key|unique/i);

    const columns = await rows(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='career_training_profiles' ORDER BY ordinal_position"
    );
    const names = columns.map((row) => row.column_name);
    expect(names).toContain("owner_id");
    expect(names).not.toContain("user_id");
    expect(names).not.toContain("id");

    const pk = await rows(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'public.career_training_profiles'::regclass AND i.indisprimary
    `);
    expect(pk.map((row) => row.attname).sort()).toEqual(["career_slug", "owner_id"]);
  });

  it("لا حذف لصفوف الغير: DELETE لا يمسّ إلا صفوف صاحبه", async () => {
    await asUser(userB);
    await db.exec("DELETE FROM career_training_profiles");
    await asUser(userA);
    expect(await rows("SELECT count(*)::int AS n FROM career_training_profiles")).toEqual([{ n: 1 }]);
  });
});

describe("جسر المسارات ↔ أرشيف القوانين (career_laws)", () => {
  it("القراءة عامة للزائر والمسجّل، والكتابة ممنوعة على العميل", async () => {
    await db.exec("RESET ROLE");
    await db.query("INSERT INTO public.laws(title, slug) VALUES ('نص تنظيمي للاختبار', 'loi-test-1')");

    await asUser();
    expect(await rows("SELECT career_slug FROM career_laws")).toEqual([]);
    await expect(
      db.exec("INSERT INTO career_laws(career_slug, law_id) SELECT 'avocat', id FROM laws LIMIT 1")
    ).rejects.toThrow(/permission denied/);

    await asUser(userA);
    await expect(
      db.exec("INSERT INTO career_laws(career_slug, law_id) SELECT 'avocat', id FROM laws LIMIT 1")
    ).rejects.toThrow(/permission denied/);
  });

  it("قيد النوع وطول معرّف المسار، وحذف نص قانوني مرتبط ممنوع (ON DELETE RESTRICT)", async () => {
    await db.exec("RESET ROLE");
    await db.query(`
      INSERT INTO career_laws(career_slug, law_id, relationship_type, note_ar)
      SELECT 'avocat', id, 'governing_framework', '' FROM laws WHERE slug='loi-test-1'
    `);

    await expect(
      db.exec("INSERT INTO career_laws(career_slug, law_id, relationship_type) SELECT 'avocat', id, 'not_a_type' FROM laws LIMIT 1")
    ).rejects.toThrow(/check|duplicate/i);

    await expect(db.exec("DELETE FROM laws WHERE slug='loi-test-1'")).rejects.toThrow(/foreign key|violates/i);
  });

  it("نصّ هجرة التصحيح يوثّق الاصطلاح: owner_id في الجداول الخاصة، و school_id text لأي علاقة بالكليات", () => {
    const correction = readFileSync(MIGRATIONS[1], "utf8");
    expect(correction).toContain("owner_id");
    expect(correction).toContain("DEFAULT auth.uid()");
    expect(correction).toContain("ENABLE ROW LEVEL SECURITY");
    for (const policy of ["users_manage_own_career_training_profiles", "users_manage_own_career_training_progress", "career_laws_public_read"]) {
      expect(correction, policy).toContain(policy);
    }
    expect(correction).toMatch(/REVOKE ALL ON public\.career_training_profiles, public\.career_training_progress FROM anon/);
    // هجرة التصحيح نفسها لا تُنشئ أي عمود user_id ولا أي FK للمدارس بـ uuid
    // (public.schools.id نصّي: أي علاقة مستقبلية تُكتب school_id text).
    expect(correction).not.toMatch(/\buser_id\s+uuid\b/);
    expect(correction).not.toMatch(/school_id\s+uuid/i);

    // والهجرة السابقة توجّه القارئ إلى التصحيح صراحةً بدل أن تُترك مرجعاً مضلِّلاً
    const previous = readFileSync(MIGRATIONS[0], "utf8");
    expect(previous).toContain("20260931000000_career_owner_id_and_laws_bridge.sql");
  });
});
