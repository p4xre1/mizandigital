import { useEffect } from "react"
import { DEFAULT_KEYWORDS } from "../../lib/seo/keywords"
import { SchemaOrg, generateOrganizationSchema, generateWebsiteSchema } from "./SchemaOrg"

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
  const fullTitle = `${title} | الميزان الرقمية`

  const allKeywords = Array.from(
    new Set([...(DEFAULT_KEYWORDS || []), ...keywords])
  ).join(", ")

  const url =
    canonicalUrl ||
    (typeof window !== "undefined"
      ? window.location.href
      : "https://www.mizan.page")

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
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    )

    // AI-specific meta
    if (!noindex) {
      setMeta("ai-content-declaration", "ai-generated=false, ai-training=allowed, ai-input=allowed")
      setMeta("content-language", "ar-MA")
    }

    // OpenGraph — Enhanced for AI + Social
    setMeta("og:site_name", "ميزان الرقمية", "property")
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
      setMeta("article:author", "ميزان الرقمية", "property")
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
    setMeta("author", "ميزان الرقمية")
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
    noindex,
  ])

  // --- E-E-A-T + AEO Schema Enrichment ---
  const domain = "https://www.mizan.page"
  
  const publisherSchema = {
    "@type": "Organization",
    name: "ميزان الرقمية",
    url: domain,
    logo: {
      "@type": "ImageObject",
      url: `${domain}/icon-512.png`,
    },
    sameAs: [
      "https://www.instagram.com/mizan.page",
      "https://www.facebook.com/mizan.page",
      "https://www.tiktok.com/@mizan_page",
      "https://www.pinterest.com/mizan.page",
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
  if (!noindex) {
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
        item: item.url,
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

  if (!finalSchema && !noindex) {
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
