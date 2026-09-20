// /workspaces/mizandigital/src/lib/seo/schema.ts
import { jsonLdProps } from "./jsonLd"
import { BASE_URL, canonicalUrl } from "../canonical"
import { BRAND, BRAND_ALTERNATE_NAMES } from "../../../shared/seo/meta-copy.js"

/**
 * إعدادات الموقع. النطاق لم يُترك سلسلة مكتوبة باليد: جاء من سياسة الروابط
 * (shared/seo/url-policy.js) وإلا انقسم الموقع على نطاقين في البيانات
 * المهيكلة (mizan.page مقابل www.mizan.page) وهو أخطر على الفهرسة من شرطة
 * نهاية زائدة.
 *
 * والاسم كذلك لم يُترك مكتوباً هنا: كان «منصة الميزان الرقمية» بينما
 * <title> وog:site_name يقولان «ميزان الرقمية»، فقرأ تدقيق GEO تسميتين
 * لكيان واحد (Brand Consistency). الآن تُقرأ العلامة وأسماؤها البديلة من
 * shared/seo/meta-copy.js — المصدر نفسه الذي يبني العناوين.
 */
export const SITE_CONFIG = {
  name: BRAND,
  altName: BRAND_ALTERNATE_NAMES,
  url: BASE_URL,
  /*
   * شعار يُقرأ في البيانات المهيكلة (Organization.logo): PNG مربّع معتّم 512×512
   * لا SVG — سياسة Google للأيقونات لا تذكر SVG ضمن الصيغ المدعومة، وتطلب صورة
   * تبدو صحيحة على خلفية بيضاء بحدّ أدنى 112×112. ملف public/Logo.svg يبقى
   * أيقونة المتصفح في index.html؛ هذا الحقل للزواحف وحدها.
   */
  logo: canonicalUrl("/logo-512.png"),
  logoWidth: 512,
  logoHeight: 512,
  defaultImage: canonicalUrl("/og-default.jpg"),
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
      // contentUrl + الأبعاد صراحةً: بعض القارئات لا تستنتجها من url وحده،
      // وغياب width/height كان يُسقط العقدة من فحص Rich Results.
      contentUrl: SITE_CONFIG.logo,
      width: SITE_CONFIG.logoWidth,
      height: SITE_CONFIG.logoHeight,
      caption: SITE_CONFIG.name,
    },
    image: SITE_CONFIG.defaultImage,
    sameAs: [
      "https://www.instagram.com/mizan.page",
      "https://www.facebook.com/profile.php?id=61593607157317",
      "https://www.tiktok.com/@mizan_page",
      "https://www.pinterest.com/mohamedredayassinn/",
      "https://x.com/MIZANPAGE",
      "https://whatsapp.com/channel/0029Vb97ZZE23n3WE7R6Tf1m",
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
    url: article.url,
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
    // التوقيع الفردي يُنشَر كـ Person (وهو ما تطلبه وثائق NewsArticle)،
    // وعند غياب اسم كاتب حقيقي تبقى العقدة كيان التحرير نفسه بدل لفّ اسم
    // الموقع في قالب Person وهو ليس شخصاً.
    author:
      article.authorName && article.authorName !== SITE_CONFIG.name
        ? { "@type": "Person", name: article.authorName }
        : {
            "@type": "Organization",
            name: SITE_CONFIG.name,
            url: SITE_CONFIG.url,
          },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
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
      // canonicalUrl() توحّد النطاق وتحذف شرطة النهاية والمعاملات: crumbs
      // كانت تُكتب تارةً «https://www.mizan.page/» وتارةً «/» فتختلف نسخة
      // الجذر نفسها بين صفحة وأخرى.
      item: canonicalUrl(item.url),
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
/**
 * 9. مخطط مصطلح المعجم (DefinedTerm Schema)
 *
 * تُربط الصفحة بمجموعة التعريف عبر inDefinedTermSet الكامل (لا مجرد @id)،
 * ليقرأها محرك البحث — ووكلاء الذكاء الاصطناعي — كمصطلح من قاموس معروف
 * النطاق، لا كتعريف معزول. حقل url مطابق تماماً لرابط canonical.
 */
export interface DefinedTermInput {
  termAr: string
  termFr?: string | null
  definition: string
  category?: string | null
  canonical: string
  sourceReferences?: string[]
}

export function generateDefinedTermSchema(input: DefinedTermInput) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${input.canonical}#term`,
    name: input.termAr,
    alternateName: input.termFr || undefined,
    description: input.definition,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "القاموس القانوني المغربي",
      url: canonicalUrl("/lexicon"),
    },
    url: input.canonical,
    // sourceReference تُبقي الإحالة التشريعية داخل البيانات المهيكلة فتظهر
    // في مقتطفات المحركات التوليدية مع مصدرها.
    citation: input.sourceReferences?.length
      ? input.sourceReferences.map((reference) => ({
          "@type": "CreativeWork",
          name: reference,
        }))
      : undefined,
    inLanguage: SITE_CONFIG.inLanguage,
  }
}

