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
    .replace(/\-+$/, "");
};

const pages = [
  { path: "/", title: "ميزان الرقمية | المعرفة القانونية للطلبة", description: "منصة عربية سريعة للملخصات والأخبار والندوات والقاموس ودليل كليات الحقوق بالمغرب." },
  { path: "/archive", title: "الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ونماذج لطلبة الحقوق مصنفة حسب السداسي والوحدة." },
  { path: "/news", title: "الأخبار والمقالات | ميزان الرقمية", description: "أخبار المنصة ومقالات قانونية ومنهجية للطلبة." },
  { path: "/articles", title: "المقالات | ميزان الرقمية", description: "مقالات منهجية ومهارات قانونية لطلبة الحقوق." },
  { path: "/events", title: "الندوات واللقاءات | ميزان الرقمية", description: "أرشيف للندوات والأنشطة القانونية مع روابط مصادرها الرسمية." },
  { path: "/schools", title: "كليات الحقوق بالمغرب | ميزان الرقمية", description: "دليل كليات العلوم القانونية والاقتصادية والاجتماعية وروابطها الرسمية." },
  { path: "/lexicon", title: "القاموس القانوني | ميزان الرقمية", description: "مصطلحات قانونية بالعربية والفرنسية مع تعريفات موجزة." },
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
  ...lexicon.map((item) => {
    const slug = generateSlug(item.term_ar) || item.id;
    return {
      path: `/lexicon/${slug}`,
      title: `${item.term_ar} | القاموس القانوني`,
      description: item.definition,
      schema: { "@context": "https://schema.org", "@type": "DefinedTerm", name: item.term_ar, alternateName: item.term_fr, description: item.definition, inDefinedTermSet: `${DOMAIN}/lexicon`, inLanguage: "ar" },
    };
  }),
];

const escapeHtml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const escapeJsonForHtml = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

function renderPage(template, page) {
  const canonical = `${DOMAIN}${page.path}`;
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<link rel="alternate" hreflang="ar" href="[^"]*"\s*\/>/, `<link rel="alternate" hreflang="ar" href="${canonical}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`);
  if (page.schema) html = html.replace("</head>", `    <script type="application/ld+json">${escapeJsonForHtml(page.schema)}</script>\n  </head>`);
  return html;
}

const template = await readFile(join(DIST, "index.html"), "utf8");
for (const page of pages) {
  const destination = page.path === "/" ? join(DIST, "index.html") : join(DIST, page.path.slice(1), "index.html");
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, renderPage(template, page), "utf8");
}

console.log(`Prerendered ${pages.length} static routes.`);