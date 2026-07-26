/**
 * Mizan Digital - Enterprise Master Blog & Content Service Engine
 * Path: /workspaces/mizandigital/src/lib/blog-service.ts
 * 
 * Features:
 * - 📱 Phones-First & Low-Bandwidth Optimizations (Telemetry, Payload Shrinking, Cache-First)
 * - 🛡️ Military-Grade Security & Sanitization (XSS Stripping, PII Redaction, Input Scrubbing)
 * - 🔍 Master SEO & Keyword Extraction (Articles, Photos/Images, PDF/Documents)
 * - 🌐 4-Language Localization (Arabic [AR], French [FR], English [EN], Spanish [ES])
 * - 📊 Complete Google Ecosystem Integration (GA4, GTM, AdSense, Conversions Telemetry)
 * - 🗄️ Supabase Dynamic Query Engine + Resilient Local Database Fallback
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  trackPageView,
  trackSearch,
  trackEvent,
  trackImageSEO,
  trackFileSEO,
  trackConversion,
  getDeviceTelemetry,
  type SupportedLang,
} from "@/lib/analytics";

// Export Supported Domain Languages
export type { SupportedLang };

// Site Canonical Base URL from environment variables
const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  "https://www.mizan.page";

// ==========================================
// 📐 ARCHITECTURE TYPES & SCHEMAS
// ==========================================

export interface BlogAuthor {
  id?: string;
  name: string;
  role?: string;
  avatar?: string;
}

export interface BlogMediaSEO {
  url: string;
  altText: string;
  keywords: string[];
  fileSizeBytes?: number;
  mimeType?: string;
  title?: string;
}

export interface BlogPost {
  id?: string;
  slug: string;
  title: string;
  titleFr?: string;
  titleEn?: string;
  titleEs?: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  readingTime: number;
  coverImage?: string;
  coverImageSEO?: BlogMediaSEO;
  pdfUrl?: string;
  pdfSEO?: BlogMediaSEO;
  author?: BlogAuthor;
  views?: number;
  isFeatured?: boolean;
  status?: "published" | "draft" | "archived";
  lang?: SupportedLang;
  keywords?: string[];
  semester?: string;
  schoolId?: string;
}

/**
 * Raw Database Row Schema returned by Supabase queries
 */
interface SupabaseArticleRow {
  id: string;
  slug: string;
  title: string;
  title_fr?: string | null;
  content: string;
  excerpt?: string | null;
  created_at: string;
  pdf_url?: string | null;
  views?: number | null;
  is_featured?: boolean | null;
  status?: string | null;
  categories?: { name?: string | null } | null;
  profiles?: { full_name?: string | null; role?: string | null; avatar_url?: string | null } | null;
}

// ==========================================
// 🛡️ MILITARY-GRADE SECURITY & SANITIZERS
// ==========================================

/**
 * Strips high-risk XSS tags, inline script injections, and event handlers
 */
export function sanitizeXSS(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:[^\s"']+/gi, "");
}

/**
 * Redacts email addresses, passwords, phone numbers, and bearer tokens
 */
export function maskPII(text: string): string {
  if (typeof text !== "string") return text;
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/(?:\+?212|0)[5-7]\d{8}/g, "[REDACTED_PHONE]")
    .replace(/(bearer|token|auth|key|secret|password)=([^\s&]+)/gi, "$1=[REDACTED]");
}

// ==========================================
// 🚀 PHONE-FIRST & SEO KEYWORD ENGINE
// ==========================================

/**
 * Calculates estimated reading time based on localized word count
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 180; // Optimized reading speed for mobile legal texts
  const cleanText = content.replace(/<[^>]*>/g, "").trim();
  const wordCount = cleanText.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

/**
 * Extracts high-value SEO keywords automatically from content
 */
export function extractSEOKeywords(
  title: string,
  content: string,
  lang: SupportedLang = "ar"
): string[] {
  const text = `${title} ${content.replace(/<[^>]*>/g, "")}`.toLowerCase();

  // Language specific stop words filter
  const stopWords = new Set([
    "في", "من", "على", "إلى", "عن", "مع", "هذا", "التي", "الذي", "أن", "كان", "أو",
    "dans", "sur", "avec", "pour", "dans", "cette", "avec", "plus", "est", "des",
    "this", "that", "with", "from", "for", "have", "with", "about", "your", "they",
    "este", "esta", "para", "como", "sobre", "con", "donde", "tiene", "entre"
  ]);

  const rawWords = text
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  // Deduplicate and get top unique keywords
  return Array.from(new Set(rawWords)).slice(0, 12);
}

