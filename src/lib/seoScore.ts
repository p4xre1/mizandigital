// ── Pre-publish SEO analyzer ────────────────────────────────────────────────────
// Scores an article draft 0–100 against on-page SEO best practices and returns
// an actionable checklist. Purely heuristic — a green score is guidance, not a
// guarantee of ranking. Safe for both SSR and client environments.

export interface SeoInput {
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  slug: string;
  keyword?: string; // focus keyword
  contentHtml: string;
  tags?: string[];
}

export interface SeoCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  weight: number;
  hint: string;
}

export interface SeoReport {
  score: number; // 0–100
  grade: "A" | "B" | "C" | "D";
  checks: SeoCheck[];
}

/**
 * Strips HTML tags safely without DOM dependency (SSR friendly).
 */
function extractTextFromHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Counts words accurately across Arabic, French, and English text.
 */
function countWords(text: string): number {
  if (!text) return 0;
  // Matches Arabic, Latin, and extended alphanumeric sequences
  const tokens = text.match(/[\p{L}\p{N}]+/gu);
  return tokens ? tokens.length : 0;
}

export function analyzeSeo(input: SeoInput): SeoReport {
  const title = (input.metaTitle || input.title || "").trim();
  const desc = (input.metaDescription || "").trim();
  const kw = (input.keyword || "").trim().toLowerCase();
  const rawHtml = input.contentHtml || "";
  const text = extractTextFromHtml(rawHtml);
  const words = countWords(text);
  const lcText = text.toLowerCase();

  // Parsing HTML structures via regex (DOM-independent)
  const imgTags = rawHtml.match(/<img[^>]*>/gi) || [];
  const imgWithAltCount = imgTags.filter((tag) =>
    /alt\s*=\s*["'](?!\s*["']).+?["']/i.test(tag)
  ).length;

  const linkCount = (rawHtml.match(/<a\b[^>]*>/gi) || []).length;
  const headingCount = (rawHtml.match(/<h[2-4]\b[^>]*>/gi) || []).length;

  const checks: SeoCheck[] = [
    {
      id: "title-len",
      weight: 15,
      label: "Title length (30–60 chars)",
      status:
        title.length >= 30 && title.length <= 60
          ? "pass"
          : title.length >= 20 && title.length <= 70
          ? "warn"
          : "fail",
      hint: `Currently ${title.length} chars. Aim for 30–60 characters for optimal display in SERPs.`,
    },
    {
      id: "desc-len",
      weight: 15,
      label: "Meta description (70–160 chars)",
      status:
        desc.length >= 70 && desc.length <= 160
          ? "pass"
          : desc.length > 0
          ? "warn"
          : "fail",
      hint:
        desc.length === 0
          ? "Add a meta description to boost organic click-through rates."
          : `Currently ${desc.length} chars. Aim for 70–160 characters.`,
    },
    {
      id: "slug",
      weight: 8,
      label: "Clean URL slug (lowercase, hyphens)",
      status:
        /^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/i.test(input.slug) &&
        input.slug.length <= 75
          ? "pass"
          : "warn",
      hint: "Use concise, hyphenated slugs without special characters or spaces.",
    },
    {
      id: "content-len",
      weight: 20,
      label: "Content length (≥ 300 words)",
      status: words >= 600 ? "pass" : words >= 300 ? "warn" : "fail",
      hint: `Currently ${words} words. In-depth content (600+ words) generally achieves better search visibility.`,
    },
    {
      id: "headings",
      weight: 10,
      label: "Uses subheadings (H2, H3, H4)",
      status: headingCount >= 2 ? "pass" : headingCount === 1 ? "warn" : "fail",
      hint: `Found ${headingCount} subheading(s). Structural subheadings improve readability and crawling.`,
    },
    {
      id: "img-alt",
      weight: 8,
      label: "Images have descriptive alt text",
      status:
        imgTags.length === 0
          ? "warn"
          : imgWithAltCount === imgTags.length
          ? "pass"
          : "fail",
      hint:
        imgTags.length === 0
          ? "Consider adding a relevant image to boost engagement."
          : `${imgWithAltCount}/${imgTags.length} images have non-empty alt tags.`,
    },
    {
      id: "links",
      weight: 6,
      label: "Contains contextual links",
      status: linkCount >= 1 ? "pass" : "warn",
      hint: "Add internal links to related legal texts or external references.",
    },
    {
      id: "tags",
      weight: 6,
      label: "Has tags / category metadata",
      status:
        (input.tags?.length || 0) >= 3
          ? "pass"
          : (input.tags?.length || 0) >= 1
          ? "warn"
          : "fail",
      hint: "Assign at least 3 relevant tags to optimize internal taxonomy.",
    },
  ];

  // Optional Focus Keyword checks
  if (kw) {
    const kwInTitle = title.toLowerCase().includes(kw);

    // Calculate basic keyword occurrences
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const kwMatches = lcText.match(regex) || [];
    const kwCount = kwMatches.length;

    checks.push({
      id: "kw-title",
      weight: 6,
      label: "Focus keyword in title",
      status: kwInTitle ? "pass" : "fail",
      hint: kwInTitle
        ? `Focus keyword "${input.keyword}" found in the title.`
        : `Include your focus keyword "${input.keyword}" in the title.`,
    });

    checks.push({
      id: "kw-body",
      weight: 6,
      label: "Focus keyword frequency in body",
      status: kwCount >= 2 ? "pass" : kwCount === 1 ? "warn" : "fail",
      hint:
        kwCount === 0
          ? `Mention "${input.keyword}" in the content body.`
          : `Found ${kwCount} occurrence(s) of "${input.keyword}".`,
    });
  }

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earnedWeight = checks.reduce(
    (s, c) =>
      s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0),
    0
  );

  const score = Math.round((earnedWeight / totalWeight) * 100);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";

  return { score, grade, checks };
}