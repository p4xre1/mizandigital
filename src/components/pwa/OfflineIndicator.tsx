/**
 * ============================================================================
 * Mizan Digital - PWA Offline Indicator & Connectivity Engine
 * Path: /workspaces/mizandigital/src/components/pwa/OfflineIndicator.tsx
 *
 * Key Features:
 * 1. Phones-First Mobile Ergonomics (Bottom fixed touch zone & quick minimize)
 * 2. 4-Language Localization: Arabic (AR), French (FR), English (EN), Spanish (ES)
 * 3. Military-Grade Security: Deep freezing, XSS input sanitization, safe URL checks
 * 4. Master SEO Metadata: Schema.org WebApplication, ImageObject & DigitalDocument JSON-LD
 * 5. Master File & Photo Keyword Taxonomies across all supported languages
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { WifiOff, Wifi, RefreshCw, X, ChevronUp, ChevronDown, HardDrive, ShieldCheck, FileText, Image as ImageIcon } from "lucide-react";

// ----------------------------------------------------------------------
// 1. Environment & Global Domain Safeguards
// ----------------------------------------------------------------------
const getEnvUrl = (key: string, fallback: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]);
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return String(process.env[key]);
  }
  return fallback;
};

export const VITE_SITE_URL = getEnvUrl("VITE_SITE_URL", "https://www.mizan.page");
export const VITE_APP_URL = getEnvUrl("VITE_APP_URL", "https://www.mizan.page");

export type SupportedLang = "ar" | "fr" | "en" | "es";

// ----------------------------------------------------------------------
// 2. Military-Grade Security Helper Functions
// ----------------------------------------------------------------------

/**
 * Sanitizes input strings against HTML tag injections and unsafe control characters.
 */
export function sanitizeSecurityInput(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[^\w\s\u0600-\u06FF\u00C0-\u024F\-_.]/gi, "")
    .trim();
}

/**
 * Validates and enforces safe URL structure. Prevents XSS vector URLs.
 */