/**
 * Generates Google Article JSON-LD Structured Data Schema for Master SEO
 */
export function generateArticleJSONLD(post: BlogPost, lang: SupportedLang = "ar"): string {
  const canonicalUrl = `${SITE_URL}/${lang}/article/${post.slug}`;
  const keywords = post.keywords || extractSEOKeywords(post.title, post.content, lang);

  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    "headline": post.title,
    "description": post.excerpt,
    "image": post.coverImage ? [post.coverImage] : [`${SITE_URL}/Logo.svg`],
    "datePublished": post.date,
    "dateModified": post.date,
    "inLanguage": lang,
    "keywords": keywords.join(", "),
    "author": {
      "@type": "Organization",
      "name": post.author?.name || "منصة ميزان الرقمية - Mizan Digital",
      "url": SITE_URL,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Mizan Digital",
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/Logo.svg`,
      },
    },
  };

  return JSON.stringify(schema);
}

// ==========================================
// 📦 IN-MEMORY CACHE & STATIC DATABASE (FALLBACK)
// ==========================================

const STATIC_BLOG_DATABASE: BlogPost[] = [
  {
    id: "static_01",
    slug: "smart-contracts-legal-status",
    title: "الحجية القانونية للعقود الذكية في الأنظمة العربية",
    titleFr: "La valeur juridique des contrats intelligents",
    titleEn: "Legal Enforceability of Smart Contracts",
    titleEs: "Validez jurídica de los contratos inteligentes",
    excerpt: "دراسة تحليلية حول مدى اعتراف المحاكم العربية بالعقود المشفرة القائمة على البلوكشين.",
    date: "2026-07-15",
    category: "قانون",
    readingTime: 5,
    isFeatured: true,
    views: 1420,
    status: "published",
    author: {
      name: "منصة ميزان الرقمية",
      role: "القسم القانوني",
    },
    coverImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
    coverImageSEO: {
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
      altText: "عقد إلكتروني ذكي بتقنية البلوكشين في التشريع العربي",
      keywords: ["عقد_ذكي", "بلوكشين", "قانون_رقمي", "إثبات_إلكتروني", "ميزان"],
    },
    pdfUrl: `${SITE_URL}/documents/smart-contracts-study.pdf`,
    pdfSEO: {
      url: `${SITE_URL}/documents/smart-contracts-study.pdf`,
      altText: "دراسة حول الحجية القانونية للعقود المشفرة الذكية PDF",
      keywords: ["تحميل_دراسة", "PDF_قانوني", "عقود_ذكية", "شريعة_وقانون"],
      fileSizeBytes: 2048500,
      mimeType: "application/pdf",
    },
    content: `
تعتبر العقود الذكية (Smart Contracts) من أبرز تجليات التداخل بين التقنية والقانون. 
فهي برمجيات ذاتية التنفيذ تعتمد على معادلة منطقية صارمة:

إذا تحقق الشرط X، يتم تنفيذ الأثر القانوني Y تلقائياً دون تدخل بشري.

وفي الأنظمة القضائية الحديثة، يثور التساؤل حول مدى مطابقة هذه العقود لتعريف "الكتابة الإلكترونية الرسمية". 
تشير القوانين الرقمية الحديثة إلى أن العقد المشفر يعد ملزماً في حال توفرت فيه أركان الرضا، والمحل، والسبب الشكلي المقبول قانوناً.
    `.trim(),
  },
  {
    id: "static_02",
    slug: "optimizing-nextjs-cloudflare",
    title: "كيف ترفع سرعة مدونتك على كلاود فلير إلى أقصى حد؟",
    titleFr: "Optimiser les performances sur Cloudflare Edge",
    titleEn: "Optimizing Blog Performance on Cloudflare Pages",
    titleEs: "Optimización de rendimiento en Cloudflare Pages",
    excerpt: "دليلك الهندسي لتقليص زمن استجابة السيرفر وتفعيل كاش الحافة لمدونات Next.js و Vite.",
    date: "2026-07-10",
    category: "تقنية",
    readingTime: 4,
    isFeatured: false,
    views: 890,
    status: "published",
    author: {
      name: "منصة ميزان الرقمية",
      role: "الفريق التقني",
    },
    coverImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80",
    coverImageSEO: {
      url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80",
      altText: "تحسين سرعة خوادم الكلاود فلير للشبكات السريعة",
      keywords: ["كلاود_فلير", "سرعة_الموقع", "استضافة_سريعة", "فرونت_اند"],
    },
    content: `
السرعة هي الروح المغذية لمدونتك. عند استضافة المدونة على Cloudflare Pages، 
فإنك تحصل تلقائياً على ميزة التوزيع العالمي عبر Edge Network. 

لتحقيق أفضل أداء، احرص على تصدير المدونة كملفات ثابتة (Static Assets) 
مع ضغط الصور برمجياً وتقديم صيغ WebP أو AVIF الخفيفة للهواتف الذكية.
    `.trim(),
  },
];

// Local in-memory post cache for fast low-bandwidth mobile responses
const memoryPostCache = new Map<string, BlogPost>();

// ==========================================
// 🛠️ DATA ACCESS LAYER (DAL) IMPLEMENTATION
// ==========================================

/**
 * Retrieves all published blog articles (Optimized for Mobile Bandwidth & Local Speed)
 */
export async function getAllPosts(
  lang: SupportedLang = "ar",
  limit?: number
): Promise<BlogPost[]> {
  try {
    // Attempt Supabase fetch if configured
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          slug,
          title,
          title_fr,
          content,
          excerpt,
          created_at,
          pdf_url,
          views,
          is_featured,
          status,
          categories ( name ),
          profiles ( full_name, role, avatar_url )
        `)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(limit || 20);

      if (!error && data && data.length > 0) {
        const rows = data as unknown as SupabaseArticleRow[];

        const posts: BlogPost[] = rows.map((item) => {
          const categoryName = item.categories?.name || "قانون";
          const authorProfile = item.profiles;

          const titleResolved =
            lang === "fr" && item.title_fr
              ? item.title_fr
              : item.title;

          const post: BlogPost = {
            id: item.id,
            slug: item.slug,
            title: sanitizeXSS(titleResolved),
            excerpt: sanitizeXSS(item.excerpt || item.content.substring(0, 160)),
            content: sanitizeXSS(item.content),
            date: new Date(item.created_at).toISOString().split("T")[0],
            category: categoryName,
            readingTime: calculateReadingTime(item.content),
            pdfUrl: item.pdf_url || undefined,
            views: item.views || 0,
            isFeatured: item.is_featured || false,
            status: "published",
            lang,
            author: {
              name: authorProfile?.full_name || "منصة ميزان",
              role: authorProfile?.role || "محرر قانوني",
              avatar: authorProfile?.avatar_url || undefined,
            },
          };

          // Cache in memory for instant mobile lookup
          memoryPostCache.set(post.slug, post);
          return post;
        });

        return posts;
      }
    }
  } catch (err) {
    console.warn("Supabase fetch failed, falling back to cached/static posts:", err);
  }

  // Fallback to static pre-sanitized database if offline or Supabase fails
  let results = [...STATIC_BLOG_DATABASE];
  if (limit) results = results.slice(0, limit);
  return results;
}

