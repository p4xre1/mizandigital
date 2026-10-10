/**
 * بناء sitemap.xml من قائمة روابط، وفق بروتوكول sitemaps.org.
 * منطق نقي بلا شبكة: يقبل قائمة نصية (رابط في كل سطر) ويعيد XML أو أخطاء.
 */
import { SITE_ORIGIN } from "../../../shared/seo/url-policy.js"

export const SITEMAP_MAX_URLS = 50_000

export interface SitemapBuildResult {
  xml: string
  urls: string[]
  rejected: Array<{ line: string; reason: string }>
  error?: string
}

const SITE_HOST = new URL(SITE_ORIGIN).host

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** يُرجع الرابط المعياري أو سبب الرفض. */
export function normalizeSitemapUrl(raw: string): { url: string } | { reason: string } {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { reason: "ليس رابطاً صالحاً" }
  }
  if (parsed.protocol !== "https:") return { reason: "يجب أن يكون الرابط https" }
  if (parsed.host !== SITE_HOST) return { reason: `خارج نطاق الموقع (${SITE_HOST})` }
  parsed.hash = ""
  return { url: parsed.href }
}

export function buildSitemap(input: string, options: { lastmod?: string } = {}): SitemapBuildResult {
  const rejected: SitemapBuildResult["rejected"] = []
  const seen = new Set<string>()
  const urls: string[] = []

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const result = normalizeSitemapUrl(line)
    if ("reason" in result) {
      rejected.push({ line, reason: result.reason })
      continue
    }
    if (seen.has(result.url)) continue
    seen.add(result.url)
    urls.push(result.url)
  }

  if (urls.length === 0) {
    return { xml: "", urls, rejected, error: "لا يوجد رابط صالح لبناء الخريطة" }
  }
  if (urls.length > SITEMAP_MAX_URLS) {
    return {
      xml: "",
      urls,
      rejected,
      error: `الحد الأقصى ${SITEMAP_MAX_URLS.toLocaleString("en")} رابطاً لكل ملف، وعددك ${urls.length.toLocaleString("en")}`,
    }
  }

  const lastmod = options.lastmod ? `\n    <lastmod>${escapeXml(options.lastmod)}</lastmod>` : ""
  const entries = urls
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod}\n  </url>`)
    .join("\n")
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`

  return { xml, urls, rejected }
}
