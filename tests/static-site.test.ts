import { existsSync, readFileSync } from "node:fs";
import { test, expect } from "vitest";
import articles from "../src/data/articles.json";
import documentsRaw from "../src/data/docs.json";
import events from "../src/data/events.json";
import lexicon from "../src/data/lexicon.json";
import schools from "../src/data/schools.json";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

/** سجلات الأرشيف المحلي — يُصرَّح بنوعه لأن المصفوفة قد تكون فارغة. */
const documents = documentsRaw as Array<{ id: string; title: string; semester: string; fileUrl: string }>;

test("الهيكل العام للموقع يدعم اللغة العربية فقط وخالٍ من الإعلانات القديمة", () => {
  const index = read("index.html");

  // التأكيد على أن اللغة الوحيدة المعرفة هي العربية (ar-MA = العربية المغربية)
  // ملاحظة: كان هذا التوقّع "ar" فقط، وهو قديم ولا يطابق index.html الفعلي
  // (ar-MA أدق لأنه يحدّد اللهجة المغربية للمنصة).
  expect(index).toContain('<html lang="ar-MA" dir="rtl" class="dark">');

  // التأكد من عدم وجود لغات أجنبية ثانوية في hreflang
  expect(index).not.toContain('hreflang="fr"');
  expect(index).not.toContain('hreflang="en"');
  expect(index).not.toContain('hreflang="es"');

  // التأكد من خلو الموقع من النصيصات والخدمات الخارجية غير المرغوب فيها
  expect(index).not.toContain("google-adsense-account");
  expect(index).not.toContain("images.unsplash.com");
  expect(index).not.toContain("challenges.cloudflare.com");
});

test("المسارات الثابتة والبيانات المحلية بالعربية متوفرة بالكامل", () => {
  const sitemap = read("public/sitemap.xml");

 // التحقق من المسارات الرئيسية والفصول الدراسية الستة
  expect(sitemap).toContain("https://www.mizan.page");
  expect(sitemap).toContain("https://www.mizan.page/archive");
  expect(sitemap).toContain("https://www.mizan.page/news");
  expect(sitemap).toContain("https://www.mizan.page/events");
  expect(sitemap).toContain("https://www.mizan.page/schools");
  expect(sitemap).toContain("https://www.mizan.page/lexicon");

  // التأكد من وجود مسارات الفصول من S1 إلى S6
  ["s1", "s2", "s3", "s4", "s5", "s6"].forEach((sem) => {
    expect(sitemap).toContain(`https://www.mizan.page/${sem}`);
  });

  // التحقق من صحة البيانات المحلية (الفصول من S1 إلى S6)
  //
  // ملاحظة: الفحص القديم كان يتحقق من شكل الرابط فقط
  // (`doc.fileUrl.startsWith("/docs/")`)، فمرّت تسعة سجلات تشير إلى ملفات
  // PDF غير موجودة أصلاً في public/ — صفحات «تحميل» كاملة في sitemap.xml
  // بزرّ يفتح 404. الفحص الآن يتحقق من وجود الملف نفسه، لا من شكل رابطه.
  expect(documents.every((doc) => /^S[1-6]$/.test(doc.semester))).toBe(true);
  for (const doc of documents) {
    expect(doc.fileUrl, `ملف أرشيف بلا رابط: ${doc.title}`).toMatch(/^(https?:\/\/|\/)/);
    if (!doc.fileUrl.startsWith("/")) continue; // رابط مطلق (تخزين خارجي) — خارج هذا الفحص
    const localPath = new URL(`../public${doc.fileUrl}`, import.meta.url);
    expect(
      existsSync(localPath),
      `رابط أرشيف ميت: ${doc.title} → ${doc.fileUrl} (لا ملف يقابله في public/)`
    ).toBe(true);
  }
  expect(lexicon.every((term) => term.term_ar && term.definition)).toBe(true);
  expect(articles.every((article) => article.slug && article.body.length > 0)).toBe(true);
  expect(events.every((event) => event.slug && event.sourceUrl.startsWith("https://"))).toBe(true);
  // بعض الكليات (فروع/ملحقات صغيرة تابعة لجامعة أم) لا تملك موقعاً إلكترونياً خاصاً بها بعد،
  // لذا officialUrl اختياري؛ عند وجوده يجب أن يكون رابطاً فعلياً (http/https).
  expect(
    schools.every(
      (school) => school.slug && (!school.officialUrl || /^https?:\/\//.test(school.officialUrl))
    )
  ).toBe(true);
});
