import { useEffect } from "react"
import { DEFAULT_KEYWORDS } from "../../lib/seo/keywords"
import { BASE_URL, canonicalFromLocation, canonicalUrl as toCanonicalUrl, isIndexablePath } from "../../lib/canonical"
import { fitTitle } from "../../lib/seo/description"
// العلامة من المصدر الواحد (shared/seo/meta-copy.js): كانت «ميزان الرقمية»
// مكتوبة هنا حرفياً بينما العقدة المنشورة من src/lib/seo/schema.ts تُسمّي
// الكيان «منصة الميزان الرقمية» — تسميتان لكيان واحد (Brand Consistency في
// تدقيق GEO). المعرّف الآن واحد في <title> وog:site_name والبيانات المهيكلة.
import { BRAND, BRAND_ALTERNATE_NAMES } from "../../../shared/seo/meta-copy.js"
import { SchemaOrg, generateOrganizationSchema, generateWebsiteSchema } from "./SchemaOrg"

/**
 * الرابط القانوني لهذه الصفحة — دائماً مطابق لسياسة بلا-شرطة-النهاية.
 *
 * سابقاً كان الافتراضي `window.location.href`، أي أن الرابط كما كتبه الزائر
 * بالضبط: شرطة نهاية، أو معاملات&utm_source، أو نطاق بلا www — وكلها كانت
 * تُكتب في <link rel="canonical"> و og:url عند التنقل داخل التطبيق. النتيجة
 * نسخة canonical لكل شكل من أشكال الرابط، فتتوزّع إشارة الفهرسة بين الصفحات
 * بدل أن تتركّز في رابط واحد (وهو تحديداً ما تُكافئ عليه Google رابطاً واحداً).
 *
 * الآن كل مسار يمرّ بسياسة الروابط: يُحذف ذيل الشرطة والمعاملات والحزام،
 * ويُثبَّت النطاق القانوني. صفحات الـ prerender تحمل الوسوم نفسها مولّدة من
 * نفس السياسة (scripts/prerender.mjs)، فلا يختلف ما يراه الزاحف عمّا يراه
 * المتصفح بعد hydration.
 */
function resolveCanonicalUrl(passed?: string): string {
  if (passed) return toCanonicalUrl(passed)
  if (typeof window !== "undefined" && window.location?.pathname) {
    return canonicalFromLocation(window.location.pathname)
  }
  return BASE_URL
}

export interface SEOHeadProps {
  title: string
  description: string
  canonicalUrl?: string
  ogType?: "website" | "article"
  ogImage?: string
  publishedTime?: string
  modifiedTime?: string
  keywords?: string[]
  schema?: Record<string, any> | Record<string, any>[]
  /** يمنع فهرسة الصفحة من محركات البحث (صفحات 404، المسودات، نتائج البحث الداخلي...) */
  noindex?: boolean
  /** AEO: FAQ for answer engines */
  faq?: { question: string; answer: string }[]
  /** AEO: Breadcrumb for navigation */
  breadcrumbs?: { name: string; url: string }[]
  /** AEO: Speakable sections for voice assistants */
  speakable?: string[]
}

