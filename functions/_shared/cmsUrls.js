/**
 * بناء روابط CMS وقت الطلب + دمجها في sitemap.xml المبني.
 *
 * كل دوال هذا الملف **خالصة** (بلا شبكة) ليقيسها vitest وحدها، ولتبقى وظيفة
 * الحافة (functions/sitemap.xml.js) مجرد قشرة رقيقة حولها.
 *
 * القاعدة الحاكمة:
 *   لا يُضاف إلى الخريطة إلا رابط مبني بنفس دوال المعرّفات المستعملة في
 *   الواجهة والبناء (shared/seo/url-policy.js)، وإلا اختلف ما تنشره الخريطة
 *   عمّا يخدمه الموقع — وهو أصل أعطال «13 رابطاً ميتاً» الموثّقة في
 *   generate-sitemap.mjs. ولا يدخلها رابط محوَّل (301) أبداً: المُضاف يُرشَّح
 *   بـisRedirectingPath، والمبني يُنظَّف من كتل التحويل عند الدمج.
 *
 * ملاحظة عن تكرار النسخ: لا نخشى التكرار الظاهر بين عنصر مبني (dist) وعنصر
 * CMS؛ الدمج يقارن الـ <loc> بحرفيته ويسقط ما هو منشور أصلاً. الفائدة تظهر
 * حين يُنشر سجلّ جديد بين نُشرتين: يدخل الخريطة فوراً.
 */

import {
  SITE_ORIGIN,
  articleSlug,
  canonicalArticle,
  canonicalEvent,
  canonicalLexicon,
  canonicalNews,
  canonicalPdf,
  canonicalSchool,
  isRedirectingPath,
  newsSlug,
  pathOfUrl,
  schoolSlug,
  slugify,
} from "../../shared/seo/url-policy.js";
import { isArchivableItem } from "../../shared/archive/links.js";

/** تاريخ ISO مختصر (YYYY-MM-DD) — نسخة وقت-الطلب من dateOf في cms-content.mjs. */
export function lastmodOf(row, fields = ["updated_at", "published_at", "created_at"]) {
  for (const field of fields) {
    const value = row?.[field];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 10);
  }
  return "";
}