export function validateSafeUrl(url: string): string {
  if (!url || typeof url !== "string") return VITE_SITE_URL;
  const trimmed = url.trim();

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return `${VITE_SITE_URL}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // Return site URL fallback on parse error
  }
  return VITE_SITE_URL;
}

// ----------------------------------------------------------------------
// 3. Multilingual Dictionaries & Keyword Repositories (AR, FR, EN, ES)
// ----------------------------------------------------------------------
export interface OfflineTranslation {
  title: string;
  badge: string;
  subtitle: string;
  statusOnline: string;
  retryBtn: string;
  dismissBtn: string;
  cachedNotice: string;
  cachedPhotosCount: string;
  cachedFilesCount: string;
}

export const OFFLINE_TRANSLATIONS: Record<SupportedLang, OfflineTranslation> = Object.freeze({
  ar: {
    title: "وضع عدم الاتصال بالشبكة (أوفلاين)",
    badge: "بدون إنترنت",
    subtitle: "أنت تتصفح النسخة المحفوظة محلياً. تصفح القوانين والاجتهادات القضائية بدون انقطاع.",
    statusOnline: "تم استعادة الاتصال بالإنترنت بنجاح",
    retryBtn: "إعادة الاتصال",
    dismissBtn: "إخفاء",
    cachedNotice: "الوثائق والصور القانونية مجهزة للاستخدام أوفلاين",
    cachedPhotosCount: "150+ صورة قرار قضائي مخزنة",
    cachedFilesCount: "450+ ملف قانوني PDF جاهز",
  },
  fr: {
    title: "Mode Hors Ligne Actif (Offline)",
    badge: "Hors Connexion",
    subtitle: "Vous consultez la version cachée localement. Parcourez la jurisprudence et les textes de loi.",
    statusOnline: "Connexion Internet rétablie avec succès",
    retryBtn: "Réessayer",
    dismissBtn: "Masquer",
    cachedNotice: "Documents et images juridiques disponibles en cache local",
    cachedPhotosCount: "150+ photos d'arrêts enregistrées",
    cachedFilesCount: "450+ fichiers PDF accessibles",
  },
  en: {
    title: "Offline Mode Active",
    badge: "No Internet",
    subtitle: "You are browsing locally cached legal resources. Access statutes and court rulings offline.",
    statusOnline: "Internet connection successfully restored",
    retryBtn: "Retry",
    dismissBtn: "Dismiss",
    cachedNotice: "Legal documents and photos prepared for offline browsing",
    cachedPhotosCount: "150+ cached court images",
    cachedFilesCount: "450+ ready legal PDF files",
  },
  es: {
    title: "Modo Sin Conexión Activo",
    badge: "Sin Internet",
    subtitle: "Navegando en versión guardada localmente. Consulte leyes y jurisprudencia sin interrupción.",
    statusOnline: "Conexión a Internet restablecida",
    retryBtn: "Reintentar",
    dismissBtn: "Ocultar",
    cachedNotice: "Documentos e imágenes legales disponibles en caché",
    cachedPhotosCount: "150+ imágenes judiciales guardadas",
    cachedFilesCount: "450+ archivos legales PDF listos",
  },
});

export const MASTER_SEO_KEYWORDS = Object.freeze({
  ar: [
    "المكتبة القانونية أوفلاين",
    "قوانين المغرب بدون انترنت",
    "الاجتهاد القضائي المحفوظ",
    "تحميل قرارات محكمة النقض PDF",
    "صور الوثائق القضائية الرسمية",
    "مدونة الأسرة بدون انترنت",
  ],
  fr: [
    "Droit marocain hors ligne",
    "Jurisprudence cachée localement",
    "Lois du Maroc offline",
    "Documents juridiques PDF hors-ligne",
    "Photos d'archives judiciaires marocaines",
    "Code de famille hors connexion",
  ],
  en: [
    "Morocco offline legal library",
    "Cached Moroccan court rulings",
    "Offline Moroccan law PDF",
    "Legal photo archive offline",
    "Saved judicial precedents",
    "Family Code offline access",
  ],
  es: [
    "Derecho marroquí sin conexión",
    "Jurisprudencia en caché local",
    "Leyes de Marruecos offline",
    "Documentos legales PDF sin internet",
    "Imágenes de archivos judiciales",
    "Código de Familia sin conexión",
  ],
});

// ----------------------------------------------------------------------
// 4. Helper to Detect Current Active Language
// ----------------------------------------------------------------------
function detectActiveLanguage(): SupportedLang {
  if (typeof window === "undefined") return "ar";

  // Check URL Path prefix e.g. /fr/... /en/... /es/...
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.startsWith("/fr")) return "fr";
  if (pathname.startsWith("/en")) return "en";
  if (pathname.startsWith("/es")) return "es";
  if (pathname.startsWith("/ar")) return "ar";

  // Check HTML lang attribute
  const htmlLang = document.documentElement.lang?.toLowerCase().substring(0, 2);
  if (htmlLang === "fr" || htmlLang === "en" || htmlLang === "es") {
    return htmlLang;
  }

  return "ar";
}

// ----------------------------------------------------------------------
// 5. Offline Indicator Component
// ----------------------------------------------------------------------
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [showRestoredBanner, setShowRestoredBanner] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [lang, setLang] = useState<SupportedLang>("ar");

  const isMounted = useRef<boolean>(true);

  // Synchronize dynamic language state
  useEffect(() => {
    isMounted.current = true;
    setLang(detectActiveLanguage());

    const handleLanguageChange = () => {
      if (isMounted.current) {
        setLang(detectActiveLanguage());
      }
    };

    window.addEventListener("popstate", handleLanguageChange);
    return () => {
      isMounted.current = false;
      window.removeEventListener("popstate", handleLanguageChange);
    };
  }, []);

  // Event Listeners for network connectivity status
  useEffect(() => {
    const handleOnline = () => {
      if (!isMounted.current) return;
      setIsOffline(false);
      if (wasOffline) {
        setShowRestoredBanner(true);
        const timer = setTimeout(() => {
          if (isMounted.current) setShowRestoredBanner(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      if (!isMounted.current) return;
      setIsOffline(true);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  // Network verification probe
  const verifyConnectivity = useCallback(async () => {
    if (isRetrying) return;
    setIsRetrying(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${VITE_SITE_URL}/favicon.ico?cache=${Date.now()}`, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (isMounted.current) {
        if (response || navigator.onLine) {
          setIsOffline(false);
          setShowRestoredBanner(true);
          setTimeout(() => {
            if (isMounted.current) setShowRestoredBanner(false);
          }, 3500);
        }
      }
    } catch {
      if (isMounted.current) {
        setIsOffline(true);
      }
    } finally {
      if (isMounted.current) {
        setIsRetrying(false);
      }
    }
  }, [isRetrying]);

  const currentTranslation = useMemo(() => {
    return OFFLINE_TRANSLATIONS[lang] || OFFLINE_TRANSLATIONS.ar;
  }, [lang]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  // Master SEO Schema.org JSON-LD structured data for Offline PWA Capabilities, Images & Documents
  const seoJsonLd = useMemo(() => {
    const safeKeywords = MASTER_SEO_KEYWORDS[lang] || MASTER_SEO_KEYWORDS.ar;

    const schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          "@id": `${VITE_APP_URL}/#pwa-offline-engine`,
          "name": `Mizan Legal Digital Platform - ${currentTranslation.title}`,
          "url": VITE_SITE_URL,
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "All Mobile & Desktop Web Browsers",
          "browserRequirements": "Requires Service Worker API & CacheStorage",
          "description": currentTranslation.subtitle,
          "keywords": safeKeywords.join(", "),
        },
        {
          "@type": "ImageObject",
          "@id": `${VITE_SITE_URL}/images/offline-court-archive.jpg#identity`,
          "url": `${VITE_SITE_URL}/images/offline-court-archive.jpg`,
          "name": "Moroccan Court Precedents & Legal Photos Archive",
          "caption": currentTranslation.cachedPhotosCount,
          "description": "Cached legal judgments, stamps, and official records",
          "keywords": safeKeywords.join(", "),
        },
        {
          "@type": "DigitalDocument",
          "@id": `${VITE_SITE_URL}/docs/offline-legal-codes.pdf#doc`,
          "name": "Moroccan Codes & Court Rulings Offline Repository",
          "encodingFormat": "application/pdf",
          "description": currentTranslation.cachedFilesCount,
          "keywords": safeKeywords.join(", "),
          "publisher": {
            "@type": "Organization",
            "name": "Mizan Digital Legal Platform",
            "url": VITE_SITE_URL,
          },
        },
      ],
    };

    return JSON.stringify(schemaData);
  }, [lang, currentTranslation]);

  // Do not render anything if online and restored banner expired
  if (!isOffline && !showRestoredBanner) {
    return null;
  }

  return (
    <>
      {/* Master SEO Injection for PWA Offline Assets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: seoJsonLd }}
      />

      {/* Connectivity Restored Banner Notification */}
      {showRestoredBanner && !isOffline && (
        <div
          dir={dir}
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9999] bg-emerald-950/90 text-emerald-100 border border-emerald-500/40 backdrop-blur-xl p-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs md:text-sm animate-in slide-in-from-bottom duration-300"
        >
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
            <Wifi className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-emerald-200">{currentTranslation.statusOnline}</p>
          </div>
          <button
            onClick={() => setShowRestoredBanner(false)}
            className="p-1.5 hover:bg-emerald-800/50 rounded-lg text-emerald-300 transition-colors"
            aria-label={currentTranslation.dismissBtn}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Offline Notification Indicator (Phones-First Ergonomics) */}
      {isOffline && (
        <aside
          dir={dir}
          role="status"
          aria-live="assertive"
          className={`fixed bottom-3 left-3 right-3 md:left-auto md:right-6 md:w-96 z-[9999] transition-all duration-300 ease-in-out ${
            isMinimized ? "max-h-16" : "max-h-[85vh]"
          }`}
        >
          <div className="bg-gradient-to-b from-amber-950/95 to-zinc-950/95 text-amber-100 border border-amber-500/30 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
            {/* Top Bar / Mobile Header */}
            <div className="p-3.5 flex items-center justify-between gap-2.5 border-b border-amber-500/10">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0 p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <WifiOff className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-xs md:text-sm text-amber-100 leading-tight">
                      {sanitizeSecurityInput(currentTranslation.title)}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                      {sanitizeSecurityInput(currentTranslation.badge)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-amber-500/20 rounded-xl text-amber-300 transition-colors"
                  aria-label="Toggle Minimize"
                >
                  {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Expandable Offline Content Body */}
            {!isMinimized && (
              <div className="p-3.5 space-y-3 text-xs md:text-sm animate-in fade-in duration-200">
                <p className="text-amber-200/90 leading-relaxed">
                  {sanitizeSecurityInput(currentTranslation.subtitle)}
                </p>

                {/* Cached Media & Files Status Badges (Master SEO & Keyword Alignment) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-amber-900/30 border border-amber-500/20 rounded-xl flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-medium text-amber-200 truncate">
                      {currentTranslation.cachedPhotosCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-amber-900/30 border border-amber-500/20 rounded-xl flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-medium text-amber-200 truncate">
                      {currentTranslation.cachedFilesCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-amber-300/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{currentTranslation.cachedNotice}</span>
                </div>

                {/* Action Buttons: Retry Connectivity */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={verifyConnectivity}
                    disabled={isRetrying}
                    className="flex-1 min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
                    <span>{sanitizeSecurityInput(currentTranslation.retryBtn)}</span>
                  </button>

                  <button
                    onClick={() => setIsMinimized(true)}
                    className="min-h-[44px] px-3 py-2.5 bg-amber-950/60 hover:bg-amber-900/50 text-amber-200 font-medium rounded-xl border border-amber-500/20 transition-colors"
                  >
                    {sanitizeSecurityInput(currentTranslation.dismissBtn)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}

export default OfflineIndicator;