import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "../dist");
const DATA = join(__dirname, "../src/data");
const DOMAIN = "https://www.mizan.page";
const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));
const [articles, events, schools, lexicon, news] = await Promise.all([
  readJson("articles.json"),
  readJson("events.json"),
  readJson("schools.json"),
  readJson("lexicon.json"),
  readJson("news.json"),
]);

const generateSlug = (text = "") => {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\s\/\\_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF\-]+/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-+|\-+$/g, "");
};

const usedLexiconSlugs = new Set();

// نبني قائمة { slug, term } لكل مصطلح مسبقاً حتى يمكن استخدامها في توليد
// روابط داخلية حقيقية (لصفحة القاموس) وفي توليد محتوى ثابت لكل صفحة مصطلح.
const lexiconWithSlugs = lexicon.map((item) => {
  const base = generateSlug(item.term_ar) || String(item.id);
  const fr = generateSlug(item.term_fr || "") || String(item.id);
  let slug = base;
  if (usedLexiconSlugs.has(slug)) slug = `${base}-${fr}`;
  if (usedLexiconSlugs.has(slug)) slug = `${base}-${item.id}`;
  usedLexiconSlugs.add(slug);
  return { ...item, slug };
});

const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const escapeJsonForHtml = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

const pages = [
  { path: "/", title: "ميزان الرقمية | المعرفة القانونية للطلبة", description: "منصة عربية سريعة للملخصات والأخبار والندوات والقاموس ودليل كليات الحقوق بالمغرب." },
  { path: "/archive", title: "الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ونماذج لطلبة الحقوق مصنفة حسب السداسي والوحدة." },
  { path: "/news", title: "الأخبار والمقالات | ميزان الرقمية", description: "أخبار المنصة ومقالات قانونية ومنهجية للطلبة." },
  { path: "/articles", title: "المقالات | ميزان الرقمية", description: "مقالات منهجية ومهارات قانونية لطلبة الحقوق." },
  { path: "/events", title: "الندوات واللقاءات | ميزان الرقمية", description: "أرشيف للندوات والأنشطة القانونية مع روابط مصادرها الرسمية." },
  { path: "/schools", title: "كليات الحقوق بالمغرب | ميزان الرقمية", description: "دليل كليات العلوم القانونية والاقتصادية والاجتماعية وروابطها الرسمية." },
  { path: "/lexicon", title: "القاموس القانوني | ميزان الرقمية", description: "مصطلحات قانونية بالعربية والفرنسية مع تعريفات موجزة.", staticBody: renderLexiconIndexStaticHtml(lexiconWithSlugs) },
  ...articles.map((item) => ({
    path: `${item.type === "news" ? "/news" : "/articles"}/${item.slug}`,
    title: `${item.title} | ميزان الرقمية`,
    description: item.excerpt,
    schema: { "@context": "https://schema.org", "@type": item.type === "news" ? "NewsArticle" : "Article", headline: item.title, description: item.excerpt, datePublished: item.publishedAt, dateModified: item.updatedAt, inLanguage: "ar", mainEntityOfPage: `${DOMAIN}${item.type === "news" ? "/news" : "/articles"}/${item.slug}` },
  })),
  ...news.map((item) => {
    const slug = item.slug || generateSlug(item.title);
    return {
      path: `/news/${slug}`,
      title: `${item.title} | ميزان الرقمية`,
      description: item.summary || item.excerpt || "",
      schema: { "@context": "https://schema.org", "@type": "NewsArticle", headline: item.title, description: item.summary || item.excerpt, datePublished: item.date || item.publishedAt, inLanguage: "ar", mainEntityOfPage: `${DOMAIN}/news/${slug}` },
    };
  }),
  ...events.map((item) => ({
    path: `/events/${item.slug}`,
    title: `${item.title} | ميزان الرقمية`,
    description: item.excerpt,
    schema: { "@context": "https://schema.org", "@type": "Event", name: item.title, description: item.excerpt, startDate: item.eventDate, location: { "@type": "Place", name: item.city }, organizer: { "@type": "Organization", name: item.organizer }, inLanguage: "ar" },
  })),
  ...schools.map((item) => ({
    path: `/schools/${item.slug}`,
    title: `${item.name} | ميزان الرقمية`,
    description: item.synopsis,
    schema: { "@context": "https://schema.org", "@type": "EducationalOrganization", name: item.name, parentOrganization: item.university, url: item.officialUrl, address: { "@type": "PostalAddress", addressLocality: item.city, addressCountry: "MA" }, inLanguage: "ar" },
  })),
  { path: "/s1", title: "الفصل S1 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الأول لطلبة الحقوق." },
  { path: "/s2", title: "الفصل S2 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الثاني لطلبة الحقوق." },
  { path: "/s3", title: "الفصل S3 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الثالث لطلبة الحقوق." },
  { path: "/s4", title: "الفصل S4 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الرابع لطلبة الحقوق." },
  { path: "/s5", title: "الفصل S5 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الخامس لطلبة الحقوق." },
  { path: "/s6", title: "الفصل S6 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل السادس لطلبة الحقوق." },
  ...lexiconWithSlugs.map((item) => {
    return {
      path: `/lexicon/${item.slug}`,
      title: item.term_fr ? `${item.term_ar} (${item.term_fr}) | القاموس القانوني` : `${item.term_ar} | القاموس القانوني`,
      description: item.definition,
      schema: { "@context": "https://schema.org", "@type": "DefinedTerm", name: item.term_ar, alternateName: item.term_fr, description: item.definition, inDefinedTermSet: `${DOMAIN}/lexicon`, inLanguage: "ar" },
      staticBody: renderTermStaticHtml(item),
    };
  }),
];

