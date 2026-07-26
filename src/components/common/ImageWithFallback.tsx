"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ShieldAlert, ImageOff, Sparkles } from "lucide-react";

// Default Mizan Legal & Academic SEO keywords for Google Image Indexing
const SITE_DOMAIN =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  "https://www.mizan.page";

const DEFAULT_SEO_ALT =
  "منصة ميزان الرقمية - العلوم القانونية والاجتهاد القضائي المغربي | Mizan Legal Digital Portal";

const DEFAULT_SEO_KEYWORDS =
  "ميزان, Mizan, Droit Marocain, الاجتهاد القضائي, تحرير قانوني, صياغة المذكرات, Legal Drafting, Morocco Law";

export interface ImageWithFallbackProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Mark as high priority for LCP (Largest Contentful Paint) optimization above the fold on mobile */
  priority?: boolean;
  /** Custom fallback container class names */
  fallbackClassName?: string;
  /** Custom SEO Keywords to inject into data attribute for search engine crawlers */
  seoKeywords?: string;
  /** Aspect ratio container style (e.g., 'aspect-video', 'aspect-square', 'aspect-[4/3]') */
  aspectRatioClassName?: string;
  /** Enable subtle zoom on hover for rich UI cards */
  hoverZoom?: boolean;
}

/**
 * Military-Grade URL Protocol Sanitization
 * Blocks unsafe protocols like `javascript:`, `data:text/html`, or malicious execution payloads.
 */
function isSafeImageUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();

  // Allow safe relative paths
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return true;
  }

  try {
    const baseOrigin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.mizan.page";
    const parsed = new URL(trimmed, baseOrigin);

    // Strictly enforce safe HTTP/HTTPS and Blob protocols
    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "blob:"
    );
  } catch {
    return false;
  }
}

/**
 * Crisp SVG Fallback Icon (Mizan Emblem Style)
 */
function MizanFallbackEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      className={className}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="10" y="10" width="44" height="44" rx="12" className="opacity-40" />
      <path d="M32 18v28M20 26l12-6 12 6M18 36h8M38 36h8" />
      <circle cx="22" cy="38" r="4" className="fill-current opacity-30" />
      <circle cx="42" cy="38" r="4" className="fill-current opacity-30" />
      <path d="M26 46h12" />
    </svg>
  );
}

export function ImageWithFallback({
  src,
  alt,
  style,
  className = "",
  fallbackClassName = "",
  aspectRatioClassName = "",
  onError,
  onLoad,
  loading,
  priority = false,
  seoKeywords = DEFAULT_SEO_KEYWORDS,
  hoverZoom = false,
  decoding = "async",
  crossOrigin = "anonymous",
  referrerPolicy = "strict-origin-when-cross-origin",
  ...rest
}: ImageWithFallbackProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [didError, setDidError] = useState(false);
  const [isUnsafe, setIsUnsafe] = useState(false);

  // Validate security protocol whenever src changes
  useEffect(() => {
    setIsLoading(true);
    setDidError(false);

    if (src && !isSafeImageUrl(src)) {
      setIsUnsafe(true);
      setDidError(true);
      setIsLoading(false);
    } else {
      setIsUnsafe(false);
    }
  }, [src]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setDidError(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    setIsLoading(false);
    setDidError(true);
    if (onError) {
      onError(e); // Preserve parent component tracking
    }
  };

  // Optimized SEO alt attribute fallback
  const computedAlt = useMemo(() => {
    if (alt && alt.trim().length > 0) {
      return alt.trim();
    }
    return DEFAULT_SEO_ALT;
  }, [alt]);

  // Handle Unsafe Protocol or Loading Failure
  if (didError || !src) {
    return (
      <div
        className={`relative inline-flex flex-col items-center justify-center min-h-[120px] w-full bg-slate-100 dark:bg-slate-900/80 text-slate-400 dark:text-slate-500 rounded-2xl border border-dashed border-border/80 p-4 transition-all overflow-hidden select-none ${aspectRatioClassName} ${fallbackClassName}`}
        role="img"
        aria-label={computedAlt}
        data-seo-domain={SITE_DOMAIN}
        data-seo-keywords={seoKeywords}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {isUnsafe ? (
            <div className="flex items-center gap-1.5 text-rose-500 font-mono text-[11px] bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
              <ShieldAlert size={14} />
              <span>Unsafe URL Blocked</span>
            </div>
          ) : (
            <MizanFallbackEmblem className="w-10 h-10 text-slate-400/70 dark:text-slate-600" />
          )}

          <span className="text-[11px] font-semibold text-muted-foreground/80 dir-rtl line-clamp-1 max-w-[85%]">
            {isUnsafe ? "تم حظر المصدر لدواعي أمنية" : "صورة غير متاحة | Mizan Digital"}
          </span>
        </div>

        {/* SEO Structured Metadata for Crawlers */}
        <span className="sr-only" itemProp="caption">
          {computedAlt}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden w-full h-full ${aspectRatioClassName}`}
    >
      {/* Mobile-First Fast Skeleton Shimmer Animation */}
      {isLoading && (
        <div
          className="absolute inset-0 z-10 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse rounded-inherit flex items-center justify-center"
          aria-hidden="true"
        >
          <Sparkles className="w-5 h-5 text-slate-400/40 animate-spin" />
        </div>
      )}

      {/* Main Image with Fast Hardware Acceleration & Touch Optimization */}
      <img
        src={src}
        alt={computedAlt}
        loading={priority ? "eager" : loading || "lazy"}
        // @ts-ignore - fetchPriority is supported in modern mobile browsers
        fetchpriority={priority ? "high" : "auto"}
        decoding={decoding}
        crossOrigin={crossOrigin}
        referrerPolicy={referrerPolicy}
        itemProp="image"
        data-seo-keywords={seoKeywords}
        data-mizan-origin={SITE_DOMAIN}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`w-full h-full object-cover transform-gpu transition-all duration-500 ease-out touch-manipulation ${
          isLoading ? "scale-95 blur-xs opacity-0" : "scale-100 blur-0 opacity-100"
        } ${hoverZoom ? "group-hover:scale-105" : ""} ${className}`}
        style={style}
        {...rest}
      />
    </div>
  );
}

export default ImageWithFallback;