/**
 * Fetch a single post by slug with master image, file, and reading telemetry
 */
export async function getPostBySlug(
  slug: string,
  lang: SupportedLang = "ar",
  trackRead: boolean = true
): Promise<BlogPost | undefined> {
  const cleanSlug = sanitizeXSS(slug).trim();

  // Check fast local cache first for mobile network offloading
  if (memoryPostCache.has(cleanSlug)) {
    const cachedPost = memoryPostCache.get(cleanSlug)!;
    if (trackRead) triggerAnalyticsAndSEO(cachedPost, lang);
    return cachedPost;
  }

  let post: BlogPost | undefined = STATIC_BLOG_DATABASE.find((p) => p.slug === cleanSlug);

  if (!post && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          slug,
          title,
          title_fr,
          content,
          excerpt,
          created_at,
          pdf_url,
          views,
          is_featured,
          categories ( name ),
          profiles ( full_name, role, avatar_url )
        `)
        .eq("slug", cleanSlug)
        .maybeSingle();

      if (!error && data) {
        const row = data as unknown as SupabaseArticleRow;
        const categoryName = row.categories?.name || "قانون";
        const authorProfile = row.profiles;

        post = {
          id: row.id,
          slug: row.slug,
          title: sanitizeXSS(lang === "fr" && row.title_fr ? row.title_fr : row.title),
          excerpt: sanitizeXSS(row.excerpt || row.content.substring(0, 160)),
          content: sanitizeXSS(row.content),
          date: new Date(row.created_at).toISOString().split("T")[0],
          category: categoryName,
          readingTime: calculateReadingTime(row.content),
          pdfUrl: row.pdf_url || undefined,
          views: (row.views || 0) + 1,
          isFeatured: row.is_featured || false,
          lang,
          author: {
            name: authorProfile?.full_name || "منصة ميزان",
            role: authorProfile?.role || "محرر قانوني",
            avatar: authorProfile?.avatar_url || undefined,
          },
        };

        memoryPostCache.set(post.slug, post);
      }
    } catch {
      console.warn("Error fetching article by slug from Supabase");
    }
  }

  if (post && trackRead) {
    triggerAnalyticsAndSEO(post, lang);
  }

  return post;
}

/**
 * Trigger Google Suite, Master Image SEO, and Document Keywords Telemetry
 */
function triggerAnalyticsAndSEO(post: BlogPost, lang: SupportedLang): void {
  // 1. Page View Tracking in GA4 / GTM
  trackPageView(`/article/${post.slug}`, post.title, lang);

  // 2. Master Image SEO Keywords Tracking
  if (post.coverImageSEO) {
    trackImageSEO({
      imageId: `img_${post.slug}`,
      src: post.coverImageSEO.url,
      altText: post.coverImageSEO.altText,
      keywords: post.coverImageSEO.keywords,
      lang,
      context: "blog_cover",
    });
  }

  // 3. Master File / PDF Document SEO Keywords Tracking
  if (post.pdfSEO) {
    trackFileSEO({
      fileId: `file_${post.slug}`,
      fileName: post.pdfSEO.title || `${post.slug}.pdf`,
      fileUrl: post.pdfSEO.url,
      fileType: "pdf",
      fileSizeBytes: post.pdfSEO.fileSizeBytes,
      category: post.category,
      keywords: post.pdfSEO.keywords,
      lang,
    });
  }

  // 4. Send low-bandwidth critical event to GA4
  trackEvent("article_read_completed", {
    article_slug: post.slug,
    article_title: post.title,
    category: post.category,
    reading_time: post.readingTime,
    has_pdf_attachment: Boolean(post.pdfUrl),
    ...getDeviceTelemetry(),
  });
}

/**
 * Filter posts by category with localization support
 */
export async function getPostsByCategory(
  category: string,
  lang: SupportedLang = "ar"
): Promise<BlogPost[]> {
  const allPosts = await getAllPosts(lang);
  const cleanCategory = sanitizeXSS(category).toLowerCase();

  return allPosts.filter(
    (post) => post.category.toLowerCase() === cleanCategory
  );
}

/**
 * Search posts by query string matching title, excerpt, or content
 * Automatically sends GA4/GTM search events with device telemetry
 */
export async function searchPosts(
  query: string,
  lang: SupportedLang = "ar"
): Promise<BlogPost[]> {
  const q = sanitizeXSS(query).trim().toLowerCase();
  const allPosts = await getAllPosts(lang);

  if (!q) return allPosts;

  const results = allPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(q) ||
      post.excerpt.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q)
  );

  // 📊 Track search term in Google Analytics and GTM DataLayer
  trackSearch(q, results.length, lang);

  return results;
}

/**
 * Fetch related posts based on category (excluding the current post)
 */
export async function getRelatedPosts(
  currentSlug: string,
  limit = 2,
  lang: SupportedLang = "ar"
): Promise<BlogPost[]> {
  const currentPost = await getPostBySlug(currentSlug, lang, false);
  if (!currentPost) return [];

  const allPosts = await getAllPosts(lang);

  return allPosts
    .filter(
      (post) =>
        post.slug !== currentSlug &&
        post.category.toLowerCase() === currentPost.category.toLowerCase()
    )
    .slice(0, limit);
}

/**
 * Tracks conversion when user downloads a PDF attachment from an article
 */
export function trackPDFDownloadConversion(post: BlogPost): void {
  if (!post.pdfUrl) return;

  trackConversion("pdf_download", 10, "MAD");

  if (post.pdfSEO) {
    trackFileSEO({
      fileId: `download_${post.slug}`,
      fileName: post.pdfSEO.title || `${post.slug}.pdf`,
      fileUrl: post.pdfSEO.url,
      fileType: "pdf",
      keywords: post.pdfSEO.keywords,
      lang: post.lang || "ar",
    });
  }
}