import { SEOHead } from "./SEOHead"

/**
 * AEOHead — Answer Engine Optimization
 * Optimized for ChatGPT, Perplexity, Claude, Google AI Overviews, Bing Chat
 * 
 * AEO principles:
 * - Direct answer at top (40-60 words)
 * - FAQ schema for Q&A
 * - Breadcrumb for navigation
 * - Speakable for voice
 * - Clear H1/H2 structure
 * - Bullet points, concise summaries
 */

export interface AEOHeadProps {
  title: string
  description: string
  canonicalUrl?: string
  ogType?: "website" | "article"
  ogImage?: string
  publishedTime?: string
  modifiedTime?: string
  keywords?: string[]
  schema?: Record<string, any> | Record<string, any>[]
  noindex?: boolean
  // AEO specific
  directAnswer?: string // 40-60 words direct answer for AI
  faq?: { question: string; answer: string }[]
  breadcrumbs?: { name: string; url: string }[]
  howTo?: { steps: { name: string; text: string }[]; totalTime?: string }
  speakableSelectors?: string[]
}

export function AEOHead({
  title,
  description,
  canonicalUrl,
  ogType = "website",
  ogImage,
  publishedTime,
  modifiedTime,
  keywords = [],
  schema: extraSchema,
  noindex = false,
  directAnswer,
  faq = [],
  breadcrumbs = [],
  howTo,
  speakableSelectors = ["h1", ".lead", ".direct-answer"],
}: AEOHeadProps) {
  // Build enhanced description with direct answer for AEO
  const enhancedDescription = directAnswer
    ? `${directAnswer} ${description}`.slice(0, 160)
    : description

  // Build schemas
  const schemas: any[] = []
  if (extraSchema) {
    if (Array.isArray(extraSchema)) schemas.push(...extraSchema)
    else schemas.push(extraSchema)
  }

  // HowTo schema for AEO (e.g., "كيف تكتب مقال قانوني")
  if (howTo) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: title,
      description,
      totalTime: howTo.totalTime || "PT10M",
      step: howTo.steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
      inLanguage: "ar-MA",
    })
  }

  return (
    <SEOHead
      title={title}
      description={enhancedDescription}
      canonicalUrl={canonicalUrl}
      ogType={ogType}
      ogImage={ogImage}
      publishedTime={publishedTime}
      modifiedTime={modifiedTime}
      keywords={keywords}
      faq={faq}
      breadcrumbs={breadcrumbs}
      speakable={speakableSelectors}
      schema={schemas}
      noindex={noindex}
    />
  )
}

// AEO Content Wrapper — ensures direct answer at top
export function AEOContent({
  directAnswer,
  children,
}: {
  directAnswer?: string
  children: React.ReactNode
}) {
  return (
    <>
      {directAnswer && (
        <div className="direct-answer sr-only" aria-label="إجابة مباشرة">
          {directAnswer}
        </div>
      )}
      {children}
    </>
  )
}

// FAQ component with AEO schema
export function FAQSection({
  faqs,
}: {
  faqs: { question: string; answer: string }[]
}) {
  return (
    <section className="faq-section mt-12" aria-label="أسئلة شائعة">
      <h2 className="text-xl font-bold mb-4">أسئلة شائعة</h2>
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="faq-item border rounded-lg p-4">
            <h3 className="font-bold text-foreground">{faq.question}</h3>
            <p className="mt-2 text-muted-foreground leading-7">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
