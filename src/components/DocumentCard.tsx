import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Download,
  Eye,
  Calendar,
  HardDrive,
  Tag,
  ShieldCheck,
  Scale,
  Hash,
  BookOpen,
  Share2,
  Check,
  Lock,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
} from "lucide-react";

// Domain configuration for Google Master SEO & Canonical URLs
const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) ||
  (import.meta.env.VITE_APP_URL as string) ||
  "https://www.mizan.page";

// Extended Legal Document interface with Photo & SEO metadata support
export interface LegalDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  docType?: string;
  fileType: string;
  fileSize: string;
  publishDate: string;
  modifiedDate: string;
  authorOrPublisher: string;
  downloadUrl: string;
  viewUrl: string;
  tags: string[];
  isVerified?: boolean;
  pages?: number;
  documentNumber?: string;
  imageUrl?: string;
  imageAlt?: string;
  keywords?: string[];
}

// 4-Language Dictionary (AR, FR, EN, ES)
const CARD_I18N = {
  ar: {
    preview: "معاينة",
    download: "تحميل آمن",
    verified: "موثق رسميًا",
    modified: "تعديل:",
    pages: "صفحة",
    docNo: "رقم:",
    publisher: "الجهة:",
    category: "التصنيف:",
    share: "مشاركة",
    copied: "تم النسخ!",
    encrypted: "مشفر 256-bit",
    fileDetails: "تفاصيل الوثيقة",
  },
  fr: {
    preview: "Aperçu",
    download: "Télécharger",
    verified: "Vérifié Officiel",
    modified: "Modifié:",
    pages: "pages",
    docNo: "N°:",
    publisher: "Éditeur:",
    category: "Catégorie:",
    share: "Partager",
    copied: "Copié!",
    encrypted: "Chiffré 256-bit",
    fileDetails: "Détails du document",
  },
  en: {
    preview: "Preview",
    download: "Download",
    verified: "Officially Verified",
    modified: "Modified:",
    pages: "pages",
    docNo: "No:",
    publisher: "Publisher:",
    category: "Category:",
    share: "Share",
    copied: "Copied!",
    encrypted: "256-bit Encrypted",
    fileDetails: "Document Details",
  },
  es: {
    preview: "Vista previa",
    download: "Descargar",
    verified: "Verificado Oficial",
    modified: "Modificado:",
    pages: "páginas",
    docNo: "Nº:",
    publisher: "Editorial:",
    category: "Categoría:",
    share: "Compartir",
    copied: "¡Copiado!",
    encrypted: "Cifrado 256-bit",
    fileDetails: "Detalles del documento",
  },
} as const;

type SupportedLang = keyof typeof CARD_I18N;

/**
 * Military-Grade URL Sanitizer
 * Prevents XSS attacks via javascript:, data:, or vbscript: injection vectors
 */
