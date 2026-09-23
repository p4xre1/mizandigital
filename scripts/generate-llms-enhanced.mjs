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
  contentSlug,
  docSlug,
  eventSlug,
  lexiconSlug,
  newsSlug,
  articleSlug,
  schoolSlug,
} from "../shared/seo/url-policy.js";
import { fetchPublishedCmsContent } from "./lib/cms-content.mjs";

const readJson = async (name) => {
  try {
    return JSON.parse(await readFile(join(DATA, name), "utf8"));
  } catch {
    return [];
  }
};

const [articles, news, lexicon, schools, documents, events, faqGroups, quizQuestions] =
  await Promise.all([
    readJson("articles.json"),
    readJson("news.json"),
    readJson("lexicon.json"),
    readJson("schools.json"),
    readJson("docs.json"),
    readJson("events.json"),
    readJson("faq.json"),
    readJson("quiz-questions.json"),
  ]);

// محتوى الـ CMS المنشور: فشل الجلب غير قاتل (بناء معزول/بلا مفاتيح) —
// يُكتفى بالبيانات المحلية، كما في generate-sitemap.mjs.
const { ok: cmsOk, error: cmsError, articles: cmsArticles, news: cmsNews, pdfs: cmsPdfs, laws: cmsLaws } =
  await fetchPublishedCmsContent();

if (!cmsOk) {
  console.warn(`⚠️  llms-full: ${cmsError} — بلا محتوى CMS (laws/articles/news).`);
}

// ترتيب slugs مطابق لـ generate-sitemap.mjs (docs ثم pdfs ثم laws) حتى
// يطابق الروابط المنشورة في llms-full.txt صفحات /pdf/<slug> الفعلية.
const docTaken = new Set();
const docEntries = [
  ...documents.map((item) => ({ ...item, slug: docSlug(item, docTaken) })),
  ...cmsPdfs.map((item) => ({ ...item, slug: docSlug(item, docTaken) })),
];
const lawEntries = cmsLaws.map((item) => ({ ...item, slug: docSlug(item, docTaken) }));

// المقالات والمستجدات: local أولاً (الأول يفوز بالـ slug) ثم CMS —
// نفس ترتيب prerender وgenerate-sitemap.
const localArticleSlugs = new Set(articles.map((a) => articleSlug(a)));
const allArticles = [
  ...articles.map((a) => ({
    title: a.title,
    url: `/articles/${articleSlug(a)}`,
    excerpt: a.excerpt || "",
    date: a.publishedAt || null,
    content: Array.isArray(a.body) ? a.body.join("\n\n") : String(a.body || a.content || "").trim(),
  })),
  ...cmsArticles
    .filter((a) => !localArticleSlugs.has(contentSlug(a)))
    .map((a) => ({
      title: a.title,
      url: `/articles/${contentSlug(a)}`,
      excerpt: a.meta_description || a.excerpt || "",
      date: a.published_at || a.created_at || null,
      content: String(a.content || "").trim(),
    })),
];

const localNewsSlugs = new Set(news.map((n) => newsSlug(n)));
const allNews = [
  ...news.map((n) => ({
    title: n.title,
    url: `/news/${newsSlug(n)}`,
    excerpt: n.summary || "",
    date: n.date || null,
    source: n.source || n.author || null,
    content: String(n.content || "").trim(),
  })),
  ...cmsNews
    .filter((n) => !localNewsSlugs.has(contentSlug(n)))
    .map((n) => ({
      title: n.title,
      url: `/news/${contentSlug(n)}`,
      excerpt: n.summary || "",
      date: n.published_at || n.created_at || null,
      source: n.source || null,
      content: String(n.content || "").trim(),
    })),
];

const clamp = (value, max = 200) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
};

const link = (title, path, description) =>
  description ? `- [${title}](${DOMAIN}${path}): ${clamp(description)}` : `- [${title}](${DOMAIN}${path})`;