export function SEOHead({
  title,
  description,
  canonicalUrl,
  ogType = "website",
  ogImage = "https://www.mizan.page/og-default.jpg",
  publishedTime,
  modifiedTime,
  keywords = [],
  schema,
  noindex = false,
  faq,
  breadcrumbs,
  speakable,
}: SEOHeadProps) {
  // قواعد العنوان (هدف 60، سقف 65، إسقاط العلامة قبل البتر، وإلحاقها إن كان
  // العنوان قصيراً) في shared/seo/meta-copy.js وهي نفسها التي ينفّذها
  // scripts/prerender.mjs. كانت نسخة مصغّرة هنا بعلامة مختلفة
  // (« | الميزان الرقمية») وسقف واحد، فكل صفحة تُفتح من الداخل كانت تُبدّل
  // عنوان الملف الثابت بنصّ آخر — والفرق بين النسختين يُقرأ عنواناً مكرراً.
  const fullTitle = fitTitle(title)

  // الصفحات التي لا تُفهرس تُعرَّف في سياسة الروابط وحدها، فلا تُنسى وسمها:
  // /search و/login و/profile و/pricing و/admin تُعلَّم noindex here حتى لو
  // مرّرها أحدهم indexable. nofollow مقصود مع noindex: لا إشارة نمرّرها من
  // صفحة لا تريد ظهورها، والوصل العامة تُكتَب في الصفحات المفهرسَة.
  const pathname =
    typeof window !== "undefined" && window.location?.pathname ? window.location.pathname : ""
  const doNotIndex = noindex || Boolean(pathname) && !isIndexablePath(pathname)

  const allKeywords = Array.from(
    new Set([...(DEFAULT_KEYWORDS || []), ...keywords])
  ).join(", ")

  const url = resolveCanonicalUrl(canonicalUrl)

  useEffect(() => {
    // Document Title
    document.title = fullTitle

    // Helper to set or update meta tag
    const setMeta = (
      name: string,
      content: string,
      attr: "name" | "property" = "name"
    ) => {
      let element = document.querySelector(`meta[${attr}="${name}"]`)
      if (!element) {
        element = document.createElement("meta")
        element.setAttribute(attr, name)
        document.head.appendChild(element)
      }
      element.setAttribute("content", content)
    }

    setMeta("description", description)
    setMeta("keywords", allKeywords)

    // Robots: التحكم بالفهرسة — AI-friendly
    setMeta(
      "robots",
      doNotIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    )

    // AI-specific meta
    if (!doNotIndex) {
      setMeta("ai-content-declaration", "ai-generated=false, ai-training=allowed, ai-input=allowed")
      setMeta("content-language", "ar-MA")
    }

    // OpenGraph — Enhanced for AI + Social
    setMeta("og:site_name", BRAND, "property")
    setMeta("og:title", fullTitle, "property")
    setMeta("og:description", description, "property")
    setMeta("og:type", ogType, "property")
    setMeta("og:url", url, "property")
    setMeta("og:image", ogImage, "property")
    setMeta("og:image:alt", title, "property")
    setMeta("og:locale", "ar_MA", "property")
    setMeta("og:locale:alternate", "fr_MA", "property")

    // Published/modified time for articles
    if (publishedTime && ogType === "article") {
      setMeta("article:published_time", publishedTime, "property")
      setMeta("article:author", BRAND, "property")
      setMeta("article:section", "القانون المغربي", "property")
    }
    if (modifiedTime && ogType === "article") {
      setMeta("article:modified_time", modifiedTime, "property")
    }

    // Twitter Card — Enhanced
    setMeta("twitter:card", "summary_large_image")
    setMeta("twitter:site", "@mizan_page")
    setMeta("twitter:creator", "@mizan_page")
    setMeta("twitter:title", fullTitle)
    setMeta("twitter:description", description)
    setMeta("twitter:image", ogImage)
    setMeta("twitter:image:alt", title)

    // Additional SEO
    setMeta("author", BRAND)
    setMeta("language", "ar")
    setMeta("geo.region", "MA")
    setMeta("geo.placename", "المغرب")

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement("link")
      canonical.setAttribute("rel", "canonical")
      document.head.appendChild(canonical)
    }
    canonical.setAttribute("href", url)

    // Preconnect for speed
    const addLink = (rel: string, href: string, extra?: Record<string, string>) => {
      if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return
      const link = document.createElement("link")
      link.setAttribute("rel", rel)
      link.setAttribute("href", href)
      if (extra) Object.entries(extra).forEach(([k, v]) => link.setAttribute(k, v))
      document.head.appendChild(link)
    }

    addLink("preconnect", "https://fonts.googleapis.com")
    addLink("preconnect", "https://www.googletagmanager.com")
  }, [
    fullTitle,
    description,
    allKeywords,
    url,
    ogType,
    ogImage,
    publishedTime,
    modifiedTime,
    doNotIndex,
  ])

  // --- E-E-A-T + AEO Schema Enrichment ---
  // النطاق من سياسة الروابط وحدها: أي حرف زائد (شرطة نهاية أو نطاق بلا www)
  // في @id أو url يجعل عقدة schema.org كياناً مختلفاً عن الكيان المفهرس.
  const domain = BASE_URL
  
  const publisherSchema = {
    "@type": "Organization",
    "@id": `${domain}/#organization`,
    name: BRAND,
    // نفس أسماء العلامة البديلة المنشورة في src/lib/seo/schema.ts
    // وSchemaOrg.tsx: عقدة #organization واحدة بأسماء واحدة في كل طبقة.
    alternateName: BRAND_ALTERNATE_NAMES,
    url: domain,
    logo: {
      "@type": "ImageObject",
      "@id": `${domain}/#logo`,
      url: `${domain}/logo-512.png`,
      contentUrl: `${domain}/logo-512.png`,
      width: 512,
      height: 512,
      caption: "ميزان الرقمية - شعار المنصة على بلاطة معتمة تظهر فوق الخلفية البيضاء",
    },
    image: {
      "@type": "ImageObject",
      url: `${domain}/og-image.png`,
      width: 1200,
      height: 630,
    },
    sameAs: [
      "https://www.instagram.com/mizan.page",
      "https://www.facebook.com/profile.php?id=61593607157317",
      "https://www.tiktok.com/@mizan_page",
      "https://www.pinterest.com/mohamedredayassinn/",
      "https://x.com/MIZANPAGE",
      "https://whatsapp.com/channel/0029Vb97ZZE23n3WE7R6Tf1m",
    ],
  }

  const authorSchema = {
    "@type": "Organization",
    name: "فريق ميزان الرقمية",
    url: domain,
  }

  // Build final schemas array for AI crawl + AEO
  let schemas: any[] = []

  // Always include Organization + Website for E-E-A-T and AI
  if (!doNotIndex) {
    schemas.push(generateOrganizationSchema())
    schemas.push(generateWebsiteSchema())
  }

  // Breadcrumb for AEO
  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        // الرابط القانوني المنمذج: «الرئيسية» كانت تمرَّر سابقاً كـ
        // https://www.mizan.page/ بشرطة نهاية فتختلف عن crumb الجذر في
        // بقية صفحات الموقع.
        item: toCanonicalUrl(item.url),
      })),
    })
  }

  // FAQ for AEO — critical for ChatGPT/Perplexity
  if (faq && faq.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    })
  }

  // Speakable for voice + AEO
  if (speakable && speakable.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: speakable,
      },
      url,
    })
  }

  // Main schema (Article/WebPage) with E-E-A-T
  let finalSchema = schema

  if (!finalSchema && !doNotIndex) {
    finalSchema = {
      "@context": "https://schema.org",
      "@type": ogType === "article" ? "Article" : "WebPage",
      name: title,
      headline: title,
      description: description,
      url: url,
      image: ogImage,
      publisher: publisherSchema,
      author: authorSchema,
      inLanguage: "ar-MA",
      isAccessibleForFree: true,
      ...(publishedTime && { datePublished: publishedTime }),
      ...(modifiedTime && { dateModified: modifiedTime }),
    }
  }

  if (finalSchema) {
    const ARTICLE_LIKE_TYPES = new Set([
      "Article",
      "TechArticle",
      "NewsArticle",
      "BlogPosting",
      "ScholarlyArticle",
      "EducationalResource",
    ])

    const enrichNode = (node: any) => {
      if (typeof node !== "object" || !node) return node
      if (!ARTICLE_LIKE_TYPES.has(node["@type"])) return node
      return {
        ...node,
        publisher: node.publisher || publisherSchema,
        author: node.author || authorSchema,
        inLanguage: node.inLanguage || "ar-MA",
        isAccessibleForFree: node.isAccessibleForFree ?? true,
        ...(publishedTime && !node.datePublished && { datePublished: publishedTime }),
        ...(modifiedTime && !node.dateModified && { dateModified: modifiedTime }),
      }
    }

    if (Array.isArray(finalSchema)) {
      schemas.push(...finalSchema.map(enrichNode))
    } else {
      schemas.push(enrichNode(finalSchema))
    }
  }

  return schemas.length > 0 ? <SchemaOrg schema={schemas} /> : null
}