function sanitizeUrl(url?: string): string {
  if (!url) return "#";

  let value = url.trim();

  // Fix malformed absolute URLs: /https://, //https://, ///https://
  value = value.replace(/^\/+(?=https?:\/\/)/i, "");

  // Convert protocol-relative URLs to HTTPS
  if (value.startsWith("//")) {
    value = `https:${value}`;
  }

  // Block dangerous URL schemes
  if (/^(javascript|data|vbscript):/i.test(value)) {
    return "#";
  }

  // Allow only HTTP(S), relative paths, hashes, and query strings
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(value) &&
    !/^https?:\/\//i.test(value)
  ) {
    return "#";
  }

  // Keep hash/query-only links unchanged
  if (value.startsWith("#") || value.startsWith("?")) {
    return value;
  }

  // Normalize internal paths
  if (!/^https?:\/\//i.test(value) && !value.startsWith("/")) {
    value = `/${value}`;
  }

  if (!/^https?:\/\//i.test(value)) {
    const match = value.match(/^([^?#]*)([?#].*)?$/);
    const path = match?.[1] || "/";
    const suffix = match?.[2] || "";

    const normalizedPath =
      path === "/" ? "/" : path.replace(/\/+/g, "/").replace(/\/+$/, "");

    value = `${normalizedPath || "/"}${suffix}`;
  }

  return value;
}
/**
 * File Icon Selector based on file extension/type
 */
function getFileIcon(fileType: string) {
  const ft = fileType.toUpperCase();
  if (ft.includes("PDF")) return FileText;
  if (ft.includes("XLS") || ft.includes("CSV")) return FileSpreadsheet;
  if (ft.includes("JPG") || ft.includes("PNG") || ft.includes("WEBP")) return ImageIcon;
  if (ft.includes("DOC") || ft.includes("TXT")) return FileText;
  return FileCode;
}

export function DocumentCard({
  doc,
  lang = "ar",
}: {
  doc: LegalDocument;
  lang?: string;
}) {
  const [copied, setCopied] = useState<boolean>(false);

  // Fallback language selector
  const activeLang: SupportedLang =
    lang in CARD_I18N ? (lang as SupportedLang) : "ar";
  const strings = CARD_I18N[activeLang];

  // Sanitized URLs
  const safeViewUrl = useMemo(() => sanitizeUrl(doc.viewUrl), [doc.viewUrl]);
  const safeDownloadUrl = useMemo(
    () => sanitizeUrl(doc.downloadUrl),
    [doc.downloadUrl]
  );
  const safeImageUrl = useMemo(
    () => (doc.imageUrl ? sanitizeUrl(doc.imageUrl) : null),
    [doc.imageUrl]
  );

  // File Icon
  const DocumentIcon = useMemo(() => getFileIcon(doc.fileType), [doc.fileType]);

  // Master Keywords Optimization
  const mergedKeywords = useMemo(() => {
    const defaultKeywords = [
      doc.title,
      doc.category,
      doc.authorOrPublisher,
      doc.fileType,
      "Mizan Legal Portal",
    ];
    return Array.from(
      new Set([...(doc.tags || []), ...(doc.keywords || []), ...defaultKeywords])
    ).join(", ");
  }, [doc]);

  // Handle Share / Copy Link
  const handleShare = useCallback(async () => {
    const fullUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${safeViewUrl}`
        : `${SITE_URL}${safeViewUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.title,
          text: doc.description,
          url: fullUrl,
        });
        return;
      } catch {
        // Fallback to clipboard if share sheet dismissed or unsupported
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Safe fail
      }
    }
  }, [doc.title, doc.description, safeViewUrl]);

  // Master Google SEO Structured Data Schema (DigitalDocument + ImageObject)
  const masterSchemaData = useMemo(() => {
    const mimeType =
      doc.fileType.toUpperCase() === "PDF"
        ? "application/pdf"
        : doc.fileType.toUpperCase().includes("DOC")
        ? "application/msword"
        : doc.fileType.toUpperCase().includes("XLS")
        ? "application/vnd.ms-excel"
        : "application/octet-stream";

    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "DigitalDocument",
      "@id": `${SITE_URL}${safeViewUrl}#document`,
      name: doc.title,
      headline: doc.title,
      description: doc.description,
      fileFormat: mimeType,
      contentSize: doc.fileSize,
      dateCreated: doc.publishDate,
      dateModified: doc.modifiedDate,
      numberOfPages: doc.pages,
      identifier: doc.documentNumber,
      keywords: mergedKeywords,
      inLanguage: activeLang,
      url: `${SITE_URL}${safeViewUrl}`,
      publisher: {
        "@type": "Organization",
        name: doc.authorOrPublisher || "Mizan Legal Platform",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/Logo.svg`,
        },
      },
      hasPart: {
        "@type": "WebPage",
        name: doc.title,
        url: `${SITE_URL}${safeViewUrl}`,
      },
    };

    // Master Photo SEO Schema Integration
    if (safeImageUrl) {
      schema.image = {
        "@type": "ImageObject",
        "@id": `${safeImageUrl}#primaryimage`,
        url: safeImageUrl,
        caption: doc.imageAlt || `${doc.title} - Mizan Legal Document Preview`,
        contentUrl: safeImageUrl,
        inLanguage: activeLang,
        keywords: mergedKeywords,
      };
      schema.thumbnailUrl = safeImageUrl;
    }

    return schema;
  }, [doc, safeViewUrl, safeImageUrl, mergedKeywords, activeLang]);

  return (
    <article
      itemScope
      itemType="https://schema.org/DigitalDocument"
      className="group relative bg-card hover:bg-slate-900/40 dark:hover:bg-slate-900/60 border border-border/80 hover:border-primary/50 rounded-2xl p-4 sm:p-5.5 transition-all duration-300 shadow-xs hover:shadow-xl hover:shadow-primary/5 flex flex-col gap-4 overflow-hidden"
    >
      {/* Dynamic Master SEO JSON-LD Injector for Search Indexing */}
      <script type="application/ld+json">
        {JSON.stringify(masterSchemaData)}
      </script>

      {/* Main Content & Metadata Layout */}
      <div className="flex flex-col sm:flex-row items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
        
        {/* Document Thumbnail / Photo SEO Container */}
        {safeImageUrl ? (
          <div className="relative w-full sm:w-24 h-28 sm:h-24 rounded-xl overflow-hidden bg-muted border border-border/60 shrink-0 group-hover:border-primary/40 transition-colors">
            <img
              src={safeImageUrl}
              alt={doc.imageAlt || `${doc.title} - ${strings.fileDetails}`}
              loading="lazy"
              decoding="async"
              itemProp="image"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[9px] font-mono font-bold text-slate-200 border border-slate-700/50">
              {doc.fileType}
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform duration-300 border border-primary/20">
            <DocumentIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        )}

        {/* Content Body */}
        <div className="space-y-2.5 min-w-0 flex-1 w-full">
          {/* Header Line: Category Badge + Verification + Security Shield */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-lg bg-secondary text-secondary-foreground border border-border">
              {doc.category}
            </span>

            {doc.isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20 shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>{strings.verified}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium text-muted-foreground/80 bg-muted/40 rounded-md ml-auto rtl:ml-0 rtl:mr-auto">
              <Lock className="w-2.5 h-2.5 text-primary/70" />
              <span>{strings.encrypted}</span>
            </span>
          </div>

          {/* Document Title */}
          <h3
            itemProp="name"
            className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2"
          >
            <Link to={safeViewUrl} className="focus:outline-none focus:underline">
              {doc.title}
            </Link>
          </h3>

          {/* Quick Technical Metadata Row */}
          <div className="flex items-center gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground flex-wrap font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] font-semibold text-foreground/80">
                {strings.modified}
              </span>
              <time itemProp="dateModified" dateTime={doc.modifiedDate}>
                {doc.modifiedDate}
              </time>
            </span>

            <span className="flex items-center gap-1 uppercase bg-muted/80 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold text-foreground border border-border/60">
              {doc.fileType}
            </span>

            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 shrink-0" />
              <span itemProp="contentSize">{doc.fileSize}</span>
            </span>

            {doc.pages && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 shrink-0 text-primary/80" />
                <span>
                  {doc.pages} {strings.pages}
                </span>
              </span>
            )}

            {doc.documentNumber && (
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Hash className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span>
                  {strings.docNo} {doc.documentNumber}
                </span>
              </span>
            )}

            {doc.authorOrPublisher && (
              <span className="flex items-center gap-1 border-l rtl:border-l-0 rtl:border-r border-border/80 px-2">
                <Scale className="w-3.5 h-3.5 text-primary shrink-0" />
                <span itemProp="publisher">{doc.authorOrPublisher}</span>
              </span>
            )}
          </div>

          {/* Description for Indexing & Search Crawlers */}
          <p
            itemProp="description"
            className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-0.5"
          >
            {doc.description}
          </p>

          {/* Keywords & Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
              {doc.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-semibold bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-secondary-foreground px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Toolbar (Phones First Mobile Layout) */}
      <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          aria-label={strings.share}
          className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-semibold rounded-xl bg-muted/60 hover:bg-muted text-foreground transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-border/50"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500 font-bold">{strings.copied}</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <span className="hidden xs:inline">{strings.share}</span>
            </>
          )}
        </button>

        {/* Primary Action Buttons Container */}
        <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
          {/* View / Preview Button */}
          <Link
            to={safeViewUrl}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-border/80"
          >
            <Eye className="w-4 h-4" />
            <span>{strings.preview}</span>
          </Link>

          {/* Download Button */}
          <a
            href={safeDownloadUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none min-h-[44px] px-4.5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{strings.download}</span>
          </a>
        </div>
      </div>
    </article>
  );
}