// حارس التداخل: يمنع تكرار المسارات أثناء البناء
const seen = new Map();
for (const page of pages) {
  if (seen.has(page.path)) {
    throw new Error(`Duplicate prerender path ${page.path} (${seen.get(page.path)} vs ${page.title})`);
  }
  seen.set(page.path, page.title);
}

// يبني قائمة HTML حقيقية بروابط <a> نحو كل مصطلح — هذا هو المحتوى الذي
// يحتاجه Googlebot ليكتشف صفحات القاموس عبر روابط داخلية فعلية، لا عبر
// sitemap.xml وحده. تُستبدل هذه القائمة فوراً بواجهة React التفاعلية بمجرد
// تحميل الجافاسكريبت لدى الزائر الحقيقي.
function renderLexiconIndexStaticHtml(terms) {
  const items = terms
    .map(
      (t) =>
        `<li><a href="/lexicon/${escapeHtml(t.slug)}">${escapeHtml(t.term_ar)}${t.term_fr ? ` (${escapeHtml(t.term_fr)})` : ""}</a>${t.category ? ` — <span>${escapeHtml(t.category)}</span>` : ""}</li>`
    )
    .join("");
  return `<main dir="rtl"><h1>القاموس القانوني</h1><p>مصطلحات قانونية بالعربية والفرنسية مع تعريفات موجزة، لطلبة كليات الحقوق بالمغرب.</p><ul>${items}</ul></main>`;
}

// يبني محتوى HTML حقيقياً لصفحة مصطلح واحد (التعريف + المصادر القانونية
// والفصول ذات الصلة)، بدلاً من ترك <div id="root"> فارغاً بانتظار جلب
// البيانات عبر جافاسكريبت من Supabase.
function renderTermStaticHtml(item) {
  const sources = (item.legal_sources || [])
    .map((src) => {
      const articles = (src.articles || [])
        .map((a) => `<li><strong>الفصل ${escapeHtml(a.number)}:</strong> ${escapeHtml(a.phrase)}</li>`)
        .join("");
      return `<section><h2>${escapeHtml(src.code_ar || src.code_short || "")}${src.code_fr ? ` — ${escapeHtml(src.code_fr)}` : ""}</h2><ul>${articles}</ul></section>`;
    })
    .join("");

  return `<main dir="rtl"><h1>${escapeHtml(item.term_ar)}${item.term_fr ? ` (${escapeHtml(item.term_fr)})` : ""}</h1>${item.category ? `<p>التصنيف: ${escapeHtml(item.category)}</p>` : ""}<p>${escapeHtml(item.definition)}</p>${sources}<p><a href="/lexicon">العودة إلى القاموس القانوني</a></p></main>`;
}

function renderPage(template, page) {
  const canonical = `${DOMAIN}${page.path === "/" ? "/" : page.path}`;
  const attr = (v) => escapeHtml(v);
  
  // استبدال صارم يمنع الـ Silent No-ops
  const swap = (html, re, next) => {
    if (!html.match(re)) throw new Error(`Prerender: pattern not found — ${re}`);
    return html.replace(re, next);
  };

  let html = template;
  html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${attr(page.title)}</title>`);
  html = swap(html, /<meta\b[^>]*\bname=["']description["'][^>]*>/i, `<meta name="description" content="${attr(page.description)}">`);
  html = swap(html, /<link\b[^>]*\brel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonical}">`);
  html = swap(html, /<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']ar["'][^>]*>/i, `<link rel="alternate" hreflang="ar" href="${canonical}">`);
  html = swap(html, /<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']x-default["'][^>]*>/i, `<link rel="alternate" hreflang="x-default" href="${canonical}">`);
  html = swap(html, /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${canonical}">`);
  html = swap(html, /<meta\b[^>]*\bproperty=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${attr(page.title)}">`);
  html = swap(html, /<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${attr(page.description)}">`);
  html = swap(html, /<meta\b[^>]*\bname=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${attr(page.title)}">`);
  html = swap(html, /<meta\b[^>]*\bname=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${attr(page.description)}">`);
  
  if (page.schema) html = html.replace("</head>", `    <script type="application/ld+json">${escapeJsonForHtml(page.schema)}</script>\n  </head>`);

  // حقن محتوى ثابت حقيقي داخل #root للصفحات التي توفّره (القاموس وصفحات
  // المصطلحات)، بدلاً من تركه فارغاً بانتظار تنفيذ الجافاسكريبت. بما أن
  // main.tsx يستخدم createRoot().render() وليس hydrateRoot()، فإن React
  // يستبدل هذا المحتوى بأمان بمجرد التحميل لدى الزائر الحقيقي — لا يوجد خطر
  // تعارض Hydration.
  if (page.staticBody) {
    html = swap(html, /<div id="root"><\/div>/, `<div id="root">${page.staticBody}</div>`);
  }

  return html;
}

const template = await readFile(join(DIST, "index.html"), "utf8");
for (const page of pages) {
  const destination = page.path === "/" ? join(DIST, "index.html") : join(DIST, page.path.slice(1), "index.html");
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, renderPage(template, page), "utf8");
}

console.log(`Prerendered ${pages.length} static routes.`);