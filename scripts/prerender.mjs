import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "../dist");
const DATA = join(__dirname, "../src/data");
const DOMAIN = "https://www.mizan.page";
const SITE = "ميزان الرقمية";
const GITHUB = "https://github.com/p4xre1/mizandigital";
const REVIEWED = "2026-08-31";

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));
const [articles, events, schools, lexicon, news] = await Promise.all([
  readJson("articles.json"), readJson("events.json"), readJson("schools.json"), readJson("lexicon.json"), readJson("news.json"),
]);

const slugify = (text = "") => String(text).trim().toLowerCase().normalize("NFKC")
  .replace(/[\u064B-\u065F\u0670]/g, "").replace(/[\s/\\_]+/g, "-")
  .replace(/[^\w\u0600-\u06FF-]+/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const jsonForHtml = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const dateOf = (x) => x.updatedAt || x.updated_at || x.publishedAt || x.published_at || x.date || REVIEWED;

const publisher = { "@type":"Organization", "@id":`${DOMAIN}/#organization`, name:SITE, url:DOMAIN, sameAs:[GITHUB] };
const author = { "@type":"Organization", "@id":`${DOMAIN}/#author`, name:"فريق ميزان الرقمية", url:`${DOMAIN}/about`, sameAs:[GITHUB] };
const graphSchema = (page, extra = {}) => ({ "@context":"https://schema.org", "@graph":[publisher, author, { "@type":"WebPage", "@id":`${DOMAIN}${page.path}#webpage`, url:`${DOMAIN}${page.path}`, name:page.title, description:page.description, inLanguage:"ar-MA", publisher:{"@id":publisher["@id"]}, author:{"@id":author["@id"]}, dateModified:page.dateModified || REVIEWED, ...extra }] });

const used = new Set();
const terms = lexicon.map((x) => {
  const base = slugify(x.term_ar) || String(x.id), fr = slugify(x.term_fr || "") || String(x.id);
  let slug = base;
  if (used.has(slug)) slug = `${base}-${fr}`;
  if (used.has(slug)) slug = `${base}-${x.id}`;
  used.add(slug);
  return { ...x, slug };
});

function termHtml(x) {
  const sources = (x.legal_sources || []).map((s) => `<section><h2>ما هي الإحالات التشريعية؟</h2><p>${esc(s.code_ar || s.code_short || "التشريع المغربي")}${s.code_fr ? ` — ${esc(s.code_fr)}` : ""}</p><ul>${(s.articles || []).map(a => `<li><strong>الفصل ${esc(a.number)}:</strong> ${esc(a.phrase)}</li>`).join("")}</ul></section>`).join("");
  return `<main dir="rtl"><article><h1>${esc(x.term_ar)}${x.term_fr ? ` (${esc(x.term_fr)})` : ""}</h1>${x.category ? `<p><strong>التصنيف:</strong> ${esc(x.category)}</p>` : ""}<h2>ما هو تعريف المصطلح القانوني؟</h2><p><strong>${esc(x.term_ar)}:</strong> ${esc(x.definition || "لا يتوفر تعريف منشور.")}</p>${sources}<p><strong>تنبيه:</strong> تحقق من النص الرسمي النافذ قبل الاعتماد الأكاديمي.</p><a href="/lexicon">العودة إلى القاموس</a></article></main>`;
}
function indexHtml() {
  const list = terms.map(x => `<li><a href="/lexicon/${esc(x.slug)}">${esc(x.term_ar)}${x.term_fr ? ` (${esc(x.term_fr)})` : ""}</a></li>`).join("");
  return `<main dir="rtl"><h1>القاموس القانوني</h1><p><strong>يضم القاموس ${terms.length} مصطلحاً قانونياً</strong> في البيانات المنشورة حالياً، بالعربية والفرنسية مع إحالات تشريعية عند توفرها.</p><h2>كيف أبحث عن مصطلح قانوني؟</h2><p>اختر المصطلح ثم راجع التعريف والإحالات، وتحقق من النص الرسمي قبل الاستشهاد.</p><ul>${list}</ul></main>`;
}

const pages = [];
const add = (path, title, description, body, schemaExtra = {}) => pages.push({ path, title, description, staticBody:body, schema:graphSchema({path,title,description}, schemaExtra) });

add("/", `${SITE} | المعرفة القانونية للطلبة`, `منصة مجانية تضم ${terms.length} مصطلحاً، ${articles.length} مقالة، ${news.length} خبراً، ${events.length} فعالية و${schools.length} مؤسسة في البيانات المنشورة.`, `<main dir="rtl"><h1>ميزان الرقمية — المعرفة القانونية للطلبة</h1><p><strong>ميزان الرقمية منصة أكاديمية مغربية مجانية</strong> تجمع المعرفة القانونية والأكاديمية لمساعدة طلبة كليات الحقوق والباحثين.</p><p>وفق البيانات المنشورة وقت التوليد: <strong>${terms.length} مصطلحاً</strong>، <strong>${articles.length} مقالة</strong>، <strong>${news.length} خبراً</strong>، <strong>${events.length} فعالية</strong> و<strong>${schools.length} مؤسسة تعليمية</strong>. آخر مراجعة: ${REVIEWED}.</p><h2>ما الذي توفره ميزان الرقمية؟</h2><ul><li><a href="/lexicon">القاموس القانوني</a>: مصطلحات عربية وفرنسية.</li><li><a href="/archive">الأرشيف الدراسي</a>: S1 إلى S6.</li><li><a href="/articles">المقالات</a>: محتوى قانوني ومنهجي.</li><li><a href="/news">الأخبار</a>: مستجدات قانونية وأكاديمية.</li><li><a href="/events">الندوات والفعاليات</a>.</li><li><a href="/schools">دليل كليات الحقوق</a>.</li></ul><h2>كيف أستخدم القاموس القانوني؟</h2><p><strong>ابدأ باختيار المصطلح ثم راجع التعريف والإحالات التشريعية.</strong> وللاستخدام الأكاديمي، تحقق من النص القانوني الرسمي النافذ.</p><h2>ما هي مصادر المعلومات القانونية؟</h2><p>المحتوى تعليمي وبحثي وليس بديلاً عن النص الرسمي.</p><ul><li><a href="https://adala.justice.gov.ma/">بوابة عدالة التابعة لوزارة العدل المغربية</a></li><li><a href="https://www.sgg.gov.ma/">الأمانة العامة للحكومة المغربية</a></li></ul><h2>الأسئلة الشائعة</h2><h3>ما هي ميزان الرقمية؟</h3><p>منصة أكاديمية مغربية مجانية للمعرفة القانونية.</p><h3>كم مصطلحاً يضم القاموس؟</h3><p>يضم حالياً ${terms.length} مصطلحاً في البيانات المنشورة.</p><h3>هل المحتوى بديل عن النص القانوني الرسمي؟</h3><p>لا، يجب الرجوع إلى المصدر الرسمي قبل الاعتماد على أي قاعدة قانونية.</p></main>`, { datePublished:"2026-07-21", dateModified:REVIEWED });

add("/archive", `الأرشيف الدراسي | ${SITE}`, "ملخصات ومحاضرات ونماذج امتحانات مصنفة حسب S1 إلى S6.", `<main dir="rtl"><h1>الأرشيف الدراسي</h1><p><strong>الأرشيف مقسم إلى ستة فصول جامعية: S1 وS2 وS3 وS4 وS5 وS6.</strong></p><h2>كيف أصل إلى الفصل المطلوب؟</h2><ul>${[1,2,3,4,5,6].map(n=>`<li><a href="/s${n}">الفصل ${n} (S${n})</a></li>`).join("")}</ul></main>`);
add("/news", `الأخبار القانونية والأكاديمية | ${SITE}`, `أخبار ومستجدات قانونية وأكاديمية. ${news.length} خبراً في البيانات الحالية.`, `<main dir="rtl"><h1>الأخبار القانونية والأكاديمية</h1><p><strong>عدد الأخبار في البيانات المنشورة حالياً: ${news.length}.</strong></p><h2>كيف أستفيد من الأخبار؟</h2><p>استخدمها لمتابعة المستجدات، ثم تحقق من المصدر الرسمي قبل اعتماد المعلومة.</p></main>`);
add("/articles", `المقالات القانونية والمنهجية | ${SITE}`, `مقالات قانونية ومنهجية. ${articles.length} مقالة في البيانات الحالية.`, `<main dir="rtl"><h1>المقالات القانونية والمنهجية</h1><p><strong>عدد المقالات في البيانات الحالية: ${articles.length}.</strong></p><h2>كيف أستخدم المقالات في البحث؟</h2><p>استخدمها لفهم الموضوع وبناء الأفكار، ثم تحقق من المراجع الأصلية.</p></main>`);
add("/events", `الندوات والفعاليات القانونية | ${SITE}`, `أرشيف للندوات والفعاليات. ${events.length} فعالية في البيانات الحالية.`, `<main dir="rtl"><h1>الندوات والفعاليات القانونية</h1><p><strong>عدد الفعاليات الحالية: ${events.length}.</strong></p><h2>لماذا تهم الندوات القانونية؟</h2><p>تساعد على متابعة النقاشات الأكاديمية وفهم التطبيقات العملية للقانون.</p></main>`);
add("/schools", `كليات الحقوق بالمغرب | ${SITE}`, `دليل كليات العلوم القانونية والاقتصادية والاجتماعية. ${schools.length} مؤسسة في البيانات الحالية.`, `<main dir="rtl"><h1>كليات الحقوق بالمغرب</h1><p><strong>عدد المؤسسات في البيانات الحالية: ${schools.length}.</strong></p><h2>كيف أتحقق من معلومات الكلية؟</h2><p>استخدم رابط المؤسسة الرسمي عند توفره، واعتمد الموقع الجامعي الرسمي للمعلومات المتغيرة.</p></main>`);
add("/lexicon", `القاموس القانوني | ${SITE}`, `قاموس قانوني عربي وفرنسي يضم ${terms.length} مصطلحاً.`, indexHtml());
add("/about", `حول ميزان الرقمية | ${SITE}`, "مهمة المنصة وفريقها.", `<main dir="rtl"><h1>حول ميزان الرقمية</h1><p><strong>ميزان الرقمية منصة أكاديمية مغربية مجانية</strong> تركز على المعرفة القانونية لطلبة الحقوق والباحثين.</p><h2>ما مهمة المنصة؟</h2><p>تنظيم المعرفة القانونية وتسهيل الوصول إلى المصطلحات والمواد الدراسية والأخبار والفعاليات ودليل الكليات.</p><h2>من يدير المنصة؟</h2><p>فريق ميزان الرقمية. راجع <a href="/contact">صفحة التواصل</a>.</p></main>`);
add("/contact", `تواصل معنا | ${SITE}`, "معلومات التواصل مع فريق ميزان الرقمية.", `<main dir="rtl"><h1>تواصل معنا</h1><p><strong>نرحب بالملاحظات وتصحيح المعلومات والاقتراحات.</strong></p><h2>ما نوع التصحيحات المفيدة؟</h2><p>يفضل دعم التصحيح بمصدر رسمي أو جامعي واضح.</p></main>`);
add("/faq", `الأسئلة الشائعة | ${SITE}`, "إجابات مباشرة عن المنصة والقاموس والأرشيف.", `<main dir="rtl"><h1>الأسئلة الشائعة</h1><h2>ما هي ميزان الرقمية؟</h2><p>منصة أكاديمية مغربية مجانية.</p><h2>كم مصطلحاً يضم القاموس؟</h2><p>${terms.length} مصطلحاً في البيانات الحالية.</p><h2>ما الفصول التي يغطيها الأرشيف؟</h2><p>S1 إلى S6.</p><h2>هل المحتوى بديل عن النص القانوني؟</h2><p>لا، تحقق من النص الرسمي النافذ.</p></main>`);
add("/privacy", `سياسة الخصوصية | ${SITE}`, "سياسة الخصوصية الخاصة بميزان الرقمية.", `<main dir="rtl"><h1>سياسة الخصوصية</h1><p>توضح هذه الصفحة مبادئ التعامل مع البيانات عند استخدام الموقع. تقتصر البيانات على ما يلزم لتشغيل الخدمات وتحسينها وفق الإعدادات والقوانين المعمول بها.</p></main>`);
add("/terms", `شروط الاستخدام | ${SITE}`, "شروط استخدام محتوى وخدمات ميزان الرقمية.", `<main dir="rtl"><h1>شروط الاستخدام</h1><p>المحتوى تعليمي وبحثي. احترام حقوق أصحاب المصادر والمواد شرط لاستخدام المحتوى.</p><h2>هل يقدم الموقع استشارة قانونية؟</h2><p>لا. المعلومات التعليمية لا تشكل استشارة قانونية.</p></main>`);
add("/cookies", `سياسة ملفات الارتباط | ${SITE}`, "معلومات حول ملفات الارتباط وتقنيات التخزين.", `<main dir="rtl"><h1>سياسة ملفات الارتباط</h1><p>قد يستخدم الموقع تقنيات تخزين أو ملفات ارتباط ضرورية لتشغيل بعض الوظائف. راجع إعدادات المتصفح والخدمات الخارجية عند الحاجة.</p></main>`);

for (let n=1;n<=6;n++) add(`/s${n}`, `الفصل S${n} | الأرشيف الدراسي | ${SITE}`, `مواد الفصل S${n} لطلبة الحقوق بالمغرب.`, `<main dir="rtl"><h1>الفصل ${n} (S${n})</h1><p><strong>هذه صفحة الأرشيف الخاصة بالفصل S${n}.</strong> تجمع المواد المنشورة لهذا المستوى عند توفرها.</p><h2>كيف أستفيد من محتوى S${n}؟</h2><p>استخدم المواد للمراجعة، ثم ارجع إلى المحاضرات والنصوص الأصلية للتحقق والتوسع.</p><a href="/archive">العودة إلى الأرشيف</a></main>`);

for (const x of articles) {
  const slug=x.slug||slugify(x.title), path=`/articles/${slug}`, date=dateOf(x), text=x.content||x.body||x.text||x.excerpt||"";
  add(path, `${x.title} | ${SITE}`, x.excerpt||"مقال قانوني ومنهجي للطلبة.", `<main dir="rtl"><article><h1>${esc(x.title)}</h1><p><strong>تاريخ النشر:</strong> ${esc(date)}</p><p>${esc(text)}</p><p><a href="/articles">العودة إلى المقالات</a></p></article></main>`, { "@type":"Article", headline:x.title, datePublished:x.publishedAt||x.published_at||date, dateModified:date, mainEntityOfPage:`${DOMAIN}${path}` });
}
for (const x of news) {
  const slug=x.slug||slugify(x.title), path=`/news/${slug}`, date=dateOf(x), text=x.content||x.body||x.text||x.summary||x.excerpt||"";
  add(path, `${x.title} | ${SITE}`, x.summary||x.excerpt||"خبر قانوني أو أكاديمي.", `<main dir="rtl"><article><h1>${esc(x.title)}</h1><p><strong>تاريخ النشر:</strong> ${esc(date)}</p><p>${esc(text)}</p><p><a href="/news">العودة إلى الأخبار</a></p></article></main>`, { "@type":"NewsArticle", headline:x.title, datePublished:x.date||x.publishedAt||date, dateModified:date, mainEntityOfPage:`${DOMAIN}${path}` });
}
for (const x of events) {
  const path=`/events/${x.slug||slugify(x.title)}`;
  add(path, `${x.title} | ${SITE}`, x.excerpt||"فعالية أو ندوة قانونية.", `<main dir="rtl"><article><h1>${esc(x.title)}</h1><p><strong>المدينة:</strong> ${esc(x.city||"غير محددة")}</p><p>${esc(x.excerpt||"")}</p><a href="/events">العودة إلى الفعاليات</a></article></main>`, { "@type":"Event", name:x.title, startDate:x.eventDate, location:{"@type":"Place",name:x.city||"المغرب"}, organizer:{"@type":"Organization",name:x.organizer||SITE} });
}
for (const x of schools) {
  const path=`/schools/${x.slug||slugify(x.name)}`;
  add(path, `${x.name} | ${SITE}`, x.synopsis||`معلومات عن ${x.name}.`, `<main dir="rtl"><article><h1>${esc(x.name)}</h1><p>${esc(x.synopsis||"")}</p>${x.officialUrl?`<p><a href="${esc(x.officialUrl)}" rel="noopener">الموقع الرسمي للمؤسسة</a></p>`:""}<a href="/schools">العودة إلى دليل الكليات</a></article></main>`, { "@type":"EducationalOrganization", name:x.name, url:x.officialUrl, address:{"@type":"PostalAddress",addressLocality:x.city||"المغرب",addressCountry:"MA"} });
}
for (const x of terms) {
  const path=`/lexicon/${x.slug}`;
  add(path, x.term_fr?`${x.term_ar} (${x.term_fr}) | القاموس القانوني`:`${x.term_ar} | القاموس القانوني`, x.definition||`تعريف المصطلح ${x.term_ar}.`, termHtml(x), { "@type":"DefinedTerm", name:x.term_ar, alternateName:x.term_fr, description:x.definition, url:`${DOMAIN}${path}`, inDefinedTermSet:`${DOMAIN}/lexicon` });
}

const seen=new Map();
for(const p of pages){if(seen.has(p.path))throw new Error(`Duplicate prerender path ${p.path}`);seen.set(p.path,p.title);}

function render(template,page){
  const canonical=`${DOMAIN}${page.path}`;
  const swap=(html,re,next)=>{if(!re.test(html))throw new Error(`Prerender pattern not found: ${re}`);return html.replace(re,next);};
  let html=template;
  html=swap(html,/<title>[\s\S]*?<\/title>/i,`<title>${esc(page.title)}</title>`);
  html=swap(html,/<meta\b[^>]*\bname=["']description["'][^>]*>/i,`<meta name="description" content="${esc(page.description)}">`);
  html=swap(html,/<link\b[^>]*\brel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${esc(canonical)}">`);
  html=swap(html,/<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']ar["'][^>]*>/i,`<link rel="alternate" hreflang="ar" href="${esc(canonical)}">`);
  html=swap(html,/<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']x-default["'][^>]*>/i,`<link rel="alternate" hreflang="x-default" href="${esc(canonical)}">`);
  html=swap(html,/<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i,`<meta property="og:url" content="${esc(canonical)}">`);
  html=swap(html,/<meta\b[^>]*\bproperty=["']og:title["'][^>]*>/i,`<meta property="og:title" content="${esc(page.title)}">`);
  html=swap(html,/<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/i,`<meta property="og:description" content="${esc(page.description)}">`);
  html=swap(html,/<meta\b[^>]*\bname=["']twitter:title["'][^>]*>/i,`<meta name="twitter:title" content="${esc(page.title)}">`);
  html=swap(html,/<meta\b[^>]*\bname=["']twitter:description["'][^>]*>/i,`<meta name="twitter:description" content="${esc(page.description)}">`);
  html=html.replace("</head>",`<script type="application/ld+json">${jsonForHtml(page.schema)}</script>\n</head>`);
  return swap(html,/<div id="root"><\/div>/i,`<div id="root">${page.staticBody}</div>`);
}

const template=await readFile(join(DIST,"index.html"),"utf8");
for(const page of pages){const destination=page.path==="/"?join(DIST,"index.html"):join(DIST,page.path.slice(1),"index.html");await mkdir(dirname(destination),{recursive:true});await writeFile(destination,render(template,page),"utf8");}
console.log(`Prerendered ${pages.length} GEO-ready static routes.`);
