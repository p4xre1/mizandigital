// ── Pre-publish SEO analyzer ────────────────────────────────────────────────────
// Scores an article draft 0–100 against on-page SEO best practices and returns
// an actionable checklist. Purely heuristic — a green score is guidance, not a
// guarantee of ranking.

export interface SeoInput {
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  slug: string;
  keyword?: string;      // focus keyword
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
  score: number;               // 0–100
  grade: "A" | "B" | "C" | "D";
  checks: SeoCheck[];
}

function textFromHtml(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, " ");
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent || "";
}

export function analyzeSeo(input: SeoInput): SeoReport {
  const title = (input.metaTitle || input.title || "").trim();
  const desc = (input.metaDescription || "").trim();
  const kw = (input.keyword || "").trim().toLowerCase();
  const text = textFromHtml(input.contentHtml);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const lc = text.toLowerCase();

  const el = typeof window !== "undefined" ? document.createElement("div") : null;
  if (el) el.innerHTML = input.contentHtml;
  const imgs = el ? Array.from(el.querySelectorAll("img")) : [];
  const imgsWithAlt = imgs.filter(i => (i.getAttribute("alt") || "").trim().length > 0).length;
  const links = el ? el.querySelectorAll("a").length : 0;
  const headings = el ? el.querySelectorAll("h2,h3,h4").length : 0;

  const checks: SeoCheck[] = [
    {
      id: "title-len", weight: 15,
      label: "Title length (30–60 chars)",
      status: title.length >= 30 && title.length <= 60 ? "pass" : title.length >= 20 && title.length <= 70 ? "warn" : "fail",
      hint: `Currently ${title.length} chars. Aim for 30–60.`,
    },
    {
      id: "desc-len", weight: 15,
      label: "Meta description (70–160 chars)",
      status: desc.length >= 70 && desc.length <= 160 ? "pass" : desc.length > 0 ? "warn" : "fail",
      hint: desc.length === 0 ? "Add a meta description." : `Currently ${desc.length} chars. Aim for 70–160.`,
    },
    {
      id: "slug", weight: 8,
      label: "Clean URL slug (lowercase, hyphens)",
      status: /^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/.test(input.slug) && input.slug.length <= 75 ? "pass" : "warn",
      hint: "Use short, hyphenated, lowercase slugs.",
    },
    {
      id: "content-len", weight: 20,
      label: "Content length (≥ 300 words)",
      status: words >= 600 ? "pass" : words >= 300 ? "warn" : "fail",
      hint: `Currently ${words} words. Longer, in-depth content ranks better.`,
    },
    {
      id: "headings", weight: 10,
      label: "Uses subheadings (H2/H3)",
      status: headings >= 2 ? "pass" : headings === 1 ? "warn" : "fail",
      hint: `Found ${headings}. Break content up with subheadings.`,
    },
    {
      id: "img-alt", weight: 8,
      label: "Images have alt text",
      status: imgs.length === 0 ? "warn" : imgsWithAlt === imgs.length ? "pass" : "fail",
      hint: imgs.length === 0 ? "Consider adding a relevant image." : `${imgsWithAlt}/${imgs.length} images have alt text.`,
    },
    {
      id: "links", weight: 6,
      label: "Contains at least one link",
      status: links >= 1 ? "pass" : "warn",
      hint: "Link to related articles or sources.",
    },
    {
      id: "tags", weight: 6,
      label: "Has tags / keywords",
      status: (input.tags?.length || 0) >= 3 ? "pass" : (input.tags?.length || 0) >= 1 ? "warn" : "fail",
      hint: "Add 3+ relevant tags.",
    },
  ];

  if (kw) {
    checks.push({
      id: "kw-title", weight: 6,
      label: "Focus keyword in title",
      status: title.toLowerCase().includes(kw) ? "pass" : "fail",
      hint: `Include "${input.keyword}" in the title.`,
    });
    checks.push({
      id: "kw-body", weight: 6,
      label: "Focus keyword in content",
      status: lc.includes(kw) ? "pass" : "fail",
      hint: `Mention "${input.keyword}" in the body.`,
    });
  }

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  const score = Math.round((earned / total) * 100);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";

  return { score, grade, checks };
}
