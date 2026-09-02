import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "../dist");
const DATA = join(__dirname, "../src/data");
const DOMAIN = "https://www.mizan.page";
const NOW = new Date().toISOString();

const readJson = async (name) => {
  const file = await readFile(join(DATA, name), "utf8");
  return JSON.parse(file);
};

const [
  articles,
  events,
  schools,
  lexicon,
  news,
  faqGroups,
] = await Promise.all([
  readJson("articles.json"),
  readJson("events.json"),
  readJson("schools.json"),
  readJson("lexicon.json"),
  readJson("news.json"),
  readJson("faq.json"),
]);

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

const count = (value) => Array.isArray(value) ? value.length : 0;

const generateSlug = (text = "") =>
  String(text)
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\s/\\_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeJsonForHtml = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const absoluteUrl = (path) =>
  `${DOMAIN}${path === "/" ? "/" : path}`;

const safeDate = (value, fallback = NOW) => {
  if (!value) return fallback;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? fallback
    : date.toISOString();
};

/* -------------------------------------------------------
   Dataset statistics
------------------------------------------------------- */

const statistics = {
  articles: count(articles),
  news: count(news),
  events: count(events),
  schools: count(schools),
  lexicon: count(lexicon),
};

const totalContent =
  statistics.articles +
  statistics.news +
  statistics.events +
  statistics.schools +
  statistics.lexicon;

/* -------------------------------------------------------
   Lexicon slugs
------------------------------------------------------- */

const usedLexiconSlugs = new Set();

