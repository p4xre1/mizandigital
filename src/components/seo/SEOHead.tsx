import { useEffect } from "react"
import { DEFAULT_KEYWORDS } from "../../lib/seo/keywords"
import { SchemaOrg } from "./SchemaOrg"

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

    // Robots: التحكم بالفهرسة
    setMeta(
      "robots",
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"
    )

    // OpenGraph
    setMeta("og:site_name", "ميزان الرقمية", "property")
    setMeta("og:title", fullTitle, "property")
    setMeta("og:description", description, "property")
    setMeta("og:type", ogType, "property")
    setMeta("og:url", url, "property")
    setMeta("og:image", ogImage, "property")
    setMeta("og:locale", "ar_MA", "property")

    // Published/modified time for articles
    if (publishedTime && ogType === "article") {
      setMeta("article:published_time", publishedTime, "property")
    }
    if (modifiedTime && ogType === "article") {
      setMeta("article:modified_time", modifiedTime, "property")
    }

    // Twitter Card
    setMeta("twitter:card", "summary_large_image")
    setMeta("twitter:title", fullTitle)
    setMeta("twitter:description", description)
    setMeta("twitter:image", ogImage)

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement("link")
      canonical.setAttribute("rel", "canonical")
      document.head.appendChild(canonical)
    }
    canonical.setAttribute("href", url)
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

  // --- E-E-A-T Schema Enrichment (Fixes AI Audit Warnings) ---
  const domain = "https://www.mizan.page"
  
  const publisherSchema = {
    "@type": "Organization",
    name: "ميزان الرقمية",
    url: domain,
    logo: {
      "@type": "ImageObject",
      url: `${domain}/icon-512.png`
    },
    sameAs: [
      "https://github.com/mizan-page",
      "https://www.wikidata.org/wiki/Q12500000" // Replace with actual Wikidata/Social links when available
    ]
  }

  const authorSchema = {
    "@type": "Organization",
    name: "فريق ميزان الرقمية",
    url: domain
  }

  let finalSchema = schema

  // If no schema is passed at all, generate a baseline WebPage or Article schema
  if (!finalSchema && !noindex) {
    finalSchema = {
      "@context": "https://schema.org",
      "@type": ogType === "article" ? "Article" : "WebPage",
      name: title,
      description: description,
      url: url,
      publisher: publisherSchema,
      author: authorSchema,
      ...(publishedTime && { datePublished: publishedTime }),
      ...(modifiedTime && { dateModified: modifiedTime })
    }
  } else if (finalSchema) {
    // If a schema is passed, auto-inject missing E-E-A-T signals
    const enrichNode = (node: any) => {
      if (typeof node !== 'object' || !node) return node
      return {
        ...node,
        publisher: node.publisher || publisherSchema,
        author: node.author || authorSchema,
        ...(publishedTime && !node.datePublished && { datePublished: publishedTime }),
        ...(modifiedTime && !node.dateModified && { dateModified: modifiedTime }),
      }
    }

    if (Array.isArray(finalSchema)) {
      finalSchema = finalSchema.map(enrichNode)
    } else {
      finalSchema = enrichNode(finalSchema)
    }
  }

  return finalSchema ? <SchemaOrg schema={finalSchema} /> : null
}