/** مفتاح تطبيع لمقارنة أسماء المصطلحات العربية (تشكيل + مسافات). */
export function termKey(term) {
  return String(term ?? "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * معرّف سجلّ أرشيف (ملخص مرفوع أو نصّ قانوني): slug ← عنوان ← id.
 * يطابق contentSlug في url-policy (نفس سلّم الاحتياط).
 */
export function archiveSlug(row) {
  const explicit = typeof row?.slug === "string" && row.slug.trim();
  if (explicit) return explicit.trim().replace(/\/+$/, "");
  return slugify(row?.title || row?.name || "") || String(row?.id ?? "");
}

/** معرّف مصطلح معجم من CMS: عمود slug إن وُجد، وإلا من الاسم العربي. */
export function cmsLexiconSlug(row) {
  const explicit = typeof row?.slug === "string" && row.slug.trim();
  if (explicit) return explicit.trim().replace(/\/+$/, "");
  return slugify(row?.term_ar) || String(row?.id ?? "");
}

/**
 * معرّف ندوة من CMS (جدول seminars): الواجهة لا تعرف صيغة أخرى —
 * EventPage تجلب السجلّ بالمعرّف فقط حين تبدأ البادئة بـ seminar-، وبنفس
 * الصيغة تبني EventsPage وHomePage وSearchPage الرابط. أي معرّف مشتق من
 * العنوان هنا يُنتج رابطاً تنشره الخريطة ثم يردّ عليه الموقع «غير موجود».
 */
export function cmsEventSlug(row) {
  const id = row?.id == null ? "" : String(row.id).trim();
  return id ? `seminar-${id}` : "";
}

/**
 * يحوّل كتالوج CMS إلى عناصر خريطة موقع.
 *
 * @param {{articles?: any[], news?: any[], pdfs?: any[], laws?: any[], lexicon?: any[], events?: any[], schools?: any[]}} catalog
 * @param {{localLexiconTerms?: Set<string>}} [options] مصطلحات المعجم المبنية
 *        محلياً (تُقرأ من /reference/lexicon.json) — تُستثنى حتى لا يظهر
 *        المصطلح نفسه بمعرّف CMS مختلف عن صفحته الثابتة (محتوى مكرر).
 * @returns {{path: string, url: string, lastmod: string, changefreq: string, priority: string}[]}
 */
export function buildCmsEntries(catalog = {}, { localLexiconTerms = new Set() } = {}) {
  const seen = new Set();
  const entries = [];

  const push = (url, lastmod, changefreq, priority) => {
    const path = pathOfUrl(url);
    if (!path || seen.has(path)) return;
    // لا رابط محوَّل (301) في الخريطة: الزاحف يقرأ «Redirected» بدل صفحة،
    // وتُعلَّم الخريطة بروابط غير صالحة. نفس قائمة public/_redirects عبر
    // isRedirectingPath في shared/seo/url-policy.js.
    if (isRedirectingPath(path)) return;
    seen.add(path);
    entries.push({ path, url, lastmod, changefreq, priority });
  };

  for (const row of catalog.articles ?? []) {
    const slug = articleSlug(row);
    if (!slug) continue;
    push(canonicalArticle(slug), lastmodOf(row), "monthly", "0.8");
  }

  for (const row of catalog.news ?? []) {
    const slug = newsSlug(row);
    if (!slug) continue;
    push(canonicalNews(slug), lastmodOf(row), "monthly", "0.8");
  }

  for (const [rows, priority] of [
    [catalog.pdfs ?? [], "0.6"],
    [catalog.laws ?? [], "0.7"],
  ]) {
    for (const row of rows) {
      // نفس شرط البناء: سجلّ بلا رابط تحميل وبلا نصّ = صفحة فارغة، لا تُنشر.
      if (!isArchivableItem(row)) continue;
      const slug = archiveSlug(row);
      if (!slug) continue;
      push(canonicalPdf(slug), lastmodOf(row, ["updated_at", "created_at"]), "yearly", priority);
    }
  }

  for (const row of catalog.lexicon ?? []) {
    const key = termKey(row?.term_ar);
    if (key && localLexiconTerms.has(key)) continue;
    const slug = cmsLexiconSlug(row);
    if (!slug) continue;
    push(canonicalLexicon(slug), lastmodOf(row), "monthly", "0.7");
  }

  // الندوات (seminars) والكليات (faculties): نفس أولويات البناء في
  // scripts/generate-sitemap.mjs (0.7/monthly) حتى لا يختلف وزن صفحة CMS عن
  // شقيقتها المبنية من events.json وschools.json.
  for (const row of catalog.events ?? []) {
    const slug = cmsEventSlug(row);
    if (!slug) continue;
    push(canonicalEvent(slug), lastmodOf(row, ["updated_at", "created_at"]), "monthly", "0.7");
  }

  for (const row of catalog.schools ?? []) {
    // نفس دالة المعرّف المستعملة في البناء والواجهة: slug ← الاسم ← id.
    const slug = schoolSlug(row);
    if (!slug) continue;
    push(canonicalSchool(slug), lastmodOf(row, ["updated_at", "created_at"]), "monthly", "0.7");
  }

  return entries;
}

/** مجموعة الـ<loc> الموجودة في ملف خريطة (لتفادي التكرار حرفياً). */
export function parseSitemapLocs(xml) {
  const locs = new Set();
  for (const match of String(xml ?? "").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    locs.add(match[1]);
  }
  return locs;
}

export function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * يحذف كتل <url> التي يقع مسارها تحت تحويل 301 — سطور بُنيت في dist قبل
 * إضافة التحويل (معرّف قديم، مصطلح مكرّر دُمج). الخريطة المُخدَمة تنشر
 * روابط 200 فقط، والتنظيف هنا يشمل النسخة المبنية نفسها لا الإضافات وحدها.
 * @returns {{xml: string, stripped: string[]}}
 */
function stripRedirectingBlocks(xml) {
  const stripped = [];
  const out = String(xml).replace(/<url>[\s\S]*?<\/url>\n?/g, (block) => {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(block)?.[1] ?? "";
    if (loc && isRedirectingPath(pathOfUrl(loc))) {
      stripped.push(loc);
      return "";
    }
    return block;
  });
  return { xml: out, stripped };
}

/**
 * يدمج عناصر CMS في نسخة مبنيّة من sitemap.xml قبل </urlset> مباشرة.
 * التنسيق مطابق لمُولّد البناء (سطران لكل وسم) ليبقى diff الملف مقروءاً.
 * أي رابط محوَّل (301) يُحذف من القاعدة أو يُمنع من الإضافة.
 *
 * @returns {{xml: string, added: string[], skipped: string[], stripped: string[]}}
 */
export function mergeSitemapXml(baseXml, entries = [], { origin = SITE_ORIGIN } = {}) {
  const raw = String(baseXml ?? "");
  if (!raw.includes("</urlset>")) {
    return { xml: raw, added: [], skipped: entries.map((entry) => entry.url).filter(Boolean), stripped: [] };
  }

  const { xml: cleanedXml, stripped } = stripRedirectingBlocks(raw);
  const xml = cleanedXml;

  const existing = parseSitemapLocs(xml);
  const added = [];
  const skipped = [];
  const blocks = [];

  for (const entry of entries) {
    const url = entry.url || (entry.path ? `${origin}${entry.path}` : "");
    if (!url) continue;
    if (existing.has(url) || isRedirectingPath(pathOfUrl(url))) {
      skipped.push(url);
      continue;
    }

    existing.add(url);
    added.push(url);

    const lastmodTag = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
    blocks.push(
      `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmodTag}\n` +
        `    <changefreq>${escapeXml(entry.changefreq || "monthly")}</changefreq>\n` +
        `    <priority>${escapeXml(entry.priority || "0.6")}</priority>\n  </url>`,
    );
  }

  if (!blocks.length) return { xml, added, skipped, stripped };

  const at = xml.lastIndexOf("</urlset>");
  const head = xml.slice(0, at).replace(/\s*$/, "");
  const tail = xml.slice(at);
  return { xml: `${head}\n${blocks.join("\n")}\n${tail}`, added, skipped, stripped };
}
