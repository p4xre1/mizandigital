// scripts/generate-llms.mjs
//
// يولّد public/llms.txt — ملف Markdown يصف الموقع لوكلاء الذكاء الاصطناعي
// وفق مواصفة llmstxt.org.
//
// ── لماذا هذا الملف موجود ──────────────────────────────────────────────────
// كان public/llms.txt في هذا المستودع يحتوي **كود JavaScript** (نسخة مبتورة
// من scripts/prerender.mjs) بدل Markdown. أي نموذج لغوي أو وكيل يقرأ
// /llms.txt كان يستلم نصاً برمجياً لا وصف محتوى. يُصحَّح ذلك هنا.
//
// البنية حسب المواصفة:
//   # اسم الموقع
//   > وصف قصير في اقتباس
//   فقرات اختيارية
//   ## أقسام بقوائم [العنوان](الرابط): الوصف
//   ## Optional  → روابط ثانوية يجوز للوكيل تجاهلها

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "../src/data");
const OUTPUT = join(__dirname, "../public/llms.txt");
// سياسة الروابط والمعرّفات موحّدة مع الواجهة و prerender و sitemap.
// كان لكل سكربت نسخة خاصة به من الترميز ومن «كيف يُفصل التكرار»، فتولّد
// روابط في llms.txt لا ملف مقابل لها (مثال: /lexicon/الرهن-الحيازي-x).
import {
  SITE_ORIGIN as DOMAIN,
  articleSlug,
  canonicalHome,
  eventSlug,
  lexiconSlug,
  newsSlug,
  schoolSlug,
} from "../shared/seo/url-policy.js";

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));

const [articles, news, lexicon, schools, documents, events, faqGroups] = await Promise.all([
  readJson("articles.json"),
  readJson("news.json"),
  readJson("lexicon.json"),
  readJson("schools.json"),
  readJson("docs.json"),
  readJson("events.json"),
  readJson("faq.json"),
]);

/** يقطع نصاً عند حدّ معيّن على حدّ كلمة. */
const clamp = (value, max = 160) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
};

const link = (title, path, description) =>
  description ? `- [${title}](${DOMAIN}${path}): ${clamp(description)}` : `- [${title}](${DOMAIN}${path})`;


const counts = {
  articles: articles.length,
  news: news.length,
  lexicon: lexicon.length,
  schools: schools.length,
  documents: documents.length,
  events: events.length,
};
const total = Object.values(counts).reduce((a, b) => a + b, 0);

const usedSlugs = new Set();
const lexiconSlugs = lexicon.map((term) => ({
  ...term,
  slug: lexiconSlug(term, usedSlugs),
}));

const lines = [];

lines.push("# ميزان الرقمية (Mizan Digital)");
lines.push("");
lines.push(
  "> منصة مغربية مجانية للمعرفة القانونية والأكاديمية، موجّهة لطلبة كليات الحقوق والباحثين: ملخصات ودروس، معجم قانوني عربي-فرنسي، مستجدات تشريعية وقضائية، دليل كليات الحقوق، وأرشيف ملفات PDF."
);
lines.push("");
lines.push(
  `المحتوى باللغة العربية (ar-MA). يضم ${total} سجلاً: ${counts.articles} مقالاً، ${counts.news} خبراً، ${counts.lexicon} مصطلحاً قانونياً، ${counts.schools} كلية، ${counts.documents} مستنداً، و${counts.events} فعالية.`
);
lines.push("");
lines.push(
  "تنبيه مهم: المنصة تعليمية وبحثية وليست مصدراً رسمياً للتشريع ولا تقدّم استشارة قانونية. عند الاستشهاد بنص قانوني يجب التحقق من النص النافذ عبر المصادر الرسمية أدناه."
);
lines.push("");

lines.push("## الأقسام الرئيسية");
lines.push("");
lines.push(link("المقالات", "/articles", "شروحات ومنهجيات قانونية لطلبة الحقوق"));
lines.push(link("المستجدات", "/news", "أخبار تشريعية وقضائية مغربية"));
lines.push(link("المعجم القانوني", "/lexicon", "مصطلحات قانونية عربية-فرنسية مع تعريفاتها"));
lines.push(link("كليات الحقوق", "/schools", "دليل كليات الحقوق بالمغرب ومعلومات التسجيل"));
lines.push(link("الأرشيف والملفات", "/archive", "ملخصات ومحاضرات وملفات PDF حسب الفصل S1-S6"));
lines.push(link("الندوات والفعاليات", "/events", "فعاليات أكاديمية وقانونية"));
lines.push(link("المنصة", "/platform", "ما تقدمه ميزان لطلبة الحقوق: ملخصات، ومعجم مصطلحات، ودليل كليات، ومستجدات في مكان واحد"));
lines.push(link("دليل الطالب الجديد", "/guides/new-law-student-morocco", "أول أسبوع في كلية الحقوق: النظام، والموارد التي تكفي، ونصائح المراجعة"));
lines.push(link("الموارد القانونية المجانية", "/guides/free-legal-resources-morocco", "أفضل الموارد المجانية لطلبة القانون في المغرب ومتى يُستخدم كل منها"));
lines.push(link("الأسئلة الشائعة", "/faq", "أسئلة متكررة حول الدراسة القانونية والمنصة"));
lines.push(link("الاختبارات القانونية", "/quiz", "أربعة مسارات: الكلية (S1-S6)، العشوائي، المباريات المهنية، المقابلات"));
lines.push("");

