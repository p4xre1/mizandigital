export interface SchemaOrgProps {
  schema: Record<string, any> | Record<string, any>[]
}

/**
 * Enhanced SchemaOrg with security escaping + AEO optimization
 * - Escapes </script> to prevent XSS via JSON-LD injection
 * - Supports multiple schemas (array)
 * - Optimized for AI crawlers (ChatGPT, Perplexity, Claude) and AEO
 */
function escapeJsonLd(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

export function SchemaOrg({ schema }: SchemaOrgProps) {
  if (!schema || (Array.isArray(schema) && schema.length === 0)) {
    return null
  }

  const json = JSON.stringify(schema)
  const escaped = escapeJsonLd(json)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escaped }}
    />
  )
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
    name: "ميزان الرقمية",
    alternateName: "Mizan Digital",
    url: "https://www.mizan.page",
    logo: "https://www.mizan.page/icon-512.png",
    description:
      "منصة مغربية للمعرفة القانونية: مقالات، أخبار تشريعية، قاموس قانوني (250 مصطلح)، دليل كليات الحقوق (21 كلية)، ملخصات S1-S6، واختبارات قانونية.",
    sameAs: [
      "https://www.instagram.com/mizan.page",
      "https://www.facebook.com/mizan.page",
      "https://www.tiktok.com/@mizan_page",
      "https://www.pinterest.com/mizan.page",
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
