// Enhanced llms generator — AI crawl + AEO optimized
//
// يكتب public/llms-full.txt فقط. النسخة المختصرة public/llms.txt يملكها
// scripts/generate-llms.mjs (وهو ما يشغّله prebuild): الملفان زوجٌ واحد
// والنسخة الكاملة تبدأ من مخرجات المختصرة، فكتابة الاثنين من هنا كانت تجعل
// llms.txt يتغيّر بحسب آخر سكربت شغّله المطوّر — أي مصدرَان للحقيقة لملف
// واحد يُقرأ وقت البناء. الشغّل `pnpm seo:llms` ليُحدَّث الملفان معاً.
//
// يُولَّد أيضاً مقطع ai.txt من نفس القائمة (لا ملف منفصل في المستودع).

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "../src/data");
const OUTPUT_FULL = join(__dirname, "../public/llms-full.txt");
import {
  SITE_ORIGIN as DOMAIN,
  canonicalHome,
  lexiconSlug,
  newsSlug,
  articleSlug,
  schoolSlug,
} from "../shared/seo/url-policy.js";

const readJson = async (name) => {
  try {
    return JSON.parse(await readFile(join(DATA, name), "utf8"));
  } catch {
    return [];
  }
};

const [articles, news, lexicon, schools, documents, events, faqGroups] = await Promise.all([
  readJson("articles.json"),
  readJson("news.json"),
  readJson("lexicon.json"),
  readJson("schools.json"),
  readJson("docs.json"),
  readJson("events.json"),
  readJson("faq.json"),
]);

const clamp = (value, max = 200) => {
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
  faq: Array.isArray(faqGroups) ? faqGroups.reduce((acc, g) => acc + (g.items?.length || 0), 0) : 0,
};
const total = Object.values(counts).reduce((a, b) => a + b, 0);

// نفس دالة سياسة الروابط المستعملة في الواجهة وفي prerender: المعرّف
// العربي أولاً، وعند التكرار يُلحق به معرّف السجل (لا «-x» ولا المقابل
// الفرنسي) — وإلا نُشر في llms-full.txt رابط لا ملف تحته.
const usedSlugs = new Set();
const lexiconSlugs = lexicon.map((term) => ({
  ...term,
  slug: lexiconSlug(term, usedSlugs),
}));

// === MAIN LLMS.TXT ===
const lines = [];

lines.push("# ميزان الرقمية (Mizan Digital)");
lines.push("");
lines.push(
  "> منصة مغربية مجانية للمعرفة القانونية والأكاديمية، موجّهة لطلبة كليات الحقوق والباحثين: ملخصات ودروس، معجم قانوني عربي-فرنسي، مستجدات تشريعية وقضائية، دليل كليات الحقوق، وأرشيف ملفات PDF."
);
lines.push("");
lines.push(
  `المحتوى باللغة العربية (ar-MA). يضم ${total} سجلاً: ${counts.articles} مقالاً، ${counts.news} خبراً، ${counts.lexicon} مصطلحاً قانونياً، ${counts.schools} كلية، ${counts.documents} مستنداً، ${counts.events} فعالية، ${counts.faq} سؤالاً شائعاً.`
);
lines.push("");
lines.push(
  "تنبيه مهم: المنصة تعليمية وبحثية وليست مصدراً رسمياً للتشريع ولا تقدّم استشارة قانونية. عند الاستشهاد بنص قانوني يجب التحقق من النص النافذ عبر المصادر الرسمية أدناه."
);
lines.push("");

// AEO: Direct answers for AI
lines.push("## إجابات مباشرة (AEO)");
lines.push("");
lines.push("**ما هي ميزان الرقمية؟** منصة مغربية مجانية للمعرفة القانونية لطلبة كليات الحقوق بالمغرب، تضم ملخصات، مقالات، أخبار تشريعية، قاموس قانوني (250 مصطلح)، دليل كليات (21 كلية)، واختبارات قانونية (4 مسارات).");
lines.push("");
lines.push("**هل المحتوى رسمي؟** لا، المحتوى تعليمي وبحثي فقط. للنصوص الرسمية راجع adala.justice.gov.ma و sgg.gov.ma.");
lines.push("");
lines.push("**ما هي الفصول المتاحة؟** S1 إلى S6 — كل فصل يضم ملخصات ومحاضرات وملفات PDF حسب المادة والأستاذ.");
lines.push("");
lines.push("**ما هي الاختبارات؟** 4 مسارات: الكلية (S1-S6 حسب المادة)، العشوائي العام، المباريات المهنية (الأمن، القضاء، الوظيفة العمومية)، المقابلات المهنية.");
lines.push("");
lines.push("**كيف أبحث؟** استعمل /search أو /archive مع فلترة حسب الفصل والمادة.");
lines.push("");