/**
 * 10. مخطط الخبر (NewsArticle Schema)
 *
 * الأخبار كانت تحمل مخطط Article العام، فيفقد Google datePublished
 * و dateModified وسياق «الأخبار العاجلة» (و هو ما يلزم لـ Top Stories).
 * النوع NewsArticle يُنتج من نفس مدخلات Article مع التاريخين الإلزاميين.
 */
export function generateNewsArticleSchema(article: SchemaArticleInput) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${article.url}#newsarticle`,
    // url = الرابط القانوني للصفحة نفسها. بدونه يفقد Google/GPT السياق الذي
    // يربط العقدة بالعنوان المفهرس، فيُقرأ الخبر بلا مصدر قابل للنقر.
    url: article.url,
    headline: article.title,
    description: article.description,
    inLanguage: SITE_CONFIG.inLanguage,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.url,
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    // توقيع فردي إن وُجد، وكيان التحرير عند غيابه — لا Person وهمي.
    author:
      article.authorName && article.authorName !== SITE_CONFIG.name
        ? { "@type": "Person", name: article.authorName }
        : {
            "@type": "Organization",
            name: SITE_CONFIG.name,
            url: SITE_CONFIG.url,
          },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
      logo: {
        "@type": "ImageObject",
        url: SITE_CONFIG.logo,
      },
    },
    image: article.image || SITE_CONFIG.defaultImage,
    isAccessibleForFree: true,
  }
}

/**
 * 11. مخطط مؤسسة تعليمية لصفحة كلية (EducationalOrganization Schema)
 *
 * الفرق الجوهري عن النسخة السابقة: حقل url صار دائماً رابط الصفحة على
 * ميزان. كان الموقع يضع الرابط الرسمي للكلية في url، فتُقرأ عقدة
 * الكيان على أنها تتكلم عن موقع الجامعة لا عن هذه الصفحة، وتنقطع
 * سلسلة mainEntity ↔ WebPage. الموقع الرسمي يُنشر في sameAs، وهو
 * موضعه الصحيح.
 */
export interface FacultySchemaInput {
  name: string
  nameFr?: string | null
  description?: string | null
  canonical: string
  city?: string | null
  university?: string | null
  officialUrl?: string | null
  foundedYear?: string | number | null
  image?: string | null
}

export function generateFacultySchema(input: FacultySchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${input.canonical}#organization`,
    name: input.name,
    alternateName: input.nameFr || undefined,
    description: input.description || undefined,
    url: input.canonical,
    image: input.image || SITE_CONFIG.defaultImage,
    foundingDate: input.foundedYear ? String(input.foundedYear) : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: input.city || "المغرب",
      addressCountry: SITE_CONFIG.country,
    },
    parentOrganization: input.university
      ? { "@type": "CollegeOrUniversity", name: input.university }
      : undefined,
    // الموقع الرسمي للمؤسسة: sameAs لا url — الرابط القانوني للصفحة يبقى في url.
    sameAs: input.officialUrl || undefined,
    inLanguage: SITE_CONFIG.inLanguage,
  }
}
