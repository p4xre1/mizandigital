// scripts/lib/llms-content.mjs
//
// يبني نص /llms.txt وفق مواصفة llmstxt.org.
//
// معزول هنا (بدل أن يبقى قالباً داخل prerender.mjs) لسببين:
//   1) يمكن اختباره مباشرة في tests/lighthouse-fixes.test.ts دون بناء dist.
//   2) يوثّق المتطلبات التي يفرضها تدقيق llms-txt في Lighthouse:
//      عنوان H1 واحد + اقتباس وصفي + روابط Markdown فعلية [نص](رابط).
//      النسخة السابقة كانت «شبه YAML» بلا أي رابط، فسقط التدقيق برسالة
//      «يبدو أنّ الملف لا يحتوي على أي روابط».

const mdLink = (label, url, description) =>
  description ? `- [${label}](${url}): ${description}` : `- [${label}](${url})`;

/**
 * @param {object} input
 * @param {string} input.domain        النطاق القانوني بدون "/" نهائي
 * @param {string} input.generatedAt   طابع زمني ISO
 * @param {{articles:number,news:number,events:number,schools:number,lexicon:number,documents:number,faq:number,quiz:number}} input.statistics
 * @param {number} input.totalContent
 * @param {string[]} input.legalDomains
 * @param {string[]} input.articleCategories
 * @param {string[]} input.faqTopics
 * @param {string[]} input.schoolCities
 * @returns {string} ملف llms.txt بصيغة Markdown
 */