const counts = {
  articles: allArticles.length,
  news: allNews.length,
  lexicon: lexicon.length,
  schools: schools.length,
  documents: docEntries.length,
  events: events.length,
  laws: lawEntries.length,
  faq: Array.isArray(faqGroups) ? faqGroups.reduce((acc, g) => acc + (g.items?.length || 0), 0) : 0,
  quiz: Array.isArray(quizQuestions) ? quizQuestions.length : 0,
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
  `المحتوى باللغة العربية (ar-MA). يضم ${total} سجلاً: ${counts.articles} مقالاً، ${counts.news} خبراً، ${counts.lexicon} مصطلحاً قانونياً، ${counts.schools} كلية، ${counts.documents} مستنداً، ${counts.laws} نصاً قانونياً، ${counts.events} فعالية، ${counts.faq} سؤالاً شائعاً، ${counts.quiz} سؤال اختبار.`
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
lines.push(link("المسارات والمهن القانونية", "/careers", "دليل تعليمي لـ 14 مهنة قانونية في المغرب: الشهادات وطريقة الولوج والتحقق من المصادر — بلا إعلانات توظيف"));
lines.push(link("اختبارات المسارات المهنية", "/quiz/careers", "تدريبات تعليمية على مفاهيم المهن القانونية، مع شرح لكل سؤال وربط بمصطلحات القاموس"));
lines.push(link("دليل الموقع للذكاء الاصطناعي", "/llms.txt", "هذا الملف — وصف كامل للموقع لوكلاء AI"));
lines.push(link("خريطة الموقع", "/sitemap.xml", "كل الروابط القابلة للفهرسة (320 route)"));
lines.push("");

// الفهرس الأوسط: كل المقالات/المستجدات (local + CMS) بمقتطف قصير —
// والنصوص الكاملة نفسها في قسم «المحتوى الكامل» أدناه.
lines.push(`## المقالات (AEO: إجابات مفصلة) — ${allArticles.length}`);
lines.push("");
for (const article of allArticles) {
  lines.push(link(article.title, article.url, article.excerpt));
}
lines.push("");

lines.push(`## المستجدات التشريعية والقضائية — ${allNews.length}`);
lines.push("");
for (const item of allNews) {
  lines.push(link(item.title, item.url, item.excerpt));
}
lines.push("");

if (lawEntries.length > 0) {
  lines.push(`## النصوص القانونية (${lawEntries.length})`);
  lines.push("");
  lines.push(
    "نصوص تشريعية مغربية: رقم القانون، الجريدة الرسمية، تاريخ الصدور، والموجز. النص الكامل لكل قانون في صفحته تحت /pdf/ وسفله في هذا الملف."
  );
  lines.push("");
  for (const law of lawEntries) {
    const meta = [
      law.law_number ? `رقم ${law.law_number}` : "",
      law.official_gazette_number ? `ج.ر ${law.official_gazette_number}` : "",
      law.publication_date ? String(law.publication_date).slice(0, 10) : "",
    ]
      .filter(Boolean)
      .join("، ");
    lines.push(link(law.title, `/pdf/${law.slug}`, meta || law.description || "نص قانوني مغربي"));
  }
  lines.push("");
}

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

// FAQ كاملة — كل المجموعات وكل الأسئلة بأجوبتها غير المقطوعة (AEO)
if (faqGroups && faqGroups.length > 0) {
  lines.push(`## الأسئلة الشائعة (FAQ — AEO) — كاملة (${counts.faq})`);
  lines.push("");
  for (const group of faqGroups) {
    lines.push(`### ${group.title || group.category}`);
    for (const item of group.items || []) {
      lines.push(`**س: ${item.question}**`);
      lines.push(`ج: ${item.answer}`);
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
lines.push("- [AI Reference](https://www.mizan.page/reference/index.json): كل البيانات مهيكّلة (JSON + Markdown) — 9 مجموعات برابط قانوني لكل سجل؛ ابدأ من index.json");
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
// هذه النسخة = التصدير الكامل: كل نص في كل مجموعة بيانات، بلا تقطيع —
// (البيانات المهيكّلة الكاملة مقابلها في public/reference/*.json).
const fullLines = [...lines];
fullLines.push(`## المحتوى الكامل — كل مجموعات البيانات (تصدير النسخة الكاملة)`);
fullLines.push("");
fullLines.push(
  "أقسام هذا الملف تحمل النصوص كاملةً دون تقطيع. للبيانات المهيكّلة كاملة (كل الحقول): /reference/<name>.json لكل مجموعة: articles, news, lexicon, schools, events, docs, laws, faq, quiz."
);
fullLines.push("");

fullLines.push(`## كل المعجم القانوني (${lexicon.length}) — التعريفات كاملة`);
fullLines.push("");
for (const term of lexiconSlugs) {
  fullLines.push(`### ${term.term_ar}${term.term_fr ? ` — ${term.term_fr}` : ""}`);
  fullLines.push(`${DOMAIN}/lexicon/${term.slug}`);
  if (term.definition) fullLines.push(term.definition);
  if (term.simple_explanation) fullLines.push(`ببساطة: ${term.simple_explanation}`);
  fullLines.push("");
}

fullLines.push(`## كل المقالات (${allArticles.length}) — النصوص الكاملة`);
fullLines.push("");
for (const article of allArticles) {
  fullLines.push(`### ${article.title}`);
  fullLines.push(`${DOMAIN}${article.url}${article.date ? ` — ${String(article.date).slice(0, 10)}` : ""}`);
  fullLines.push(article.content);
  fullLines.push("");
}

fullLines.push(`## كل المستجدات (${allNews.length}) — النصوص الكاملة`);
fullLines.push("");
for (const item of allNews) {
  fullLines.push(`### ${item.title}`);
  fullLines.push(
    `${DOMAIN}${item.url}${item.date ? ` — ${String(item.date).slice(0, 10)}` : ""}${item.source ? ` — ${item.source}` : ""}`
  );
  fullLines.push(item.content);
  fullLines.push("");
}

if (lawEntries.length > 0) {
  fullLines.push(`## كل النصوص القانونية — النصوص الكاملة (${lawEntries.length})`);
  fullLines.push("");
  fullLines.push(
    "النص الكامل كما هو في قاعدة بيانات المنصة (نص صافٍ). المحتوى تعليمي وبحثي، والصياغة الرسمية النافذة تُتحقق منها عبر الجريدة الرسمية (sgg.gov.ma)."
  );
  fullLines.push("");
  for (const law of lawEntries) {
    fullLines.push(`### ${law.title}`);
    fullLines.push(`${DOMAIN}/pdf/${law.slug}`);
    const meta = [
      law.law_number ? `رقم ${law.law_number}` : "",
      law.official_gazette_number ? `ج.ر ${law.official_gazette_number}` : "",
      law.publication_date ? `تاريخ الصدور: ${String(law.publication_date).slice(0, 10)}` : "",
    ]
      .filter(Boolean)
      .join(" — ");
    if (meta) fullLines.push(meta);
    if (law.description) fullLines.push(`الموجز: ${law.description}`);
    const body = String(law.content || "").trim();
    if (body) {
      // 12000 حرف يكفي للنص التعليمي الطويل ويمنع تضخم الملف بلا فائدة
      fullLines.push(body.length > 12000 ? `${body.slice(0, 12000)}… (المتابعة في الصفحة)` : body);
    }
    fullLines.push("");
  }
}

fullLines.push(`## كل كليات الحقوق (${schools.length}) — التفاصيل`);
fullLines.push("");
for (const school of schools) {
  fullLines.push(`### ${school.name}`);
  fullLines.push(`${DOMAIN}/schools/${schoolSlug(school)}`);
  fullLines.push([school.university, school.city].filter(Boolean).join(" — "));
  if (school.studyAreas?.length) fullLines.push(`التخصصات: ${school.studyAreas.join("، ")}`);
  if (school.synopsis) fullLines.push(school.synopsis);
  if (school.officialUrl) fullLines.push(`الموقع الرسمي: ${school.officialUrl}`);
  fullLines.push("");
}

fullLines.push(`## كل الفعاليات (${events.length})`);
fullLines.push("");
for (const event of events) {
  fullLines.push(`### ${event.title}`);
  fullLines.push(`${DOMAIN}/events/${eventSlug(event)}`);
  fullLines.push([event.organizer, event.venue || event.city].filter(Boolean).join(" — "));
  if (event.eventDate) fullLines.push(`التاريخ: ${event.eventDate} ${event.time || ""}`.trim());
  if (event.topics?.length) fullLines.push(`المواضيع: ${event.topics.join("، ")}`);
  if (event.excerpt) fullLines.push(event.excerpt);
  fullLines.push("");
}

fullLines.push(`## كل الأرشيف الدراسي (${docEntries.length}) — الملفات والملخصات`);
fullLines.push("");
for (const doc of docEntries) {
  const context = [
    doc.semester ? `الفصل ${String(doc.semester).toUpperCase()}` : "",
    doc.module || "",
    doc.professor ? `الأستاذ(ة): ${doc.professor}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
  fullLines.push(
    `- **${doc.title}**${context ? ` — ${context}` : ""}: ${DOMAIN}/pdf/${doc.slug}` +
      (doc.description ? ` — ${clamp(doc.description, 200)}` : "")
  );
}
fullLines.push("");

fullLines.push(`## كل أسئلة الاختبارات (${quizQuestions.length}) — كاملة`);
fullLines.push("");
fullLines.push(
  "أربعة مسارات: university (S1-S6 حسب المادة)، general، concours، interview. الإجابة مخزنة ترقيماً فاستُبدلت هنا بنص الخيار. النسخة المهيكّلة كاملة: /reference/quiz.json."
);
fullLines.push("");
for (const q of quizQuestions) {
  const context = [
    q.tier === "university" ? [q.semester, q.module].filter(Boolean).join(" — ") : q.tier,
    q.difficulty,
  ]
    .filter(Boolean)
    .join(" — ");
  fullLines.push(`- **${context}**: ${q.question}`);
  for (const [i, opt] of (q.options || []).entries()) {
    fullLines.push(`  - ${"أبجدهو".charAt(i) || i + 1}) ${opt}`);
  }
  if (q.answer != null) {
    const answerText = typeof q.answer === "number" && q.options?.[q.answer] ? q.options[q.answer] : q.answer;
    fullLines.push(`  - **الإجابة:** ${answerText}`);
  }
  if (q.explanation) fullLines.push(`  - **التفسير:** ${q.explanation}`);
}
fullLines.push("");

await writeFile(OUTPUT_FULL, `${fullLines.join("\n")}\n`, "utf8");
console.log(`✓ public/llms-full.txt — ${fullLines.length} سطراً، ${total} سجلاً (${cmsOk ? "" : "بلا CMS "})`);
