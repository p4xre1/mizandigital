/**
 * اختبارات ترحيل خريطة الإحالات (20261007000000).
 *
 * لا PostgreSQL حقيقياً هنا فالاختبارات ساكنة على نص الترحيل، على نفس نهج
 * tests/pro-tools-rls.test.ts: ما يُتحقق منه هو وجود الضمانات (ترانزاكشن،
 * search_path، سحب الصلاحيات، اشتراط الرابط الآمن)، وهي خصائص نصية يمكن
 * التحقق منها بدقة. سلوك plpgsql الفعلي يحتاج تشغيلاً على قاعدة حقيقية.
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATION = "supabase/migrations/20261007000000_pro_tool_references_map.sql";
let sql = "";

beforeAll(() => {
  // "utf8" إلزامي: بدونه تُرجع readFileSync Buffer وتفشل toContain على نص.
  sql = readFileSync(MIGRATION, "utf8");
});

describe("ترحيل خريطة الإحالات", () => {
  it("يُتيح الأداة للجميع ويحدّث وصفها", () => {
    expect(sql).toContain("slug = 'references'");
    expect(sql).toMatch(/enabled\s*=\s*true/);
    expect(sql).toContain("خريطة الإحالات القانونية");
  });

  it("يعمل داخل ترانزاكشن واحدة", () => {
    // الملف يبدأ بتعليق يشرح ما يفعله وما لا يفعله، ثم BEGIN، ثم COMMIT في آخره.
    expect(sql).toMatch(/(^|\n)BEGIN;/);
    expect(sql.trimEnd().endsWith("COMMIT;")).toBe(true);
    // لا COMMIT قبل نهاية الملف: ترانزاكشن واحدة تُطبَّق كلها أو لا شيء منها.
    expect(sql.match(/\bCOMMIT;/g) ?? []).toHaveLength(1);
  });

  it("يثبّت search_path على الدالة الجديدة ويمنع تنفيذها من العميل", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.validate_pro_tool_reference_payload()");
    expect(sql).toContain("SET search_path = public, pg_temp");
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.validate_pro_tool_reference_payload\(\) FROM PUBLIC, anon, authenticated;/);
  });

  it("يقيد نوع العلاقة بقائمة مغلقة، وقيمة التثبيت بقيمتين فقط", () => {
    for (const type of ["explicit", "delegation", "procedural", "penal", "hierarchy", "interpretive"]) {
      expect(sql, type).toContain(type);
    }
    expect(sql).toContain("NOT IN ('true','false')");
  });

  it("يمنع ادّعاء هدف مؤكد بلا رابط https", () => {
    expect(sql).toContain("target_verified' = 'true'");
    expect(sql).toContain("'^https://[^[:space:]]+$'");
    expect(sql).toContain("a verified reference target needs a valid https target_url");
  });

  it("يربط المشغّل قبل الإدخال والتحديث، لا بعدهما", () => {
    expect(sql).toContain("BEFORE INSERT OR UPDATE ON public.pro_tool_entries");
    expect(sql).toContain("FOR EACH ROW EXECUTE FUNCTION public.validate_pro_tool_reference_payload()");
  });

  it("لا يزرع أي مادة قانونية: المحتوى مراجعة بشرية موثّقة في Git لا في الترحيل", () => {
    expect(sql).not.toMatch(/INSERT\s+INTO\s+public\.pro_tool_entries/i);
    expect(sql).not.toMatch(/INSERT\s+INTO\s+public\.pro_tools\s/i);
  });

  it("لا يحذف بيانات قائمة ولا يغيّر السياسات", () => {
    expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/DROP\s+POLICY/i);
  });

  it("يبدأ بشرط سبق الترحيل الأساس بدل رسالة خطأ مبهمة", () => {
    expect(sql).toContain("20260928000000_pro_legal_tools.sql");
    expect(sql).toContain("RAISE EXCEPTION");
  });
});