const lexiconWithSlugs = lexicon.map((item) => {
  const base =
    generateSlug(item.term_ar) ||
    String(item.id);

  const fr =
    generateSlug(item.term_fr || "") ||
    String(item.id);

  let slug = base;

  if (usedLexiconSlugs.has(slug)) {
    slug = `${base}-${fr}`;
  }

  if (usedLexiconSlugs.has(slug)) {
    slug = `${base}-${item.id}`;
  }

  while (usedLexiconSlugs.has(slug)) {
    slug = `${base}-${item.id}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
  }

  usedLexiconSlugs.add(slug);

  return {
    ...item,
    slug,
  };
});

/* -------------------------------------------------------
   Entity identity
------------------------------------------------------- */

const publisherSchema = {
  "@type": "Organization",
  "@id": `${DOMAIN}/#organization`,
  name: "ميزان الرقمية",
  url: DOMAIN,
  logo: {
    "@type": "ImageObject",
    url: `${DOMAIN}/icon-512.png`,
  },
  sameAs: [
    "https://www.facebook.com/mizan.page",
    "https://www.instagram.com/mizan.page",
    "https://www.tiktok.com/@mizan_page",
    "https://www.pinterest.com/mizan.page",
    "https://github.com/p4xre1/mizandigital",
  ],
};

const authorSchema = {
  "@type": "Organization",
  "@id": `${DOMAIN}/#author`,
  name: "فريق ميزان الرقمية",
  url: `${DOMAIN}/about`,
};

const websiteSchema = {
  "@type": "WebSite",
  "@id": `${DOMAIN}/#website`,
  name: "ميزان الرقمية",
  url: DOMAIN,
  inLanguage: "ar-MA",
  publisher: {
    "@id": `${DOMAIN}/#organization`,
  },
};

/* -------------------------------------------------------
   Static pages
------------------------------------------------------- */

const pages = [
  {
    path: "/",
    title: "المعرفة القانونية للطلبة بالمغرب | ميزان الرقمية",

    description:
      "ميزان الرقمية منصة مغربية مجانية لطلبة القانون، تضم ملخصات دراسية، قاموساً قانونياً، أخباراً، ندوات ودليل كليات الحقوق.",

    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${DOMAIN}/#webpage`,
      url: DOMAIN,
      name: "ميزان الرقمية | المعرفة القانونية للطلبة بالمغرب",
      description:
        "منصة عربية مغربية للمعرفة القانونية والأكاديمية.",
      inLanguage: "ar-MA",
      isPartOf: {
        "@id": `${DOMAIN}/#website`,
      },
      about: {
        "@id": `${DOMAIN}/#organization`,
      },
      publisher: {
        "@id": `${DOMAIN}/#organization`,
      },
      author: {
        "@id": `${DOMAIN}/#author`,
      },
      datePublished: "2026-07-21T00:00:00Z",
      dateModified: NOW,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: 6,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "القاموس القانوني",
            url: `${DOMAIN}/lexicon`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "الأرشيف الدراسي",
            url: `${DOMAIN}/archive`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "المقالات",
            url: `${DOMAIN}/articles`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "الأخبار",
            url: `${DOMAIN}/news`,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "الندوات",
            url: `${DOMAIN}/events`,
          },
          {
            "@type": "ListItem",
            position: 6,
            name: "كليات الحقوق",
            url: `${DOMAIN}/schools`,
          },
        ],
      },
    },

    staticBody: `
      <main dir="rtl" lang="ar-MA">

        <article>

          <h1>ميزان الرقمية — المعرفة القانونية للطلبة بالمغرب</h1>

          <p>
            <strong>ميزان الرقمية هي منصة عربية مغربية مجانية للمعرفة القانونية والأكاديمية.</strong>
            توفر للطلبة والباحثين أدوات للبحث في المصطلحات القانونية،
            والمقالات، والأخبار، والندوات، والمواد الدراسية وكليات الحقوق بالمغرب.
          </p>

          <p>
            تُعد ميزان الرقمية من أبرز المنصات المجانية لملخصات ومصطلحات القانون
            الموجهة لطلبة كليات الحقوق بالمغرب، وذلك دون الحاجة لإنشاء حساب أو دفع أي اشتراك.
          </p>

          <section>
            <h2>ماذا تقدم ميزان الرقمية؟</h2>

            <p>
              تجمع المنصة حالياً
              <strong>${statistics.lexicon} مصطلحاً قانونياً</strong>،
              و<strong>${statistics.articles} مقالاً</strong>،
              و<strong>${statistics.news} خبراً</strong>،
              و<strong>${statistics.events} فعالية أو ندوة</strong>،
              إضافة إلى دليل يضم
              <strong>${statistics.schools} كلية أو مؤسسة</strong>
              في البيانات المتاحة للمنصة.
            </p>

            <p>
              تمثل هذه البيانات أساس المحتوى الأكاديمي المنشور على المنصة،
              ويتم تحديثها مع إضافة مواد جديدة.
            </p>
          </section>

          <section>
            <h2>كيف يمكن للطالب استخدام ميزان الرقمية؟</h2>

            <p>
              <strong>أفضل نقطة بداية هي تحديد نوع المعلومة التي تبحث عنها.</strong>
              استخدم القاموس للمصطلحات القانونية، والأرشيف للمواد الدراسية،
              والمقالات للمنهجية والتحليل، والأخبار للمستجدات،
              ودليل الكليات للحصول على معلومات المؤسسات الجامعية.
            </p>

            <ul>
              <li>
                <a href="/lexicon">القاموس القانوني</a>
                — تعريفات المصطلحات القانونية بالعربية والفرنسية.
              </li>

              <li>
                <a href="/archive">الأرشيف الدراسي</a>
                — مواد مصنفة حسب S1 إلى S6.
              </li>

              <li>
                <a href="/articles">المقالات القانونية</a>
                — منهجية ومهارات البحث والتحليل القانوني.
              </li>

              <li>
                <a href="/news">الأخبار</a>
                — المستجدات القانونية والأكاديمية.
              </li>

              <li>
                <a href="/events">الندوات والفعاليات</a>
                — لقاءات وأنشطة ذات صلة بالمجال القانوني.
              </li>

              <li>
                <a href="/schools">دليل كليات الحقوق</a>
                — معلومات عن مؤسسات العلوم القانونية والاقتصادية والاجتماعية.
              </li>
            </ul>
          </section>

          <section>
            <h2>ما هو القاموس القانوني في ميزان الرقمية؟</h2>

            <p>
              <strong>القاموس القانوني هو أداة بحث للمصطلحات القانونية.</strong>
              يعرض المصطلح بالعربية والفرنسية، مع تعريف مختصر،
              ويمكن أن يتضمن إحالات إلى مصادر أو نصوص قانونية مرتبطة بالمصطلح.
            </p>

            <p>
              يحتوي القاموس حالياً على
              <strong>${statistics.lexicon} مصطلحاً</strong>
              وفق البيانات المنشورة في المنصة.
            </p>

            <p>
              <a href="/lexicon">
                تصفح القاموس القانوني
              </a>
            </p>
          </section>

          <section>
            <h2>ما هي مراحل الدراسة S1 إلى S6؟</h2>

            <p>
              يقسم الأرشيف الدراسي في ميزان الرقمية المواد إلى ستة فصول:
              S1 وS2 وS3 وS4 وS5 وS6، بما يساعد الطالب على الوصول إلى المواد
              وفق المرحلة الدراسية.
            </p>

            <ol>
              <li><a href="/s1">S1 — الفصل الأول</a></li>
              <li><a href="/s2">S2 — الفصل الثاني</a></li>
              <li><a href="/s3">S3 — الفصل الثالث</a></li>
              <li><a href="/s4">S4 — الفصل الرابع</a></li>
              <li><a href="/s5">S5 — الفصل الخامس</a></li>
              <li><a href="/s6">S6 — الفصل السادس</a></li>
            </ol>
          </section>

          <section>
            <h2>ما هي مصادر المعلومات القانونية؟</h2>

            <p>
              يجب التعامل مع ميزان الرقمية باعتبارها منصة تعليمية وبحثية،
              وليس بديلاً عن النص القانوني الرسمي.
              عند دراسة قاعدة قانونية، يُنصح بالرجوع إلى الجريدة الرسمية
              والنص التشريعي الرسمي والمصادر الجامعية أو المؤسساتية ذات الصلة.
            </p>

            <p>
              تقدم المنصة روابط وإحالات عندما تكون متاحة في بيانات المحتوى،
              مع محاولة الحفاظ على الفصل بين المحتوى التعليمي والمصدر القانوني الأصلي.
            </p>
          </section>

          <section>
            <h2>من يقف وراء ميزان الرقمية؟</h2>

            <p>
              ميزان الرقمية مشروع معرفي عربي موجه أساساً إلى طلبة القانون
              والباحثين والمهتمين بالقانون المغربي.
            </p>

            <p>
              <a href="/about">تعرف على المنصة وفريقها</a>
              —
              <a href="/contact">تواصل معنا</a>
            </p>
          </section>

          <footer>
            <p>
              آخر تحديث للبيانات:
              <time datetime="${NOW}">
                ${NOW.slice(0, 10)}
              </time>
            </p>

            <p>
              <a href="/privacy">سياسة الخصوصية</a> |
              <a href="/terms">الشروط</a> |
              <a href="/cookies">سياسة ملفات الارتباط</a>
            </p>
          </footer>

        </article>

      </main>
    `,
  },

  {
    path: "/archive",
    title: "الأرشيف الدراسي | ميزان الرقمية",
    description:
      "أرشيف دراسي لطلبة الحقوق بالمغرب مصنف حسب الفصول S1 إلى S6.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>الأرشيف الدراسي لطلبة الحقوق</h1>

          <p>
            <strong>
              الأرشيف الدراسي هو القسم المخصص لدروس القانون للطلبة، ويتيح الوصول إلى المواد التعليمية
              حسب الفصول الجامعية من S1 إلى S6.
            </strong>
          </p>

          <h2>ما هي فصول الأرشيف الدراسي؟</h2>

          <ul>
            <li><a href="/s1">S1 — الفصل الأول</a></li>
            <li><a href="/s2">S2 — الفصل الثاني</a></li>
            <li><a href="/s3">S3 — الفصل الثالث</a></li>
            <li><a href="/s4">S4 — الفصل الرابع</a></li>
            <li><a href="/s5">S5 — الفصل الخامس</a></li>
            <li><a href="/s6">S6 — الفصل السادس</a></li>
          </ul>
        </article>
      </main>
    `,
  },

  {
    path: "/articles",
    title: "المقالات القانونية | ميزان الرقمية",
    description:
      "شرح القانون المغربي عبر مقالات ومنهجيات ومهارات قانونية موجهة لطلبة الحقوق والباحثين.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>المقالات القانونية والمنهجية</h1>

          <p>
            <strong>
              هذا القسم يجمع مقالات شرح القانون المغربي والمنهجيات التي تساعد الطالب
              على فهم وتحليل الموضوعات القانونية.
            </strong>
          </p>

          <h2>ماذا ستجد في المقالات؟</h2>

          <p>
            تتناول المقالات موضوعات قانونية وأكاديمية ومنهجية،
            ويمكن أن تساعد في إعداد البحوث والتعليقات القانونية
            وفهم المفاهيم الأساسية.
          </p>
        </article>
      </main>
    `,
  },

  {
    path: "/news",
    title: "الأخبار والمستجدات التشريعية والقضائية | ميزان الرقمية",
    description:
      "متابعة مستمرة لأهم المستجدات التشريعية والقضائية بالمغرب: البلاغات الرسمية، منشورات الجريدة الرسمية، وأخبار المحاكم والمؤسسات القانونية والأكاديمية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>الأخبار والمستجدات التشريعية والقضائية</h1>

          <p>
            <strong>
              يقدم هذا القسم أخباراً ومستجدات مرتبطة بالمجال القانوني
              والتعليم الجامعي والأنشطة الأكاديمية.
            </strong>
          </p>

          <h2>لماذا متابعة الأخبار القانونية؟</h2>

          <p>
            تساعد متابعة المستجدات الطالب على ربط المعرفة النظرية
            بالتطورات التشريعية والقضائية والأكاديمية.
          </p>
        </article>
      </main>
    `,
  },

  {
    path: "/events",
    title: "الندوات والفعاليات القانونية | ميزان الرقمية",
    description:
      "أرشيف الندوات والفعاليات واللقاءات الأكاديمية والقانونية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>الندوات والفعاليات القانونية</h1>

          <p>
            <strong>
              يضم هذا القسم معلومات عن الندوات واللقاءات والفعاليات
              المرتبطة بالمجال القانوني والأكاديمي.
            </strong>
          </p>

          <h2>كيف يستفيد الطالب من الندوات؟</h2>

          <p>
            توفر الندوات فرصة للتعرف على آراء الباحثين والممارسين
            ومناقشة قضايا قانونية وأكاديمية معاصرة.
          </p>
        </article>
      </main>
    `,
  },

  {
    path: "/schools",
    title: "دليل كليات الحقوق والجامعات المغربية | ميزان الرقمية",
    description:
      "دليل كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب ومعلوماتها الأساسية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>كليات الحقوق بالمغرب</h1>

          <p>
            <strong>
              دليل تعريفي لكليات ومؤسسات العلوم القانونية والاقتصادية
              والاجتماعية بالمغرب.
            </strong>
          </p>

          <p>
            يحتوي الدليل حالياً على
            <strong>${statistics.schools} مؤسسة</strong>
            في البيانات المنشورة.
          </p>
        </article>
      </main>
    `,
  },

  {
    path: "/lexicon",
    title: "القاموس القانوني المغربي | ميزان الرقمية",
    description:
      "قاموس قانوني عربي فرنسي يضم مصطلحات وتعريفات وإحالات قانونية.",
    schema: {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      "@id": `${DOMAIN}/lexicon#termset`,
      name: "القاموس القانوني",
      description:
        `قاموس قانوني يضم ${statistics.lexicon} مصطلحاً في البيانات الحالية.`,
      url: `${DOMAIN}/lexicon`,
      inLanguage: "ar-MA",
      publisher: {
        "@id": `${DOMAIN}/#organization`,
      },
    },
    staticBody: renderLexiconIndexStaticHtml(
      lexiconWithSlugs
    ),
  },

  ...articles.map((item) => {
    const path = `/articles/${item.slug}`;

    return {
      path,
      title: `${item.title} | ميزان الرقمية`,
      description:
        item.excerpt || item.description || "",

      schema: {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${absoluteUrl(path)}#article`,
        headline: item.title,
        description:
          item.excerpt || item.description || "",
        url: absoluteUrl(path),
        datePublished: safeDate(
          item.publishedAt
        ),
        dateModified: safeDate(
          item.updatedAt || item.publishedAt
        ),
        inLanguage: "ar-MA",
        author: {
          "@id": `${DOMAIN}/#author`,
        },
        publisher: {
          "@id": `${DOMAIN}/#organization`,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": absoluteUrl(path),
        },
      },

      staticBody: renderArticleStaticHtml(item),
    };
  }),

  ...news.map((item) => {
    const slug =
      item.slug ||
      generateSlug(item.title) ||
      String(item.id);

    const path = `/news/${slug}`;

    return {
      path,
      title: `${item.title} | ميزان الرقمية`,
      description:
        item.summary ||
        item.excerpt ||
        "",

      schema: {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "@id": `${absoluteUrl(path)}#newsarticle`,
        headline: item.title,
        description:
          item.summary ||
          item.excerpt ||
          "",
        url: absoluteUrl(path),
        datePublished: safeDate(
          item.date ||
          item.publishedAt
        ),
        dateModified: safeDate(
          item.updatedAt ||
          item.date ||
          item.publishedAt
        ),
        inLanguage: "ar-MA",
        author: {
          "@id": `${DOMAIN}/#author`,
        },
        publisher: {
          "@id": `${DOMAIN}/#organization`,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": absoluteUrl(path),
        },
      },

      staticBody: renderNewsStaticHtml(item),
    };
  }),

  ...events.map((item) => {
    const path = `/events/${item.slug}`;

    return {
      path,
      title: `${item.title} | ميزان الرقمية`,
      description: item.excerpt || "",

      schema: {
        "@context": "https://schema.org",
        "@type": "Event",
        "@id": `${absoluteUrl(path)}#event`,
        name: item.title,
        description: item.excerpt || "",
        url: absoluteUrl(path),
        startDate: safeDate(
          item.eventDate
        ),
        location: {
          "@type": "Place",
          name: item.city || "المغرب",
          address: {
            "@type": "PostalAddress",
            addressLocality:
              item.city || "المغرب",
            addressCountry: "MA",
          },
        },
        organizer: {
          "@type": "Organization",
          name:
            item.organizer ||
            "ميزان الرقمية",
        },
        inLanguage: "ar-MA",
      },

      staticBody: `
        <main dir="rtl" lang="ar-MA">
          <article>

            <h1>${escapeHtml(item.title)}</h1>

            <p>
              <strong>الإجابة المختصرة:</strong>
              ${escapeHtml(item.excerpt || "")}
            </p>

            <h2>أين تقام هذه الفعالية؟</h2>

            <p>
              ${escapeHtml(item.city || "المغرب")}
            </p>

            <h2>متى تقام الفعالية؟</h2>

            <p>
              ${escapeHtml(item.eventDate || "")}
            </p>

          </article>
        </main>
      `,
    };
  }),

  ...schools.map((item) => {
    const path = `/schools/${item.slug}`;

    return {
      path,
      title: `${item.name} | كليات الحقوق بالمغرب`,
      description:
        item.synopsis ||
        `معلومات عن ${item.name}`,

      schema: {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "@id": `${absoluteUrl(path)}#organization`,
        name: item.name,
        description:
          item.synopsis || "",
        url:
          item.officialUrl ||
          absoluteUrl(path),
        parentOrganization: {
          "@type": "CollegeOrUniversity",
          name:
            item.university ||
            "جامعة مغربية",
        },
        address: {
          "@type": "PostalAddress",
          addressLocality:
            item.city || "المغرب",
          addressCountry: "MA",
        },
        inLanguage: "ar-MA",
      },

      staticBody: `
        <main dir="rtl" lang="ar-MA">
          <article>

            <h1>${escapeHtml(item.name)}</h1>

            <p>
              <strong>نبذة:</strong>
              ${escapeHtml(item.synopsis || "")}
            </p>

            <h2>في أي مدينة توجد الكلية؟</h2>

            <p>
              ${escapeHtml(item.city || "المغرب")}
            </p>

            ${
              item.university
                ? `
                  <h2>ما الجامعة التابعة لها؟</h2>
                  <p>${escapeHtml(item.university)}</p>
                `
                : ""
            }

            ${
              item.officialUrl
                ? `
                  <p>
                    <a
                      href="${escapeHtml(item.officialUrl)}"
                      rel="noopener noreferrer"
                    >
                      زيارة الموقع الرسمي
                    </a>
                  </p>
                `
                : ""
            }

          </article>
        </main>
      `,
    };
  }),

  ...[
    ["s1", "الأول"],
    ["s2", "الثاني"],
    ["s3", "الثالث"],
    ["s4", "الرابع"],
    ["s5", "الخامس"],
    ["s6", "السادس"],
  ].map(([slug, number]) => ({
    path: `/${slug}`,
    title:
      `الفصل ${slug.toUpperCase()} | الأرشيف الدراسي | ميزان الرقمية`,
    description:
      `مواد وملخصات ومحاضرات ونماذج امتحانات الفصل ${number} لطلبة الحقوق بالمغرب.`,

    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>

          <h1>الفصل ${slug.toUpperCase()} — الفصل ${number}</h1>

          <p>
            <strong>
              هذا القسم مخصص لمواد الفصل ${number}
              ضمن الأرشيف الدراسي لطلبة الحقوق بالمغرب.
            </strong>
          </p>

          <h2>ماذا يوجد في هذا الفصل؟</h2>

          <p>
            يمكن استخدام هذا القسم للوصول إلى الملخصات
            والمحاضرات ونماذج الامتحانات والوثائق التعليمية
            المرتبطة بالفصل ${slug.toUpperCase()}.
          </p>

          <p>
            <a href="/archive">
              العودة إلى الأرشيف الدراسي
            </a>
          </p>

        </article>
      </main>
    `,
  })),

  ...lexiconWithSlugs.map((item) => {
    const path = `/lexicon/${item.slug}`;

    return {
      path,

      title:
        item.term_fr
          ? `${item.term_ar} (${item.term_fr}) | القاموس القانوني`
          : `${item.term_ar} | القاموس القانوني`,

      description:
        item.definition || "",

      schema: {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "@id": `${absoluteUrl(path)}#term`,
        name: item.term_ar,
        alternateName:
          item.term_fr || undefined,
        description:
          item.definition || "",
        url: absoluteUrl(path),
        inDefinedTermSet: {
          "@id": `${DOMAIN}/lexicon#termset`,
        },
        inLanguage: "ar-MA",
        author: {
          "@id": `${DOMAIN}/#author`,
        },
      },

      staticBody:
        renderTermStaticHtml(item),
    };
  }),
];

