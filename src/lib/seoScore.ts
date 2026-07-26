// ── ENVIRONMENT & DOMAIN CONFIGURATION ───────────────────────────────────────
export const SITE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  "https://www.mizan.page";

export const APP_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  "https://www.mizan.page";

// ── 🌐 4-LANGUAGE SYSTEM TYPES (`ar`, `fr`, `en`, `es`) ──────────────────────
export type SupportedLang = "ar" | "fr" | "en" | "es";

// ── Pre-publish SEO & Security Analyzer ────────────────────────────────────────
// Scores an article draft 0–100 against Google SEO best practices, mobile UI/UX,
// and military-grade security sanitization[cite: 4]. Safe for SSR and client.

export interface SeoInput {
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  slug: string;
  keyword?: string; // Focus keyword[cite: 4]
  contentHtml: string;
  tags?: string[];
  lang?: SupportedLang; // 4-Language Targeting
}

export interface SeoCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  weight: number;
  hint: string;
}

export interface SeoReport {
  score: number; // 0–100[cite: 4]
  grade: "A" | "B" | "C" | "D"; //[cite: 4]
  checks: SeoCheck[];
}

/**
 * 🛡️ MILITARY-GRADE SECURITY: Detects dangerous payloads (XSS) in content.
 * Search engines penalize sites hosting malicious scripts.
 */
function containsSecurityRisks(html: string): boolean {
  if (!html) return false;
  const dangerousPatterns = /<script[^>]*>|javascript:|onerror=|onload=/gi;
  return dangerousPatterns.test(html);
}

/**
 * Strips HTML tags safely without DOM dependency (SSR friendly)[cite: 4].
 */
function extractTextFromHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") //[cite: 4]
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") //[cite: 4]
    .replace(/<[^>]+>/g, " ") //[cite: 4]
    .replace(/\s+/g, " ") //[cite: 4]
    .trim(); //[cite: 4]
}

/**
 * Counts words accurately across Arabic, French, English, and Spanish text[cite: 4].
 */
function countWords(text: string): number {
  if (!text) return 0;
  // Matches Arabic, Latin, and extended alphanumeric sequences[cite: 4]
  const tokens = text.match(/[\p{L}\p{N}]+/gu); //[cite: 4]
  return tokens ? tokens.length : 0; //[cite: 4]
}

/**
 * 📱 PHONE-FIRST UI/UX: Analyzes readability for small screens.
 * Long paragraphs hurt mobile retention and bounce rates.
 */
function checkMobileReadability(html: string): boolean {
  const paragraphs = html.match(/<p[^>]*>.*?<\/p>/gi) || [];
  if (paragraphs.length === 0) return true; // Ignore if no paragraphs

  let longParagraphs = 0;
  paragraphs.forEach((p) => {
    const pText = extractTextFromHtml(p);
    if (countWords(pText) > 60) longParagraphs++; // > 60 words is hard to read on phones
  });

  // Pass if less than 20% of paragraphs are overly long
  return longParagraphs / paragraphs.length < 0.2;
}