lines.push("## المقالات");
lines.push("");
for (const article of articles) {
  lines.push(link(article.title, `/articles/${articleSlug(article)}`, article.excerpt));
}
lines.push("");

lines.push("## المستجدات التشريعية والقضائية");
lines.push("");
for (const item of news) {
  lines.push(link(item.title, `/news/${newsSlug(item)}`, item.summary));
}
lines.push("");

lines.push("## كليات الحقوق");
lines.push("");
for (const school of schools) {
  lines.push(link(school.name, `/schools/${schoolSlug(school)}`, `${school.university} — ${school.city}`));
}
lines.push("");

lines.push("## عينة من المعجم القانوني");
lines.push("");
lines.push(`<!-- المعجم كامل يضم ${lexicon.length} مصطلحاً على /lexicon -->`);
for (const term of lexiconSlugs.slice(0, 40)) {
  // الشرح المبسّط مقدَّم على التعريف: llms.txt يُقرأ من نماذج تريد جواباً
  // لطالب، وsimple_explanation هي العبارة التي تُفهم من أول قراءة.
  lines.push(link(term.term_ar, `/lexicon/${term.slug}`, term.simple_explanation || term.definition));
}
lines.push("");

lines.push("## الفصول الدراسية");
lines.push("");
for (const semester of ["s1", "s2", "s3", "s4", "s5", "s6"]) {
  lines.push(link(`الفصل ${semester.toUpperCase()}`, `/${semester}`, "ملخصات ومحاضرات هذا الفصل"));
}
lines.push("");

lines.push("## صفحات قانونية ومعلوماتية");
lines.push("");
lines.push(link("من نحن", "/about", "تعريف بالمنصة وفريقها ومنهجها"));
lines.push(link("الشروط وإخلاء المسؤولية", "/terms", "حدود استعمال المحتوى"));
lines.push(link("سياسة الخصوصية", "/privacy", "معالجة البيانات الشخصية"));
lines.push(link("سياسة ملفات الارتباط", "/cookies", ""));
lines.push(link("تواصل معنا", "/contact", "contact@mizan.page"));
lines.push("");

lines.push("## مصادر رسمية للتحقق");
lines.push("");
lines.push("- [بوابة عدالة](https://adala.justice.gov.ma/): النصوص القانونية المغربية النافذة");
lines.push("- [الأمانة العامة للحكومة](https://www.sgg.gov.ma/): الجريدة الرسمية والمشاريع");
lines.push("- [الجريدة الرسمية](https://www.sgg.gov.ma/arabe/JournalOfficiel.aspx): النصوص المنشورة");
lines.push("- [وزارة التعليم العالي](https://www.enssup.gov.ma/): التعليم العالي والبحث العلمي");
lines.push("");

lines.push("## واجهات آلية");
lines.push("");
lines.push("- [MCP endpoint](https://www.mizan.page/mcp): Model Context Protocol — أدوات قراءة عامة");
lines.push("- [AI catalog](https://www.mizan.page/.well-known/ai-catalog.json): فهرس المحتوى للوكلاء");
lines.push("- [Agent card](https://www.mizan.page/.well-known/agent-card.json): بطاقة اكتشاف الوكيل (A2A)");
lines.push("- [خريطة الموقع](https://www.mizan.page/sitemap.xml): كل الروابط القابلة للفهرسة");
lines.push("- [RSS](https://www.mizan.page/feed.xml): تغذية المستجدات");
lines.push("");

lines.push("## Optional");
lines.push("");
lines.push("- [البحث](https://www.mizan.page/search): بحث داخلي في كل المحتوى");
lines.push("- [تسجيل الدخول](https://www.mizan.page/login): للوصول إلى لوحة التحرير (غير مطلوب للقراءة)");
lines.push("");

await writeFile(OUTPUT, `${lines.join("\n")}\n`, "utf8");
console.log(`✓ public/llms.txt — ${lines.length} سطراً، ${total} سجلاً`);
