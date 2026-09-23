import { readFileSync } from "node:fs";
import { test, expect } from "vitest";

/**
 * «أضف كل llms» — llms-full.txt أصبح تصديراً كاملاً: كل نص في كل مجموعة
 * بيانات بلا تقطيع، وllms.txt يعرض الجرد الكامل (567 سجلاً) مع إشارة
 * للنسخة الكاملة وطبقة المرجعيات. الفحص على الملف الملتزم (توليد محلي
 * بلا CMS) + على القوالب نفسها (لكي يبقى الأمر صحيحاً عند أي تعديلة).
 */

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

const articles = JSON.parse(read("src/data/articles.json"));
const news = JSON.parse(read("src/data/news.json"));
const lexicon = JSON.parse(read("src/data/lexicon.json"));
const schools = JSON.parse(read("src/data/schools.json"));
const events = JSON.parse(read("src/data/events.json"));
const docs = JSON.parse(read("src/data/docs.json"));
const faq = JSON.parse(read("src/data/faq.json"));
const quiz = JSON.parse(read("src/data/quiz-questions.json"));

const LLMS_FULL = norm(read("public/llms-full.txt"));
const LLMS_FULL_RAW = read("public/llms-full.txt");

test("llms-full: جرد كامل (567 سجلاً محلياً) والأقسام الكاملة كلها موجودة", () => {
  const raw = read("public/llms-full.txt");
  // 8+13+250+21+9+0 laws(محلياً)+3+39+224 = 567
  expect(raw).toContain("يضم 567 سجلاً");
  for (const section of [
    "كل المعجم القانوني (250) — التعريفات كاملة",
    "كل المقالات (8) — النصوص الكاملة",
    "كل المستجدات (13) — النصوص الكاملة",
    "كل كليات الحقوق (21) — التفاصيل",
    "كل الفعاليات (3)",
    "كل الأرشيف الدراسي (9) — الملفات والملخصات",
    "كل أسئلة الاختبارات (224) — كاملة",
    "الأسئلة الشائعة (FAQ — AEO) — كاملة (39)",
  ]) {
    expect(raw, `القسم مفقود: ${section}`).toContain(section);
  }
  // البيانات المهيكّلة مقابلها معلنة
  expect(raw).toContain("/reference/");
});

test("llms-full: كل مقال وخبر بنصه الكامل (بلا تقطيع)", () => {
  for (const a of articles) {
    const body = norm(Array.isArray(a.body) ? a.body.join(" ") : a.body || "");
    expect(LLMS_FULL, `مقال مفقود: ${a.title}`).toContain(a.title);
    const probe = body.slice(0, 120);
    expect(probe.length).toBeGreaterThan(30);
    expect(LLMS_FULL, `نص المقال غير كامل: ${a.title}`).toContain(probe);
  }
  for (const n of news) {
    const body = norm(n.content || "");
    expect(LLMS_FULL, `خبر مفقود: ${n.title}`).toContain(n.title);
    const probe = body.slice(0, 120);
    expect(probe.length).toBeGreaterThan(30);
    expect(LLMS_FULL, `نص الخبر غير كامل: ${n.title}`).toContain(probe);
  }
});

test("llms-full: كل مصطلح في المعجم بتعريفه كاملاً", () => {
  for (const t of lexicon) {
    expect(LLMS_FULL, `مصطلح مفقود: ${t.term_ar}`).toContain(t.term_ar);
  }
  // التعريفات لم تعد تُقطع عند 200: أطول تعريف موجود كاملاً
  const longest = (lexicon as Array<{ term_ar?: string; definition?: string }>).reduce(
    (a, b) => ((a.definition || "").length >= (b.definition || "").length ? a : b)
  );
  const def = norm(longest.definition || "");
  expect(def.length).toBeGreaterThan(40);
  expect(LLMS_FULL, `تعريف ${longest.term_ar} غير كامل`).toContain(def);
});

test("llms-full: كل كلية وفعالية وملف وأسئلة FAQ واختبارات", () => {
  for (const s of schools) {
    expect(LLMS_FULL, `كلية مفقودة: ${s.name}`).toContain(s.name);
    if (s.synopsis) expect(LLMS_FULL, `نبذة الكلية: ${s.name}`).toContain(norm(s.synopsis));
  }
  for (const e of events) expect(LLMS_FULL, `فعالية مفقودة: ${e.title}`).toContain(e.title);
  for (const d of docs) expect(LLMS_FULL, `ملف مفقود: ${d.title}`).toContain(d.title);
  for (const g of faq) for (const item of g.items || []) {
    expect(LLMS_FULL, `سؤال FAQ مفقود`).toContain(norm(item.question));
  }
  for (const q of quiz) expect(LLMS_FULL, `سؤال اختبار مفقود`).toContain(norm(q.question));
});

test("القوالب: جرد كامل في llms.txt وقالب dist ومصادر المولّدات", () => {
  // public/llms.txt (generate-llms.mjs)
  const llms = read("public/llms.txt");
  expect(llms).toContain("39 سؤالاً شائعاً");
  expect(llms).toContain("224 سؤال اختبار");
  expect(llms).toContain("/llms-full.txt");
  expect(llms).toContain("/reference/index.json");

  // قالب dist/llms.txt (llms-content.mjs عبر prerender)
  const tpl = read("scripts/lib/llms-content.mjs");
  expect(tpl).toContain("الأسئلة الشائعة: ${statistics.faq}");
  expect(tpl).toContain("أسئلة الاختبارات: ${statistics.quiz}");
  expect(tpl).toContain("reference/index.json");

  // prerender: الإحصاءات تتضمّن faq + quiz في الإجمالي
  const pre = read("scripts/prerender.mjs");
  expect(pre).toMatch(/faq:\s*\(faqGroups \?\? \[\]\)\.reduce/);
  expect(pre).toMatch(/quiz:\s*count\(quizQuestions\)/);
  expect(pre).toMatch(/statistics\.faq \+\s*\n\s*statistics\.quiz/);

  // mjs المولّد الكامل: النصوص بدون clamp في الأقسام الكاملة
  const gen = read("scripts/generate-llms-enhanced.mjs");
  expect(gen).toContain("fullLines.push(article.content);");
  expect(gen).toContain("fullLines.push(item.content);");
  expect(gen).toContain("كل أسئلة الاختبارات");
  expect(gen).toContain("كل الفعاليات");
});

test("ai.txt: جرد مكتمل + طبقة المرجعيات + MCP", () => {
  const ai = read("public/ai.txt");
  expect(ai).toContain("224 quiz questions");
  expect(ai).toContain("39 FAQ");
  expect(ai).toContain("https://www.mizan.page/reference/index.json");
  expect(ai).toContain("https://www.mizan.page/mcp");
});