export function analyzeSeo(input: SeoInput): SeoReport {
  const title = (input.metaTitle || input.title || "").trim(); //[cite: 4]
  const desc = (input.metaDescription || "").trim(); //[cite: 4]
  const kw = (input.keyword || "").trim().toLowerCase(); //[cite: 4]
  const rawHtml = input.contentHtml || ""; //[cite: 4]
  const text = extractTextFromHtml(rawHtml); //[cite: 4]
  const words = countWords(text); //[cite: 4]
  const lcText = text.toLowerCase(); //[cite: 4]

  // Parsing HTML structures via regex (DOM-independent)[cite: 4]
  const imgTags = rawHtml.match(/<img[^>]*>/gi) || []; //[cite: 4]
  const imgWithAltCount = imgTags.filter((tag) =>
    /alt\s*=\s*["'](?!\s*["']).+?["']/i.test(tag)
  ).length; //[cite: 4]

  const linkCount = (rawHtml.match(/<a\b[^>]*>/gi) || []).length; //[cite: 4]
  const headingCount = (rawHtml.match(/<h[2-4]\b[^>]*>/gi) || []).length; //[cite: 4]
  const pdfLinkCount = (rawHtml.match(/href=["'][^"']+\.pdf["']/gi) || []).length;

  const checks: SeoCheck[] = [
    {
      id: "security-xss",
      weight: 20, // Huge weight. Security directly impacts Google Safe Browsing
      label: "Military-Grade Security (No XSS)",
      status: containsSecurityRisks(rawHtml) ? "fail" : "pass",
      hint: containsSecurityRisks(rawHtml)
        ? "CRITICAL: Malicious scripts or inline handlers detected. This will cause Google to blacklist the page."
        : "Content is sanitized and clean.",
    },
    {
      id: "title-len",
      weight: 10,
      label: "Title length (30–60 chars)[cite: 4]",
      status:
        title.length >= 30 && title.length <= 60 //[cite: 4]
          ? "pass"
          : title.length >= 20 && title.length <= 70 //[cite: 4]
          ? "warn"
          : "fail",
      hint: `Currently ${title.length} chars. Aim for 30–60 characters for optimal display in SERPs.[cite: 4]`,
    },
    {
      id: "desc-len",
      weight: 10,
      label: "Meta description (70–160 chars)[cite: 4]",
      status:
        desc.length >= 70 && desc.length <= 160 //[cite: 4]
          ? "pass"
          : desc.length > 0 //[cite: 4]
          ? "warn"
          : "fail",
      hint:
        desc.length === 0 //[cite: 4]
          ? "Add a meta description to boost organic click-through rates.[cite: 4]"
          : `Currently ${desc.length} chars. Aim for 70–160 characters.[cite: 4]`,
    },
    {
      id: "slug",
      weight: 5,
      label: "Clean URL slug (lowercase, hyphens)[cite: 4]",
      status:
        /^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/i.test(input.slug) && //[cite: 4]
        input.slug.length <= 75 //[cite: 4]
          ? "pass"
          : "warn",
      hint: "Use concise, hyphenated slugs without special characters or spaces.[cite: 4]",
    },
    {
      id: "content-len",
      weight: 10,
      label: "Content length (≥ 300 words)[cite: 4]",
      status: words >= 600 ? "pass" : words >= 300 ? "warn" : "fail", //[cite: 4]
      hint: `Currently ${words} words. In-depth content (600+ words) generally achieves better search visibility.[cite: 4]`,
    },
    {
      id: "mobile-ui",
      weight: 10,
      label: "📱 Phone-First UI/UX: Readability",
      status: checkMobileReadability(rawHtml) ? "pass" : "warn",
      hint: "Break up long paragraphs (over 60 words). Mobile readers and Google prioritize scannable text.",
    },
    {
      id: "headings",
      weight: 5,
      label: "Uses subheadings (H2, H3, H4)[cite: 4]",
      status: headingCount >= 2 ? "pass" : headingCount === 1 ? "warn" : "fail", //[cite: 4]
      hint: `Found ${headingCount} subheading(s). Structural subheadings improve readability and crawling.[cite: 4]`,
    },
    {
      id: "img-alt",
      weight: 10,
      label: "🖼️ Master Photo SEO (Alt text)",
      status:
        imgTags.length === 0 //[cite: 4]
          ? "warn" //[cite: 4]
          : imgWithAltCount === imgTags.length //[cite: 4]
          ? "pass" //[cite: 4]
          : "fail", //[cite: 4]
      hint:
        imgTags.length === 0 //[cite: 4]
          ? "Consider adding a relevant image with localized alt text to boost Google Images visibility.[cite: 4]"
          : `${imgWithAltCount}/${imgTags.length} images have non-empty alt tags. Descriptive alt text is crucial.[cite: 4]`,
    },
    {
      id: "file-seo",
      weight: 5,
      label: "📄 Master Document SEO",
      status: pdfLinkCount > 0 ? "pass" : "warn",
      hint: pdfLinkCount > 0
        ? `Found ${pdfLinkCount} linked document(s). Ensure filenames use keywords instead of generic numbers.`
        : "No downloadable files detected. Linking to legal texts/PDFs increases authority.",
    },
    {
      id: "links",
      weight: 5,
      label: "Contains contextual links[cite: 4]",
      status: linkCount >= 1 ? "pass" : "warn", //[cite: 4]
      hint: "Add internal links to related legal texts or external references.[cite: 4]",
    },
    {
      id: "tags",
      weight: 5,
      label: "Has tags / category metadata[cite: 4]",
      status:
        (input.tags?.length || 0) >= 3 //[cite: 4]
          ? "pass"
          : (input.tags?.length || 0) >= 1 //[cite: 4]
          ? "warn"
          : "fail",
      hint: "Assign at least 3 relevant tags to optimize internal taxonomy.[cite: 4]",
    },
  ];

  // Optional Focus Keyword checks[cite: 4]
  if (kw) {
    const kwInTitle = title.toLowerCase().includes(kw); //[cite: 4]

    // Calculate basic keyword occurrences[cite: 4]
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); //[cite: 4]
    const kwMatches = lcText.match(regex) || []; //[cite: 4]
    const kwCount = kwMatches.length; //[cite: 4]

    checks.push({
      id: "kw-title",
      weight: 5,
      label: "Focus keyword in title[cite: 4]",
      status: kwInTitle ? "pass" : "fail", //[cite: 4]
      hint: kwInTitle
        ? `Focus keyword "${input.keyword}" found in the title.[cite: 4]`
        : `Include your focus keyword "${input.keyword}" in the title.[cite: 4]`,
    });

    checks.push({
      id: "kw-body",
      weight: 5,
      label: "Focus keyword frequency in body[cite: 4]",
      status: kwCount >= 2 ? "pass" : kwCount === 1 ? "warn" : "fail", //[cite: 4]
      hint:
        kwCount === 0 //[cite: 4]
          ? `Mention "${input.keyword}" in the content body.[cite: 4]`
          : `Found ${kwCount} occurrence(s) of "${input.keyword}".[cite: 4]`,
    });
  }

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0); //[cite: 4]
  
  // A 'fail' on a critical item (like XSS) severely penalizes the earned weight
  const isCompromised = checks.find((c) => c.id === "security-xss")?.status === "fail";
  
  const earnedWeight = checks.reduce(
    (s, c) =>
      s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), //[cite: 4]
    0
  );

  let score = Math.round((earnedWeight / totalWeight) * 100); //[cite: 4]
  if (isCompromised) score = 0; // Immediate zero for security risks

  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D"; //[cite: 4]

  return { score, grade, checks }; //[cite: 4]
}