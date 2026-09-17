// /workspaces/mizandigital/src/lib/seo/schema.ts
import { jsonLdProps } from "./jsonLd"

export const SITE_CONFIG = {
  name: "منصة الميزان الرقمية",
  altName: "الميزان الرقمي - Mizan Digital",
  url: "https://www.mizan.page",
  logo: "https://www.mizan.page/Logo.svg",
  defaultImage: "https://www.mizan.page/og-default.jpg",
  inLanguage: "ar-MA",
  country: "MA",
}

export interface SchemaArticleInput {
  title: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  authorName?: string
  image?: string
  keywords?: string[]
  wordCount?: number
  articleCategory?: "Legislation" | "Analysis" | "Exam" | "General"
}

export interface BreadcrumbItemInput {
  name: string
  url: string
}

export interface FAQItemInput {
  question: string
  answer: string
}

export interface EducationalResourceInput {
  title: string
  description: string
  url: string
  educationalLevel?: string
  subject?: string
  datePublished?: string
}

/**
 * 1. مخطط المؤسسة الأكاديمية/التعليمية (Organization Schema)
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${SITE_CONFIG.url}/#organization`,
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.altName,
    url: SITE_CONFIG.url,
    logo: {
      "@type": "ImageObject",
      url: SITE_CONFIG.logo,
      caption: SITE_CONFIG.name,
    },
    image: SITE_CONFIG.defaultImage,
    sameAs: [
      "https://www.instagram.com/mizan.page",
      "https://www.facebook.com/mizan.page",
      "https://www.tiktok.com/@mizan_page",
      "https://www.pinterest.com/mizan.page",
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: SITE_CONFIG.country,
    },
  }
}

/**
 * 2. مخطط الموقع الرئيسي وصندوق البحث (WebSite & Sitelinks SearchBox Schema)
 */
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_CONFIG.url}/#website`,
    url: SITE_CONFIG.url,
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.altName,
    inLanguage: SITE_CONFIG.inLanguage,
    publisher: {
      "@id": `${SITE_CONFIG.url}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

/**
 * 3. مخطط المقالات والدراسات القانونية (Article & TechArticle Schema)
 */
export function generateArticleSchema(article: SchemaArticleInput) {
  const isLegal = article.articleCategory === "Legislation" || article.articleCategory === "Analysis"

  return {
    "@context": "https://schema.org",
    "@type": isLegal ? "TechArticle" : "Article",
    "@id": `${article.url}/#article`,
    headline: article.title,
    description: article.description,
    inLanguage: SITE_CONFIG.inLanguage,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.url,
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    wordCount: article.wordCount,
    keywords: article.keywords ? article.keywords.join(", ") : undefined,
    author: {
      "@type": "Organization",
      name: article.authorName || SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      logo: {
        "@type": "ImageObject",
        url: SITE_CONFIG.logo,
      },
    },
    image: article.image || SITE_CONFIG.defaultImage,
  }
}

/**
 * 4. مخطط مسار التنقل (BreadcrumbList Schema)
 */
export function generateBreadcrumbSchema(items: BreadcrumbItemInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_CONFIG.url}${item.url}`,
    })),
  }
}

/**
 * 5. مخطط الأسئلة الشائعة والتعليمية (FAQPage Schema)
 */
export function generateFAQSchema(faqs: FAQItemInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

/**
 * 6. مخطط الموارد التعليمية والامتحانات الأكاديمية (EducationalResource Schema)
 */
export function generateEducationalResourceSchema(resource: EducationalResourceInput) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalResource",
    name: resource.title,
    description: resource.description,
    url: resource.url,
    inLanguage: SITE_CONFIG.inLanguage,
    educationalLevel: resource.educationalLevel || "جامعي - كلية الحقوق (FSJES)",
    about: resource.subject || "القانون المغربي",
    dateCreated: resource.datePublished,
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  }
}

/**
 * 7. مخطط الجهة التعليمية (EducationalOrganization Schema)
 * يُستخدم على الصفحة الرئيسية وصفحة "من نحن" لتعزيز إشارات E-E-A-T.
 *
 * كان النوع هنا `LegalService` فصُحِّح إلى `EducationalOrganization` لسببين:
 *   1) قانوني — المادة 2 من القانون رقم 28.08 المتعلق بمهنة المحاماة تقصر
 *      ممارسة المهنة ومهامها، ومنها تقديم الاستشارات في الميدان القانوني
 *      (البند 5)، على المحامين المقيدين بجدول الهيئات. والمنصة يديرها طالب
 *      قانون لا محامٍ، فالإعلان عن نفسنا «خدمة قانونية» في البيانات المهيكلة
 *      إشارة لا نريدها ولا تستند إلى أساس.
 *   2) تجاري — لم يعُد نموذج التشغيل مجانياً بالكامل؛ صار فيه اشتراك ميزان برو وحزم
 *      كريدتس، فـ priceRange «مجاني» بيان غير مطابق للواقع.
 */
export function generateLegalServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${SITE_CONFIG.url}/#legalservice`,
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.altName,
    url: SITE_CONFIG.url,
    image: SITE_CONFIG.defaultImage,
    description:
      "منصة مغربية تعليمية للمعرفة القانونية، تقدّم مقالات ومعجماً قانونياً وأرشيفاً دراسياً لطلبة القانون والمهتمين بالقانون المغربي. محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك. لا تقدم المنصة استشارات قانونية فردية وليست مكتب محاماة.",
    areaServed: {
      "@type": "Country",
      name: "المغرب",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: SITE_CONFIG.country,
    },
    // صريح بدل «مجاني»: الأساسي مجاني وأعلى اشتراك 399 درهم سنوياً.
    priceRange: "0-399 MAD",
    knowsLanguage: ["ar", "fr"],
    parentOrganization: {
      "@id": `${SITE_CONFIG.url}/#organization`,
    },
    // الإفصاح عن هوية من يقف وراء المنصة دعمٌ للشفافية ولإشارات E-E-A-T،
    // وتأكيدٌ صريح على أن الصفة طالب قانون لا محامٍ ممارس.
    founder: {
      "@type": "Person",
      name: "محمد رضا ياسين",
      address: { "@type": "PostalAddress", addressLocality: "طنجة", addressCountry: "MA" },
      description:
        "طالب بالسنة الثالثة من سلك الإجازة في القانون الخاص بالمغرب. ليس محامياً مقيّداً ولا يقدّم استشارات قانونية.",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "الموارد القانونية التعليمية",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "معجم قانوني ثنائي اللغة" }, price: "0", priceCurrency: "MAD" },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "أرشيف دراسي حسب الفصول (S1-S6)" }, price: "0", priceCurrency: "MAD" },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "مقالات ومستجدات تشريعية وقضائية" }, price: "0", priceCurrency: "MAD" },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "اشتراك ميزان برو الشهري" }, price: "49", priceCurrency: "MAD" },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "اشتراك ميزان برو السنوي" }, price: "399", priceCurrency: "MAD" },
      ],
    },
  }
}

/**
 * 8. دالة مساعدة لحقن البيانات المهيكلة في عناصر JSX
 */
export function renderSchemaScript(schemaData: Record<string, unknown> | Array<Record<string, unknown>>) {
  // كان هنا `JSON.stringify(schemaData)` خاماً داخل dangerouslySetInnerHTML:
  // أي حقل من نظام إدارة المحتوى يحوي `</script>` كان يكسر الوسم ويفتح XSS.
  // صار يمرّ عبر jsonLdProps المهرِّب.
  return jsonLdProps(schemaData)
}