lines.push("## الأقسام الرئيسية");
lines.push("");
lines.push(link("المقالات", "/articles", "شروحات ومنهجيات قانونية لطلبة الحقوق"));
lines.push(link("المستجدات", "/news", "أخبار تشريعية وقضائية مغربية"));
lines.push(link("المعجم القانوني", "/lexicon", "مصطلحات قانونية عربية-فرنسية مع تعريفاتها"));
lines.push(link("كليات الحقوق", "/schools", "دليل كليات الحقوق بالمغرب ومعلومات التسجيل"));
lines.push(link("الأرشيف والملفات", "/archive", "ملخصات ومحاضرات وملفات PDF حسب الفصل S1-S6"));
lines.push(link("الندوات والفعاليات", "/events", "فعاليات أكاديمية وقانونية"));
lines.push(link("الأسئلة الشائعة", "/faq", "أسئلة متكررة حول الدراسة القانونية والمنصة"));
lines.push(link("الاختبارات القانونية", "/quiz", "أربعة مسارات: الكلية (S1-S6)، العشوائي، المباريات المهنية، المقابلات"));
lines.push(link("دليل الموقع للذكاء الاصطناعي", "/llms.txt", "هذا الملف — وصف كامل للموقع لوكلاء AI"));
lines.push(link("خريطة الموقع", "/sitemap.xml", "كل الروابط القابلة للفهرسة (320 route)"));
lines.push("");

lines.push("## المقالات (AEO: إجابات مفصلة)");
lines.push("");
for (const article of articles) {
  lines.push(link(article.title, `/articles/${articleSlug(article)}`, article.excerpt));
}
lines.push("");

lines.push("## المستجدات التشريعية والقضائية");
lines.push("");
for (const item of news) {
  const slug = newsSlug(item);
  lines.push(link(item.title, `/news/${slug}`, item.summary));
}
lines.push("");

lines.push("## كليات الحقوق (21 كلية)");
lines.push("");
for (const school of schools) {
  lines.push(link(school.name, `/schools/${schoolSlug(school)}`, `${school.university} — ${school.city}`));
}
lines.push("");

lines.push("## المعجم القانوني (250 مصطلح)");
lines.push("");
lines.push(`<!-- المعجم كامل يضم ${lexicon.length} مصطلحاً على /lexicon -->`);
for (const term of lexiconSlugs.slice(0, 60)) {
  lines.push(link(term.term_ar, `/lexicon/${term.slug}`, term.definition));
}
lines.push(`- [عرض كل المصطلحات الـ ${lexicon.length}](https://www.mizan.page/lexicon)`);
lines.push("");

lines.push("## الفصول الدراسية S1-S6");
lines.push("");
for (const semester of ["s1", "s2", "s3", "s4", "s5", "s6"]) {
  lines.push(link(`الفصل ${semester.toUpperCase()}`, `/${semester}`, "ملخصات ومحاضرات هذا الفصل حسب المادة والأستاذ"));
}
lines.push("");

lines.push("## الاختبارات القانونية (4 مسارات)");
lines.push("");
lines.push(link("الاختبار الجامعي", "/quiz/university", "حسب الفصل S1-S6 والمادة: مدني، جنائي، إداري، دستوري، مساطر، شغل، أسرة"));
lines.push(link("الاختبار العشوائي", "/quiz/general", "ثقافة قانونية عامة + نقاط خبرة XP + رتب من D حتى SSS"));
lines.push(link("اختبارات المباريات", "/quiz/concours", "الأمن الوطني، القضاء، الوظيفة العمومية، القوات المساعدة، الجمارك"));
lines.push(link("اختبارات المقابلات", "/quiz/interview", "مقابلات التدريب والعمل القانوني وأخلاقيات المهنة"));
lines.push("");

if (faqGroups && faqGroups.length > 0) {
  lines.push("## الأسئلة الشائعة (FAQ — AEO)");
  lines.push("");
  for (const group of faqGroups.slice(0, 5)) {
    lines.push(`### ${group.title || group.category}`);
    for (const item of (group.items || []).slice(0, 5)) {
      lines.push(`**س: ${item.question}**`);
      lines.push(`ج: ${clamp(item.answer, 300)}`);
      lines.push("");
    }
  }
}