export function buildLlmsTxt({
  domain,
  generatedAt,
  statistics,
  totalContent,
  legalDomains,
  articleCategories,
  faqTopics,
  schoolCities,
}) {
  const DOMAIN = domain;
  const NOW = generatedAt;
  return `# ميزان الرقمية (Mizan Digital)

> منصة مغربية تعليمية مجانية للمعرفة القانونية والأكاديمية، تقدّم مقالات قانونية، مستجدات تشريعية وقضائية، معجماً قانونياً ثنائي اللغة (عربي/فرنسي)، أرشيفاً دراسياً مصنفاً حسب الفصول من S1 إلى S6، دليلاً وطنياً لكليات الحقوق، وفعاليات أكاديمية. لا تتطلب المنصة إنشاء حساب للاستخدام الأساسي.

${mdLink("الموقع", `${DOMAIN}`, "الصفحة الرئيسية ونظرة عامة على المنصة")}
- **اللغة الأساسية:** العربية (ar-MA)، مع مصطلحات قانونية بالفرنسية فقط دون ترجمة كاملة للمحتوى
- **الجمهور:** طلبة كليات الحقوق بالمغرب، الباحثون القانونيون، والمهتمون بالقانون المغربي
- **تاريخ توليد هذه النسخة:** ${NOW}

## ابدأ من هنا

${mdLink("الصفحة الرئيسية", `${DOMAIN}`, "أحدث المقالات والمستجدات والمصطلحات")}
${mdLink("المقالات القانونية", `${DOMAIN}/articles`, `${statistics.articles} مقالات تحليلية ومنهجية`)}
${mdLink("المستجدات التشريعية والقضائية", `${DOMAIN}/news`, `${statistics.news} خبراً عن القانون المغربي`)}
${mdLink("المعجم القانوني", `${DOMAIN}/lexicon`, `${statistics.lexicon} مصطلحاً عربي-فرنسي مع تعريفاتها`)}
${mdLink("الأرشيف الدراسي", `${DOMAIN}/archive`, `${statistics.documents} مستندات وملخصات وملفات PDF حسب الفصل`)}
${mdLink("الفعاليات والندوات", `${DOMAIN}/events`, `${statistics.events} فعاليات أكاديمية وقانونية`)}
${mdLink("دليل كليات الحقوق", `${DOMAIN}/schools`, `${statistics.schools} كلية ومؤسسة جامعية`)}
${mdLink("من نحن", `${DOMAIN}/about`, "تعريف بالمنصة وفريقها ومنهجها في نشر المحتوى")}
${mdLink("تواصل معنا", `${DOMAIN}/contact`, "contact@mizan.page")}
${mdLink("الأسئلة الشائعة", `${DOMAIN}/faq`, "أسئلة متكررة حول الدراسة القانونية والمنصة")}

## الأرشيف حسب الفصل الدراسي

${["s1", "s2", "s3", "s4", "s5", "s6"]
  .map((semester) => mdLink(`الفصل ${semester.toUpperCase()}`, `${DOMAIN}/${semester}`, "ملخصات ومحاضرات وملفات هذا الفصل"))
  .join("\n")}

## حجم المحتوى المفهرس

- مصطلحات المعجم القانوني: ${statistics.lexicon}
- المقالات: ${statistics.articles}
- المستجدات: ${statistics.news}
- الفعاليات والندوات: ${statistics.events}
- كليات الحقوق: ${statistics.schools}
- المستندات الدراسية: ${statistics.documents}
- الأسئلة الشائعة: ${statistics.faq}
- أسئلة الاختبارات: ${statistics.quiz}
- **إجمالي السجلات: ${totalContent}**

- **النسخة الكاملة بكل النصوص:** [llms-full.txt](${DOMAIN}/llms-full.txt) — المقالات والقوانين والمصطلحات والكليات والأسئلة كاملة
- **البيانات المهيكّلة كاملة:** [reference/index.json](${DOMAIN}/reference/index.json) — كل مجموعة JSON + Markdown

## المجالات القانونية المغطاة

${legalDomains.map((domain) => `- ${domain}`).join("\n")}

## تصنيفات المقالات

${articleCategories.map((category) => `- ${category}`).join("\n")}

## مواضيع الأسئلة الشائعة

${faqTopics.map((topic) => `- ${topic}`).join("\n")}

## التغطية الجغرافية لكليات الحقوق

- عدد الكليات المفهرسة: ${statistics.schools}
- المدن المغطاة: ${schoolCities.join("، ")}
${mdLink("الدليل الكامل للكليات", `${DOMAIN}/schools`, "بطاقات تعريفية وروابط المواقع الرسمية")}

## ملاحظات قانونية مهمة

- المحتوى تعليمي وبحثي ولا يحل محل النص القانوني الرسمي أو الاستشارة القانونية المتخصصة.
- عند الاستشهاد القانوني، تحقّق دائماً من الصياغة النافذة في الجريدة الرسمية أو المصادر الرسمية أدناه.
- المحتوى محدَّث بشكل دوري؛ استعمل «تاريخ توليد هذه النسخة» أعلاه للتأكد من حداثة النسخة المفهرسة.

## مصادر رسمية للتحقق

${mdLink("بوابة عدالة", "https://adala.justice.gov.ma/", "النصوص القانونية المغربية النافذة")}
${mdLink("الأمانة العامة للحكومة", "https://www.sgg.gov.ma/", "الجريدة الرسمية ومشاريع القوانين")}
${mdLink("الجريدة الرسمية", "https://www.sgg.gov.ma/arabe/JournalOfficiel.aspx", "النصوص المنشورة")}
${mdLink("وزارة التعليم العالي", "https://www.enssup.gov.ma/", "التعليم العالي والبحث العلمي")}

## الخرائط والتغذيات

${mdLink("خريطة الموقع", `${DOMAIN}/sitemap.xml`, "كل الروابط القابلة للفهرسة")}
${mdLink("تغذية RSS", `${DOMAIN}/feed.xml`, "آخر المستجدات")}
${mdLink("النسخة الموسعة llms-full.txt", `${DOMAIN}/llms-full.txt`, "المحتوى كاملاً للنماذج اللغوية")}
${mdLink("طبقة المرجعيات (JSON/Markdown)", `${DOMAIN}/reference/index.json`, "كل بيانات الموقع مهيكّلة: 9 مجموعات، رابط قانوني لكل سجل")}

## اكتشاف الوكيل (Agent discovery)

${mdLink("Agent card", `${DOMAIN}/.well-known/agent-card.json`, "بطاقة اكتشاف الوكيل (A2A)")}
${mdLink("Agent skills", `${DOMAIN}/.well-known/agent-skills/index.json`, "فهرس مهارات الوكيل")}
${mdLink("AI catalog", `${DOMAIN}/.well-known/ai-catalog.json`, "فهرس المحتوى الموجّه للوكلاء")}
${mdLink("MCP server card", `${DOMAIN}/.well-known/mcp/server-card.json`, "بطاقة خادم Model Context Protocol")}
${mdLink("MCP endpoint", `${DOMAIN}/mcp`, "أدوات قراءة عامة عبر Model Context Protocol")}

## تلميحات الزحف

- النطاق القانوني الموحّد: ${DOMAIN}
- الروابط القانونية المفضلة بدون "/" نهائي (عدا الصفحة الرئيسية).
- صفحات المصطلحات والمقالات والكليات مُهيّأة للعرض المسبق (prerendered) وتحتوي بيانات منظَّمة (JSON-LD).
- يُفضَّل الاستشهاد بروابط المصطلحات الفردية (${DOMAIN}/lexicon/{slug}) بدل الصفحة العامة عند نقل تعريف محدد.
${mdLink("نسخة Markdown من هذه الصفحة", `${DOMAIN}/index.md`, "بديل نصي خالص للصفحة الرئيسية")}

## Optional

${mdLink("البحث", `${DOMAIN}/search`, "بحث داخلي في كل المحتوى")}
${mdLink("مركز الاختبارات", `${DOMAIN}/quiz`, "اختبارات QCM: الكلية (S1-S6)، العشوائي، المباريات، المقابلات")}
${mdLink("الأسعار", `${DOMAIN}/pricing`, "خطط ميزان برو الاختيارية لدعم المنصة")}
${mdLink("الشروط وإخلاء المسؤولية", `${DOMAIN}/terms`, "حدود استعمال المحتوى")}
${mdLink("سياسة الخصوصية", `${DOMAIN}/privacy`, "معالجة البيانات الشخصية")}
${mdLink("تسجيل الدخول", `${DOMAIN}/login`, "للوصول إلى لوحة التحرير — غير مطلوب للقراءة")}
`;
}