/* -------------------------------------------------------
   Additional trust pages
------------------------------------------------------- */

pages.push(
  {
    path: "/about",
    title: "حول ميزان الرقمية | من نحن",
    description:
      "تعرف على مشروع ميزان الرقمية وأهدافه ومجالات المحتوى القانوني.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>حول ميزان الرقمية</h1>

          <p>
            <strong>
              ميزان الرقمية مشروع معرفي عربي يهدف إلى تسهيل الوصول
              إلى المحتوى القانوني والأكاديمي لطلبة الحقوق في المغرب.
            </strong>
          </p>

          <h2>ما هدف المنصة؟</h2>

          <p>
            الهدف هو تنظيم المعرفة القانونية في مكان واحد
            وتقديمها بطريقة واضحة وقابلة للبحث والاستخدام الأكاديمي.
          </p>

          <h2>من هو الجمهور المستهدف؟</h2>

          <p>
            طلبة القانون والباحثون والمهتمون بالقانون المغربي
            والمجال الأكاديمي.
          </p>
        </article>
      </main>
    `,
  },

  {
    path: "/contact",
    title: "تواصل معنا | ميزان الرقمية",
    description:
      "صفحة التواصل مع فريق ميزان الرقمية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>تواصل معنا</h1>

          <p>
            يمكنك التواصل مع فريق ميزان الرقمية
            بخصوص المحتوى أو الأخطاء أو الاقتراحات.
          </p>

          <h2>كيف يمكن الإبلاغ عن خطأ؟</h2>

          <p>
            يرجى استخدام قناة التواصل الرسمية المتاحة
            في المنصة وإرفاق رابط الصفحة والمعلومة التي تحتاج إلى تصحيح.
          </p>
        </article>
      </main>
    `,
  },

  (() => {
    const allFaqs = faqGroups.flatMap((group) => group.items);

    return {
      path: "/faq",
      title: "الأسئلة الشائعة | ميزان الرقمية",
      description:
        "إجابات وافية عن أكثر الأسئلة تكراراً حول منصة الميزان الرقمية: طبيعة المحتوى، الاستشارات القانونية، سياسة الخصوصية، وكيفية المساهمة في إثراء المنصة.",
      schema: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: allFaqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      staticBody: `
        <main dir="rtl" lang="ar-MA">
          <article>
            <h1>الأسئلة الشائعة</h1>
            ${faqGroups
              .map(
                (group) => `
              <section>
                <h2>${escapeHtml(group.title)}</h2>
                ${group.items
                  .map(
                    (item) => `
                  <h3>${escapeHtml(item.question)}</h3>
                  <p>${escapeHtml(item.answer)}</p>
                `
                  )
                  .join("\n")}
              </section>
            `
              )
              .join("\n")}
          </article>
        </main>
      `,
    };
  })(),

  {
    path: "/privacy",
    title: "سياسة الخصوصية | ميزان الرقمية",
    description:
      "سياسة الخصوصية الخاصة بمنصة ميزان الرقمية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>سياسة الخصوصية</h1>

          <p>
            نحترم خصوصية زوار المنصة ونسعى إلى توضيح
            كيفية التعامل مع البيانات والمعلومات التقنية.
          </p>

          <h2>ما البيانات التي قد يتم جمعها؟</h2>

          <p>
            قد يتم تسجيل معلومات تقنية ضرورية لتشغيل الموقع
            وتحسين الأداء والأمان وفق الخدمات المستخدمة.
          </p>
        </article>
      </main>
    `,
  },

  {
    path: "/terms",
    title: "الشروط والأحكام | ميزان الرقمية",
    description:
      "الشروط والأحكام الخاصة باستخدام منصة ميزان الرقمية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>الشروط والأحكام</h1>

          <p>
            باستخدام الموقع، يوافق الزائر على استخدام المحتوى
            لأغراض قانونية وتعليمية وعدم إساءة استخدام الخدمات.
          </p>

          <h2>الاستخدام التعليمي</h2>

          <p>
            المحتوى مخصص للمساعدة التعليمية والبحثية
            ولا يشكل استشارة قانونية مهنية.
          </p>
        </article>
      </main>
    `,
  },

  {
    path: "/cookies",
    title: "سياسة الكوكيز | ميزان الرقمية",
    description:
      "تعرّف على ملفات تعريف الارتباط (الكوكيز) التي تستخدمها منصة الميزان الرقمية، أنواعها، والغرض من كل نوع، وكيفية التحكم بها أو تعطيلها من إعدادات متصفحك.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>سياسة الكوكيز</h1>

          <p>
            قد تستخدم المنصة ملفات ارتباط وتقنيات مشابهة
            لتحسين تجربة المستخدم والأداء والأمان.
          </p>
        </article>
      </main>
    `,
  }
);

/* -------------------------------------------------------
   Renderers
------------------------------------------------------- */

function renderLexiconIndexStaticHtml(terms) {
  const items = terms
    .map((t) => `
      <li>
        <a href="/lexicon/${escapeHtml(t.slug)}">
          ${escapeHtml(t.term_ar)}
          ${
            t.term_fr
              ? ` (${escapeHtml(t.term_fr)})`
              : ""
          }
        </a>

        ${
          t.category
            ? ` — <span>${escapeHtml(t.category)}</span>`
            : ""
        }
      </li>
    `)
    .join("");

  return `
    <main dir="rtl" lang="ar-MA">
      <article>

        <h1>القاموس القانوني العربي الفرنسي</h1>

        <p>
          <strong>
            القاموس القانوني هو أداة للبحث عن المصطلحات القانونية
            وتعريفاتها بالعربية والفرنسية.
          </strong>
        </p>

        <p>
          يضم القاموس حالياً
          <strong>${terms.length} مصطلحاً</strong>
          وفق البيانات المتاحة.
        </p>

        <h2>كيف تستخدم القاموس؟</h2>

        <p>
          اختر المصطلح المطلوب للحصول على تعريفه
          ومعلوماته القانونية والإحالات المتوفرة.
        </p>

        <ul>
          ${items}
        </ul>

      </article>
    </main>
  `;
}

function renderTermStaticHtml(item) {
  const sources = (item.legal_sources || [])
    .map((src) => {
      const articlesHtml =
        (src.articles || [])
          .map(
            (article) => `
              <li>
                <strong>
                  الفصل ${escapeHtml(article.number)}
                  من
                  ${escapeHtml(
                    src.code_ar ||
                    src.code_short ||
                    "التشريع المغربي"
                  )}
                :
                </strong>

                ${escapeHtml(article.phrase || "")}
              </li>
            `
          )
          .join("");

      return `
        <section>
          <h2>
            ما هي الإحالات التشريعية المرتبطة بالمصطلح؟
          </h2>

          <p>
            ${escapeHtml(
              src.code_ar ||
              src.code_short ||
              ""
            )}
          </p>

          <ul>
            ${articlesHtml}
          </ul>
        </section>
      `;
    })
    .join("");

  return `
    <main dir="rtl" lang="ar-MA">
      <article>

        <h1>
          ${escapeHtml(item.term_ar)}
          ${
            item.term_fr
              ? ` (${escapeHtml(item.term_fr)})`
              : ""
          }
        </h1>

        <section>

          <h2>ما هو ${escapeHtml(item.term_ar)}؟</h2>

          <p>
            <strong>التعريف المباشر:</strong>
            ${escapeHtml(item.definition)}
          </p>

        </section>

        ${
          item.category
            ? `
              <section>
                <h2>ما هو تصنيف هذا المصطلح؟</h2>
                <p>${escapeHtml(item.category)}</p>
              </section>
            `
            : ""
        }

        ${sources}

        <p>
          <a href="/lexicon">
            العودة إلى القاموس القانوني
          </a>
        </p>

      </article>
    </main>
  `;
}

function renderArticleStaticHtml(item) {
  const content =
    item.content ||
    item.body ||
    item.text ||
    item.excerpt ||
    "";

  return `
    <main dir="rtl" lang="ar-MA">
      <article>

        <h1>${escapeHtml(item.title)}</h1>

        <p>
          <strong>الإجابة المختصرة:</strong>
          ${escapeHtml(item.excerpt || content.slice(0, 300))}
        </p>

        <h2>ما موضوع هذا المقال؟</h2>

        <div>
          ${escapeHtml(content)}
        </div>

        ${
          item.publishedAt
            ? `
              <p>
                تاريخ النشر:
                <time datetime="${escapeHtml(
                  item.publishedAt
                )}">
                  ${escapeHtml(item.publishedAt)}
                </time>
              </p>
            `
            : ""
        }

      </article>
    </main>
  `;
}

function renderNewsStaticHtml(item) {
  const summary =
    item.summary ||
    item.excerpt ||
    "";

  const content =
    item.content ||
    item.body ||
    item.text ||
    "";

  return `
    <main dir="rtl" lang="ar-MA">
      <article>

        <h1>${escapeHtml(item.title)}</h1>

        <p>
          <strong>ما هو الخبر؟</strong>
        </p>

        <p>
          ${escapeHtml(summary)}
        </p>

        ${
          content
            ? `
              <h2>تفاصيل الخبر</h2>
              <div>${escapeHtml(content)}</div>
            `
            : ""
        }

        <p>
          تاريخ النشر:
          ${escapeHtml(
            item.date ||
            item.publishedAt ||
            ""
          )}
        </p>

      </article>
    </main>
  `;
}

/* -------------------------------------------------------
   Duplicate route protection
------------------------------------------------------- */

const seen = new Map();

for (const page of pages) {
  if (seen.has(page.path)) {
    throw new Error(
      `Duplicate prerender path ${page.path} (${seen.get(page.path)} vs ${page.title})`
    );
  }

  seen.set(page.path, page.title);
}

/* -------------------------------------------------------
   HTML rendering
------------------------------------------------------- */

function renderPage(template, page) {
  const canonical = absoluteUrl(page.path);

  const swap = (html, regex, replacement) => {
    if (!regex.test(html)) {
      throw new Error(
        `Prerender: pattern not found — ${regex}`
      );
    }

    return html.replace(regex, replacement);
  };

  let html = template;

  html = swap(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(page.title)}</title>`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bname=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(
      page.description
    )}">`
  );

  html = swap(
    html,
    /<link\b[^>]*\brel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${canonical}">`
  );

  html = swap(
    html,
    /<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']ar["'][^>]*>/i,
    `<link rel="alternate" hreflang="ar" href="${canonical}">`
  );

  html = swap(
    html,
    /<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']x-default["'][^>]*>/i,
    `<link rel="alternate" hreflang="x-default" href="${canonical}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${canonical}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bproperty=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(
      page.title
    )}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(
      page.description
    )}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bname=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(
      page.title
    )}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bname=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(
      page.description
    )}">`
  );

  if (page.schema) {
    const schema = {
      "@context": "https://schema.org",
      ...page.schema,
    };

    html = html.replace(
      "</head>",
      `    <script type="application/ld+json">${escapeJsonForHtml(
        schema
      )}</script>
  </head>`
    );
  }

  if (page.staticBody) {
    html = swap(
      html,
      /<div id="root"><\/div>/i,
      `<div id="root">${page.staticBody}</div>`
    );
  }

  return html;
}