lines.push("## صفحات قانونية ومعلوماتية");
lines.push("");
lines.push(link("من نحن", "/about", "تعريف بالمنصة وفريقها ومنهجها"));
lines.push(link("الشروط وإخلاء المسؤولية", "/terms", "حدود استعمال المحتوى — ليس استشارة قانونية"));
lines.push(link("سياسة الخصوصية", "/privacy", "معالجة البيانات الشخصية"));
lines.push(link("سياسة ملفات الارتباط", "/cookies", ""));
lines.push(link("تواصل معنا", "/contact", "contact@mizan.page"));
lines.push(link("الدعم والكريدتس", "/pricing", "Mizan Pro شهري 49 د.م / سنوي 399 د.م + باقات كريدتس"));
lines.push("");

lines.push("## مصادر رسمية للتحقق (مهم للـ AI)");
lines.push("");
lines.push("- [بوابة عدالة](https://adala.justice.gov.ma/): النصوص القانونية المغربية النافذة — المصدر الرسمي");
lines.push("- [الأمانة العامة للحكومة](https://www.sgg.gov.ma/): الجريدة الرسمية والمشاريع");
lines.push("- [الجريدة الرسمية](https://www.sgg.gov.ma/arabe/JournalOfficiel.aspx): النصوص المنشورة");
lines.push("- [وزارة التعليم العالي](https://www.enssup.gov.ma/): التعليم العالي والبحث العلمي");
lines.push("- [المحكمة الدستورية](https://www.cour-constitutionnelle.ma/): قرارات الدستورية");
lines.push("");

lines.push("## واجهات آلية للذكاء الاصطناعي");
lines.push("");
lines.push("- [llms.txt](https://www.mizan.page/llms.txt): هذا الملف — وصف كامل للموقع (26KB)");
lines.push("- [llms-full.txt](https://www.mizan.page/llms-full.txt): نسخة موسعة بكل المحتوى (لـ ChatGPT/Claude)");
lines.push("- [ai.txt](https://www.mizan.page/ai.txt): دليل مبسط لوكلاء AI");
lines.push("- [MCP endpoint](https://www.mizan.page/mcp): Model Context Protocol — أدوات قراءة عامة");
lines.push("- [AI catalog](https://www.mizan.page/.well-known/ai-catalog.json): فهرس المحتوى للوكلاء");
lines.push("- [Agent card](https://www.mizan.page/.well-known/agent-card.json): بطاقة اكتشاف الوكيل (A2A)");
lines.push("- [AI Plugin](https://www.mizan.page/.well-known/ai-plugin.json): ChatGPT plugin manifest");
lines.push("- [OpenAPI](https://www.mizan.page/.well-known/openapi.json): API spec للوكلاء");
lines.push("- [خريطة الموقع](https://www.mizan.page/sitemap.xml): كل الروابط القابلة للفهرسة (320 route)");
lines.push("- [RSS](https://www.mizan.page/feed.xml): تغذية المستجدات");
lines.push("- [Sitemap Index](https://www.mizan.page/sitemap-index.xml): فهرس خرائط الموقع");
lines.push("");

lines.push("## Optional");
lines.push("");
lines.push("- [البحث](https://www.mizan.page/search): بحث داخلي في كل المحتوى");
lines.push("- [تسجيل الدخول](https://www.mizan.page/login): للوصول إلى لوحة التحرير (غير مطلوب للقراءة)");
lines.push("- [المحفوظات](https://www.mizan.page/saved): المحتوى المحفوظ (localStorage)");
lines.push("");

// === FULL VERSION ===
// لا تُكتب النسخة المختصرة هنا (انظر رأس الملف): تبقى ملك generate-llms.mjs.
const fullLines = [...lines];
fullLines.push("\n## كل المصطلحات القانونية (250)");
fullLines.push("");
for (const term of lexiconSlugs) {
  fullLines.push(link(term.term_ar, `/lexicon/${term.slug}`, term.definition));
}
fullLines.push("");
fullLines.push("## كل المقالات");
fullLines.push("");
for (const article of articles) {
  fullLines.push(`### ${article.title}`);
  fullLines.push(`${DOMAIN}/articles/${articleSlug(article)}`);
  fullLines.push(clamp(article.content || article.excerpt, 500));
  fullLines.push("");
}

await writeFile(OUTPUT_FULL, `${fullLines.join("\n")}\n`, "utf8");
console.log(`✓ public/llms-full.txt — ${fullLines.length} سطراً`);
