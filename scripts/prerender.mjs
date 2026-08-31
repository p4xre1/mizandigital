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

// الهوية الموحدة للمنصة لتوحيد إشارات الثقة (E-E-A-T) وربط نفس الكيان (sameAs)
const publisherSchema = {
  "@type": "Organization",
  "name": "ميزان الرقمية",
  "url": DOMAIN,
  "sameAs": [
    "https://github.com/mizan-page",
    "https://www.wikidata.org/wiki/Q12500000" // استبدلها برابط ويكيبيديا أو ويكي بيانات الحقيقي إن وجد
  ]
};

const authorSchema = {
  "@type": "Organization",
  "name": "فريق ميزان الرقمية",
  "url": DOMAIN
};

const pages = [
  { 
    path: "/", 
    title: "ميزان الرقمية | المعرفة القانونية للطلبة", 
    description: "منصة عربية سريعة للملخصات والأخبار والندوات والقاموس ودليل كليات الحقوق بالمغرب.", 
    schema: { 
      "@context": "https://schema.org", 
      "@type": ["WebSite", "FAQPage"], 
      "name": "ميزان الرقمية", 
      "url": DOMAIN, 
      "inLanguage": "ar", 
      "publisher": publisherSchema,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "ما هي منصة ميزان الرقمية؟",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ميزان الرقمية هي منصة مغربية شاملة تهدف إلى تيسير الوصول إلى المعرفة القانونية لطلبة كليات العلوم القانونية والاقتصادية والاجتماعية. توفر المنصة ملخصات دراسية، أرشيف للامتحانات، قاموس قانوني مزدوج اللغة، وتغطية لآخر الأخبار والندوات."
          }
        },
        {
          "@type": "Question",
          "name": "كيف يمكنني الاستفادة من القاموس القانوني؟",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "يوفر القاموس القانوني لميزان الرقمية ترجمة وتعريفاً دقيقاً للمصطلحات القانونية باللغتين العربية والفرنسية، مع إحالات مباشرة إلى الفصول القانونية في التشريع المغربي لتسهيل البحث الأكاديمي."
          }
        }
      ]
    },
    staticBody: `
      <main dir="rtl">
        <h1>ميزان الرقمية — المعرفة القانونية للطلبة</h1>
        <p>ميزان الرقمية هي منصة عربية سريعة للملخصات والأخبار والندوات والقاموس ودليل كليات الحقوق بالمغرب. نهدف إلى سد الفجوة الرقمية في المحتوى القانوني الأكاديمي وتوفير مرجع موثوق وسهل الاستخدام للطلبة والباحثين في المجال القانوني.</p>
        
        <h2>أقسام المنصة</h2>
        <nav>
          <ul>
            <li><a href="/lexicon">القاموس القانوني:</a> مصطلحات قانونية دقيقة بالعربية والفرنسية مدعومة بالنصوص التشريعية.</li>
            <li><a href="/archive">الأرشيف الدراسي:</a> ملخصات ومحاضرات ونماذج امتحانات لجميع فصول الإجازة (S1 إلى S6).</li>
            <li><a href="/news">الأخبار والمقالات:</a> متابعة مستمرة لأهم المستجدات والمقالات المنهجية لتطوير المهارات القانونية.</li>
            <li><a href="/schools">كليات الحقوق:</a> دليل شامل لكليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب.</li>
          </ul>
        </nav>

        <h2>الأسئلة الشائعة</h2>
        <h3>ما هي منصة ميزان الرقمية؟</h3>
        <p>ميزان الرقمية هي منصة مغربية شاملة تهدف إلى تيسير الوصول إلى المعرفة القانونية لطلبة كليات العلوم القانونية والاقتصادية والاجتماعية. توفر المنصة ملخصات دراسية، أرشيف للامتحانات، قاموس قانوني مزدوج اللغة، وتغطية لآخر الأخبار والندوات.</p>
        
        <h3>كيف يمكنني الاستفادة من القاموس القانوني؟</h3>
        <p>يوفر القاموس القانوني لميزان الرقمية ترجمة وتعريفاً دقيقاً للمصطلحات القانونية باللغتين العربية والفرنسية، مع إحالات مباشرة إلى الفصول القانونية في التشريع المغربي لتسهيل البحث الأكاديمي.</p>
      </main>
    `
  },
  { 
    path: "/archive", 
    title: "الأرشيف الدراسي | ميزان الرقمية", 
    description: "ملخصات ونماذج لطلبة الحقوق مصنفة حسب السداسي والوحدة.", 
    staticBody: `<main dir="rtl"><h1>الأرشيف الدراسي</h1><p>ملخصات ومحاضرات ونماذج امتحانات لطلبة كليات الحقوق بالمغرب مصنفة حسب الفصول:</p><ul><li><a href="/s1">الفصل الأول (S1)</a></li><li><a href="/s2">الفصل الثاني (S2)</a></li><li><a href="/s3">الفصل الثالث (S3)</a></li><li><a href="/s4">الفصل الرابع (S4)</a></li><li><a href="/s5">الفصل الخامس (S5)</a></li><li><a href="/s6">الفصل السادس (S6)</a></li></ul></main>` 
  },
  { 
    path: "/news", 
    title: "الأخبار والمقالات | ميزان الرقمية", 
    description: "أخبار المنصة ومقالات قانونية ومنهجية للطلبة.",
    staticBody: `<main dir="rtl"><h1>الأخبار والمقالات القانونية</h1><p>آخر المستجدات والأخبار المتعلقة بطلبة كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب.</p></main>`
  },
  { 
    path: "/articles", 
    title: "المقالات | ميزان الرقمية", 
    description: "مقالات منهجية ومهارات قانونية لطلبة الحقوق.",
    staticBody: `<main dir="rtl"><h1>المقالات المنهجية</h1><p>دليل شامل للمهتمين بالمنهجية القانونية والتحليل القانوني.</p></main>`
  },
  { 
    path: "/events", 
    title: "الندوات واللقاءات | ميزان الرقمية", 
    description: "أرشيف للندوات والأنشطة القانونية مع روابط مصادرها الرسمية.",
    staticBody: `<main dir="rtl"><h1>الندوات واللقاءات القانونية</h1><p>أرشيف يوثق أبرز اللقاءات العلمية والندوات الأكاديمية.</p></main>`
  },
  { 
    path: "/schools", 
    title: "كليات الحقوق بالمغرب | ميزان الرقمية", 
    description: "دليل كليات العلوم القانونية والاقتصادية والاجتماعية وروابطها الرسمية.",
    staticBody: `<main dir="rtl"><h1>كليات الحقوق بالمغرب</h1><p>دليل تعريفي بكليات العلوم القانونية والاقتصادية والاجتماعية (FSJES) بمختلف الجامعات المغربية.</p></main>`
  },
  { 
    path: "/lexicon", 
    title: "القاموس القانوني | ميزان الرقمية", 
    description: "مصطلحات قانونية بالعربية والفرنسية مع تعريفات موجزة.", 
    schema: { "@context": "https://schema.org", "@type": "DefinedTermSet", "name": "القاموس القانوني", "description": "مصطلحات قانونية مغربية وعربية فرنسية", "publisher": publisherSchema },
    staticBody: renderLexiconIndexStaticHtml(lexiconWithSlugs) 
  },
  ...articles.map((item) => ({
    path: `${item.type === "news" ? "/news" : "/articles"}/${item.slug}`,
    title: `${item.title} | ميزان الرقمية`,
    description: item.excerpt,
    schema: { 
      "@context": "https://schema.org", 
      "@type": item.type === "news" ? "NewsArticle" : "Article", 
      headline: item.title, 
      description: item.excerpt, 
      datePublished: item.publishedAt || "2026-01-01", 
      dateModified: item.updatedAt || item.publishedAt || "2026-01-01", 
      inLanguage: "ar", 
      author: authorSchema,
      publisher: publisherSchema,
      mainEntityOfPage: `${DOMAIN}${item.type === "news" ? "/news" : "/articles"}/${item.slug}` 
    },
    staticBody: `<main dir="rtl"><h1>${escapeHtml(item.title)}</h1><p>نشر بتاريخ: ${escapeHtml(item.publishedAt || "")}</p><p>${escapeHtml(item.excerpt)}</p></main>`
  })),
  ...news.map((item) => {
    const slug = item.slug || generateSlug(item.title);
    return {
      path: `/news/${slug}`,
      title: `${item.title} | ميزان الرقمية`,
      description: item.summary || item.excerpt || "",
      schema: { 
        "@context": "https://schema.org", 
        "@type": "NewsArticle", 
        headline: item.title, 
        description: item.summary || item.excerpt, 
        datePublished: item.date || item.publishedAt || "2026-01-01", 
        dateModified: item.updatedAt || item.date || item.publishedAt || "2026-01-01",
        inLanguage: "ar", 
        author: authorSchema,
        publisher: publisherSchema,
        mainEntityOfPage: `${DOMAIN}/news/${slug}` 
      },
      staticBody: `<main dir="rtl"><h1>${escapeHtml(item.title)}</h1><p>${escapeHtml(item.summary || item.excerpt)}</p></main>`
    };
  }),
  ...events.map((item) => ({
    path: `/events/${item.slug}`,
    title: `${item.title} | ميزان الرقمية`,
    description: item.excerpt,
    schema: { 
      "@context": "https://schema.org", 
      "@type": "Event", 
      name: item.title, 
      description: item.excerpt, 
      startDate: item.eventDate, 
      location: { "@type": "Place", name: item.city }, 
      organizer: { "@type": "Organization", name: item.organizer }, 
      inLanguage: "ar" 
    },
    staticBody: `<main dir="rtl"><h1>${escapeHtml(item.title)}</h1><p>المدينة: ${escapeHtml(item.city)}</p><p>${escapeHtml(item.excerpt)}</p></main>`
  })),
  ...schools.map((item) => ({
    path: `/schools/${item.slug}`,
    title: `${item.name} | ميزان الرقمية`,
    description: item.synopsis,
    schema: { 
      "@context": "https://schema.org", 
      "@type": "EducationalOrganization", 
      name: item.name, 
      parentOrganization: { "@type": "Organization", name: item.university }, 
      url: item.officialUrl, 
      address: { "@type": "PostalAddress", addressLocality: item.city, addressCountry: "MA" }, 
      inLanguage: "ar" 
    },
    staticBody: `<main dir="rtl"><h1>${escapeHtml(item.name)}</h1><p>${escapeHtml(item.synopsis)}</p></main>`
  })),
  { path: "/s1", title: "الفصل S1 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الأول لطلبة الحقوق.", staticBody: `<main dir="rtl"><h1>الفصل الأول (S1)</h1><p>ملخصات ومحاضرات ونماذج امتحانات الفصل الأول لطلبة كليات الحقوق بالمغرب.</p></main>` },
  { path: "/s2", title: "الفصل S2 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الثاني لطلبة الحقوق.", staticBody: `<main dir="rtl"><h1>الفصل الثاني (S2)</h1><p>ملخصات ومحاضرات ونماذج امتحانات الفصل الثاني لطلبة كليات الحقوق بالمغرب.</p></main>` },
  { path: "/s3", title: "الفصل S3 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الثالث لطلبة الحقوق.", staticBody: `<main dir="rtl"><h1>الفصل الثالث (S3)</h1><p>ملخصات ومحاضرات ونماذج امتحانات الفصل الثالث لطلبة كليات الحقوق بالمغرب.</p></main>` },
  { path: "/s4", title: "الفصل S4 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الرابع لطلبة الحقوق.", staticBody: `<main dir="rtl"><h1>الفصل الرابع (S4)</h1><p>ملخصات ومحاضرات ونماذج امتحانات الفصل الرابع لطلبة كليات الحقوق بالمغرب.</p></main>` },
  { path: "/s5", title: "الفصل S5 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل الخامس لطلبة الحقوق.", staticBody: `<main dir="rtl"><h1>الفصل الخامس (S5)</h1><p>ملخصات ومحاضرات ونماذج امتحانات الفصل الخامس لطلبة كليات الحقوق بالمغرب.</p></main>` },
  { path: "/s6", title: "الفصل S6 | الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ومحاضرات ونماذج امتحانات الفصل السادس لطلبة الحقوق.", staticBody: `<main dir="rtl"><h1>الفصل السادس (S6)</h1><p>ملخصات ومحاضرات ونماذج امتحانات الفصل السادس لطلبة كليات الحقوق بالمغرب.</p></main>` },
  ...lexiconWithSlugs.map((item) => {
    return {
      path: `/lexicon/${item.slug}`,
      title: item.term_fr ? `${item.term_ar} (${item.term_fr}) | القاموس القانوني` : `${item.term_ar} | القاموس القانوني`,
      description: item.definition,
      schema: { 
        "@context": "https://schema.org", 
        "@type": "DefinedTerm", 
        name: item.term_ar, 
        alternateName: item.term_fr, 
        description: item.definition, 
        inDefinedTermSet: `${DOMAIN}/lexicon`, 
        inLanguage: "ar",
        author: authorSchema
      },
      staticBody: renderTermStaticHtml(item),
    };
  }),
];

const seen = new Map();
for (const page of pages) {
  if (seen.has(page.path)) {
    throw new Error(`Duplicate prerender path ${page.path} (${seen.get(page.path)} vs ${page.title})`);
  }
  seen.set(page.path, page.title);
}

function renderLexiconIndexStaticHtml(terms) {
  const items = terms
    .map(
      (t) =>
        `<li><a href="/lexicon/${escapeHtml(t.slug)}">${escapeHtml(t.term_ar)}${t.term_fr ? ` (${escapeHtml(t.term_fr)})` : ""}</a>${t.category ? ` — <span>${escapeHtml(t.category)}</span>` : ""}</li>`
    )
    .join("");
  return `<main dir="rtl"><h1>القاموس القانوني</h1><p>مصطلحات قانونية بالعربية والفرنسية مع تعريفات موجزة، لطلبة كليات الحقوق بالمغرب.</p><ul>${items}</ul></main>`;
}

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