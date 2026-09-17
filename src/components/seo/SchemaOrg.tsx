import { jsonLdProps } from "@/lib/seo/jsonLd"

export interface SchemaOrgProps {
  schema: Record<string, any> | Record<string, any>[]
}

/**
 * Enhanced SchemaOrg with security escaping + AEO optimization
 * - Escapes </script> to prevent XSS via JSON-LD injection
 * - Supports multiple schemas (array)
 * - Optimized for AI crawlers (ChatGPT, Perplexity, Claude) and AEO
 */
export function SchemaOrg({ schema }: SchemaOrgProps) {
  if (!schema || (Array.isArray(schema) && schema.length === 0)) {
    return null
  }

  // الهرّب في jsonLdProps — لا نكرّره هنا حتى لا تتباعد النسخ.
  return <script {...jsonLdProps(schema)} />
}

// AEO helpers — Answer Engine Optimization
export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
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

export function generateArticleSchema({
  title,
  description,
  url,
  image,
  publishedTime,
  modifiedTime,
  author = "فريق ميزان الرقمية",
}: {
  title: string
  description: string
  url: string
  image?: string
  publishedTime?: string
  modifiedTime?: string
  author?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: image || "https://www.mizan.page/og-default.jpg",
    author: {
      "@type": "Organization",
      name: author,
      url: "https://www.mizan.page",
    },
    publisher: {
      "@type": "Organization",
      name: "ميزان الرقمية",
      url: "https://www.mizan.page",
      logo: {
        "@type": "ImageObject",
        url: "https://www.mizan.page/icon-512.png",
      },
    },
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    inLanguage: "ar-MA",
    isAccessibleForFree: true,
  }
}

export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": "https://www.mizan.page/#organization",
    name: "ميزان الرقمية",
    alternateName: ["Mizan Digital", "Mizan.page", "منصة الميزان الرقمية"],
    url: "https://www.mizan.page",
    logo: {
      "@type": "ImageObject",
      "@id": "https://www.mizan.page/#logo",
      url: "https://www.mizan.page/logo-white-512.png",
      contentUrl: "https://www.mizan.page/logo-white-512.png",
      width: 512,
      height: 512,
      caption: "ميزان الرقمية - شعار المنصة بخلفية بيضاء",
    },
    image: {
      "@type": "ImageObject",
      url: "https://www.mizan.page/og-image.png",
      width: 1200,
      height: 630,
    },
    description:
      "منصة مغربية للمعرفة القانونية، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك: ملخصات S1-S6، قاموس قانوني 250 مصطلح عربي-فرنسي، دليل كليات الحقوق 21 كلية FSJES، مقالات تحليلية، أخبار تشريعية واختبارات QCM لطلبة القانون بالمغرب.",
    slogan: "المعرفة القانونية للطلبة",
    foundingDate: "2024",
    areaServed: { "@type": "Country", name: "Morocco" },
    knowsLanguage: ["ar", "ar-MA", "fr"],
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
      addressCountry: "MA",
      addressLocality: "المغرب",
    },
    inLanguage: "ar-MA",
  }
}

export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ميزان الرقمية",
    alternateName: "Mizan Digital",
    url: "https://www.mizan.page",
    description:
      "منصة مغربية للمعرفة القانونية لطلبة كليات الحقوق: ملخصات، مقالات، أخبار تشريعية، قاموس قانوني، دليل كليات، واختبارات.",
    inLanguage: "ar-MA",
    publisher: generateOrganizationSchema(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.mizan.page/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  }
}

export function generateQuizSchema({
  name,
  description,
  url,
  questionCount,
}: {
  name: string
  description: string
  url: string
  questionCount: number
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name,
    description,
    url,
    educationalLevel: "University",
    inLanguage: "ar-MA",
    numberOfQuestions: questionCount,
    isAccessibleForFree: true,
    provider: generateOrganizationSchema(),
  }
}
