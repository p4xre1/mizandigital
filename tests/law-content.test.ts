import { readFileSync, existsSync } from "node:fs";
import { test, expect } from "vitest";

/**
 * عمود content في جدول laws — البنية الكاملة:
 * migration → استعلام الـ CMS → prerender (صفحة /pdf/<slug> ثابتة) →
 * لوحة الإدارة (نموذج الإضافة/التعديل) → صفحة التحميل client-side →
 * llms-full.txt. الملف الثابت هو ما يقرؤه الزاحف والوكلاء، لذا شمول
 * النص في prerender شرط أساس (رابط في sitemap بلا نص = قيمة معدومة).
 */

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("المigration يضيف عمود content في laws (تقريبياً بلا كسر)", () => {
  const file = "supabase/migrations/20260922120000_add_laws_content.sql";
  expect(existsSync(new URL(`../${file}`, import.meta.url))).toBe(true);
  const sql = read(file);
  expect(sql).toMatch(/ALTER TABLE public\.laws ADD COLUMN IF NOT EXISTS content text/i);
});

test("استعلام الـ CMS يجلب content والميتاداتن القانونية", () => {
  const src = read("scripts/lib/cms-content.mjs");
  const lawsQuery = src.match(/laws:\s*`select=([^&]+)&/);
  expect(lawsQuery, "لم يُعثر على استعلام laws").toBeTruthy();
  const columns = lawsQuery![1].split(",");
  for (const col of ["content", "official_gazette_number", "publication_date"]) {
    expect(columns, `العمود ${col} مفقود من استعلام laws`).toContain(col);
  }
});

test("prerender: صفحة القانون الثابتة تعرض النص كاملاً + ميتاداتنه", () => {
  const src = read("scripts/prerender.mjs");

  // تمييز مصدر السجل: laws لها عرض أعمق من ملفات الملخصات
  expect(src).toContain('kind: "law"');

  // النص يُقسّم لفقرات (سطر فارغ) ويهرب HTML — بلا حقن
  expect(src).toMatch(/lawParagraphs\s*=\s*lawText\s*\n?\s*\.split\(/);
  expect(src).toMatch(/escapeHtml\(p\)/);
  expect(src).toContain("نص القانون");

  // حقول القانون تظهر في الجسم
  expect(src).toContain("رقم القانون");
  expect(src).toContain("عدد الجريدة الرسمية");
  expect(src).toContain("تاريخ الصدور");

  // رابط التحميل: pdf_url هو حقل laws في جدول laws
  expect(src).toMatch(/fileUrl = entry\.item\?\.fileUrl \|\| entry\.item\?\.file_url \|\| entry\.item\?\.pdf_url/);

  // JSON-LD: النص الكامل متاحاً داخل المخطط أيضاً
  expect(src).toMatch(/\.\.\.\(lawText \? \{ text: lawText \} : \{\}\)/);
});

test("prerender: عنوان وصفحة القانون يختلفان عن صفحة الملخص عند وجود نص", () => {
  const src = read("scripts/prerender.mjs");
  expect(src).toContain("النص القانوني والموجز");
  // الوصف الافتراضي الخاص بالقوانين
  expect(src).toContain("نص تشريعي منشور في أرشيف ميزان الرقمية");
});

test("لوحة الإدارة: حقل content في الواجهة والحفظ", () => {
  const src = read("src/pages/admin/LawsPage.tsx");

  // النوع
  expect(src).toMatch(/content\?: string/);

  // الحالة + تعبئة النموذج عند الإضافة والتعديل
  expect(src).toContain('const [content, setContent] = useState<string>("")');
  expect(src).toContain('setContent(law.content || "")');

  // الحفظ في payload (update + insert يشاركان نفس الـ payload)
  expect(src).toMatch(/content:\s*content\.trim\(\) \|\| null/);

  // حقل إدخال في النموذج مع إرشاد الصيغة
  expect(src).toContain("نص القانون / المقتطفات القانونية");
  expect(src).toContain("يُفصَل بين الفقرات بسطر فارغ");
});

test("صفحة التحميل: جلب content من laws وعرضه client-side", () => {
  const src = read("src/pages/public/PdfDownloadPage.tsx");

  // الاستعلام يشمل العمود الجديد + الميتاداتن
  expect(src).toMatch(/select\("id, title, pdf_url, description, content, law_number, official_gazette_number, publication_date"\)/);

  // التقسيم لفقرات يطابق prerender تماماً
  expect(src).toMatch(/\.split\(\/\\n\{2,\}\/\)/);
  expect(src).toContain("aria-label=\"نص القانون\"");

  // إخلاء المسؤولية: النص تعليمي ولا يغني عن الرسمي
  expect(src).toContain("الأمانة العامة للحكومة");
});

test("llms-full.txt: قسم النصوص القانونية مع النص الكامل", () => {
  const src = read("scripts/generate-llms-enhanced.mjs");

  // جلب الـ CMS غير قاتل (بلا شبكة = بيانات محلية فقط)
  expect(src).toContain("fetchPublishedCmsContent");

  // فهرس القوانين في الجزء المشترك + النصوص الكاملة في النسخة الموسعة
  expect(src).toContain("## النصوص القانونية");
  expect(src).toContain("## كل النصوص القانونية — النصوص الكاملة");

  // روابط مطابقة لسياسة المسارات /pdf/<slug> بترتيب slugs نفسه (docs → pdfs → laws)
  expect(src).toContain("`/pdf/${law.slug}`");
  // ترتيب slugs: مرور واحد docs ثم pdfs ثم laws على مجموعة مشتركة واحدة
  expect(src).toContain("const docEntries = [");
  expect(src).toContain("...documents.map((item) => ({ ...item, slug: docSlug(item, docTaken) }))");
  expect(src).toContain("...cmsPdfs.map((item) => ({ ...item, slug: docSlug(item, docTaken) }))");
  expect(src).toContain("const lawEntries = cmsLaws.map((item) => ({ ...item, slug: docSlug(item, docTaken) }));");
});