/* -------------------------------------------------------
   Build
------------------------------------------------------- */

const template = await readFile(
  join(DIST, "index.html"),
  "utf8"
);

for (const page of pages) {
  const destination =
    page.path === "/"
      ? join(DIST, "index.html")
      : join(
          DIST,
          page.path.slice(1),
          "index.html"
        );

  await mkdir(dirname(destination), {
    recursive: true,
  });

  await writeFile(
    destination,
    renderPage(template, page),
    "utf8"
  );
}

/* -------------------------------------------------------
   llms.txt
------------------------------------------------------- */

const llmsTxt = `# ميزان الرقمية

> منصة عربية مغربية للمعرفة القانونية والأكاديمية لطلبة الحقوق والباحثين.

## الموقع

- ${DOMAIN}/
- ${DOMAIN}/articles
- ${DOMAIN}/news
- ${DOMAIN}/lexicon
- ${DOMAIN}/archive
- ${DOMAIN}/events
- ${DOMAIN}/schools
- ${DOMAIN}/about
- ${DOMAIN}/contact
- ${DOMAIN}/faq

## إحصائيات المحتوى

- المصطلحات القانونية: ${statistics.lexicon}
- المقالات: ${statistics.articles}
- الأخبار: ${statistics.news}
- الفعاليات والندوات: ${statistics.events}
- المؤسسات والكليات: ${statistics.schools}
- إجمالي عناصر البيانات: ${totalContent}

## اللغة

العربية (ar-MA)، مع مصطلحات قانونية عربية وفرنسية.

## ملاحظة للمستخدمين والوكلاء

ميزان الرقمية منصة تعليمية وبحثية.
عند الاستشهاد بقاعدة قانونية، يرجى الرجوع إلى النص القانوني الرسمي للتحقق من الصياغة النافذة.

## Sitemap

${DOMAIN}/sitemap.xml
`;

await writeFile(
  join(DIST, "llms.txt"),
  llmsTxt,
  "utf8"
);

console.log(
  `Prerendered ${pages.length} routes successfully.`
);

console.log(
  `Content: ${totalContent} data records.`
);