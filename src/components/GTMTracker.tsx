import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { ShieldCheck, Cookie, Check, X } from "lucide-react";

// Global window declaration for GTM dataLayer and Mizan Telemetry API
declare global {
  interface Window {
    // Fixed: Matches 'any[]' declaration from analytics.ts to prevent TS conflict
    dataLayer: any[];
    mizanTrackEvent?: (eventName: string, payload?: Record<string, unknown>) => void;
    mizanTrackMedia?: (mediaPayload: {
      type: "photo" | "file" | "document";
      id?: string;
      title: string;
      url: string;
      fileType?: string;
      altText?: string;
      keywords?: string[];
    }) => void;
  }
}

// Site Domain configuration for Google Analytics & Canonical Tracking
const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) ||
  (import.meta.env.VITE_APP_URL as string) ||
  "https://www.mizan.page";

// Sensitive Query Parameters to Redact (Military-Grade Security against PII leaks)
const SENSITIVE_QUERY_PARAMS = [
  "token",
  "access_token",
  "refresh_token",
  "password",
  "secret",
  "code",
  "auth",
  "api_key",
  "session",
  "verification_code",
];

// 4-Language Privacy & Telemetry UI Dictionary
const I18N_CONSENT = {
  ar: {
    title: "الخصوصية والتحليلات المشفرة",
    description:
      "نستخدم تحليلات مجهولة الهوية لتطوير منصة ميزان وتسهيل البحث القانوني.",
    accept: "موافقة وتفعيل",
    decline: "رفض التتبع",
    privacyNotice: "تشفير وأمان 256-bit",
  },
  fr: {
    title: "Confidentialité & Analytique Sécurisée",
    description:
      "Nous utilisons des données anonymisées pour améliorer la recherche juridique.",
    accept: "Accepter tout",
    decline: "Refuser",
    privacyNotice: "Chiffrement 256-bit",
  },
  en: {
    title: "Privacy & Encrypted Analytics",
    description:
      "We use anonymized telemetry to enhance Mizan legal platform experience.",
    accept: "Accept All",
    decline: "Decline",
    privacyNotice: "256-bit Military Security",
  },
  es: {
    title: "Privacidad y Analítica Cifrada",
    description:
      "Utilizamos datos anónimos para optimizar la plataforma jurídica Mizan.",
    accept: "Aceptar todo",
    decline: "Rechazar",
    privacyNotice: "Seguridad 256-bit",
  },
} as const;

type SupportedLang = keyof typeof I18N_CONSENT;

/**
 * Military-Grade URL Sanitizer
 * Redacts sensitive authentication tokens or credentials from analytics paths
 */
function sanitizeAnalyticsPath(pathname: string, search: string): string {
  if (!search) return pathname;
  try {
    const params = new URLSearchParams(search);
    let modified = false;

    SENSITIVE_QUERY_PARAMS.forEach((param) => {
      if (params.has(param)) {
        params.set(param, "[REDACTED]");
        modified = true;
      }
    });

    if (!modified) return `${pathname}${search}`;
    const cleanSearch = params.toString();
    return cleanSearch ? `${pathname}?${cleanSearch}` : pathname;
  } catch {
    return pathname;
  }
}

/**
 * Extracts Language from URL path or defaults to Arabic ('ar')
 */
function extractLanguage(pathname: string): SupportedLang {
  const match = pathname.match(/^\/(ar|fr|en|es)(\/|$)/i);
  return match ? (match[1].toLowerCase() as SupportedLang) : "ar";
}

export function GTMTracker() {
  const location = useLocation();
  const { role, isStaff, canWriteContent, loading: roleLoading } = useRole();

  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);

  // Detect language dynamically
  const currentLang = useMemo(
    () => extractLanguage(location.pathname),
    [location.pathname]
  );
  const strings = I18N_CONSENT[currentLang];

  // Initialize DataLayer and Consent Preferences
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];

    const storedConsent = localStorage.getItem("mizan_analytics_consent");
    if (storedConsent === "granted") {
      setConsentGiven(true);
      setShowBanner(false);
    } else if (storedConsent === "denied") {
      setConsentGiven(false);
      setShowBanner(false);
    } else {
      setConsentGiven(null);
      // Delayed presentation for smooth user landing experience
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Safe Generic Event Dispatcher Exposed Globally
  const trackCustomEvent = useCallback(
    (eventName: string, payload: Record<string, unknown> = {}) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: eventName,
        timestamp: new Date().toISOString(),
        site_domain: SITE_URL,
        page_language: currentLang,
        user_role: roleLoading ? "loading" : role,
        is_staff: isStaff,
        ...payload,
      });
    },
    [currentLang, role, isStaff, roleLoading]
  );

  // Master Photo & File Metadata Tracker Exposed Globally
  const trackMediaEvent = useCallback(
    (mediaPayload: {
      type: "photo" | "file" | "document";
      id?: string;
      title: string;
      url: string;
      fileType?: string;
      altText?: string;
      keywords?: string[];
    }) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "mizan_media_interaction",
        media_type: mediaPayload.type,
        media_id: mediaPayload.id || "N/A",
        media_title: mediaPayload.title,
        media_url: mediaPayload.url,
        media_file_type: mediaPayload.fileType || "unknown",
        media_alt_text: mediaPayload.altText || mediaPayload.title,
        media_keywords: (mediaPayload.keywords || []).join(", "),
        page_location: window.location.href,
        page_language: currentLang,
        timestamp: new Date().toISOString(),
      });
    },
    [currentLang]
  );

  // Attach Global Window Utility Functions
  useEffect(() => {
    window.mizanTrackEvent = trackCustomEvent;
    window.mizanTrackMedia = trackMediaEvent;
  }, [trackCustomEvent, trackMediaEvent]);

  // Handle Route Changes & Trigger Google Tag Manager Page View
  useEffect(() => {
    if (consentGiven === false) return;

    window.dataLayer = window.dataLayer || [];

    const safePath = sanitizeAnalyticsPath(
      location.pathname,
      location.search
    );
    const sanitizedFullUrl = `${SITE_URL}${safePath}`;

    // Deferred non-blocking GTM event execution
    const executionTimer = setTimeout(() => {
      window.dataLayer.push({
        event: "page_view",
        page_path: safePath,
        page_location: sanitizedFullUrl,
        page_title: document.title || "Mizan Legal Platform",
        page_language: currentLang,
        user_role: roleLoading ? "guest" : role,
        user_is_staff: isStaff,
        user_can_write: canWriteContent,
        site_domain: SITE_URL,
        seo_indexing_status: "index, follow",
      });
    }, 100);

    return () => clearTimeout(executionTimer);
  }, [location, currentLang, role, isStaff, canWriteContent, roleLoading, consentGiven]);

  // Accept Cookie / Telemetry Consent
  const handleAccept = () => {
    localStorage.setItem("mizan_analytics_consent", "granted");
    setConsentGiven(true);
    setShowBanner(false);
    trackCustomEvent("consent_granted", { category: "privacy" });
  };

  // Decline Cookie / Telemetry Consent
  const handleDecline = () => {
    localStorage.setItem("mizan_analytics_consent", "denied");
    setConsentGiven(false);
    setShowBanner(false);
  };

  return (
    <>
      {/* Master Google Search Engine JSON-LD Website Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          name: "Mizan",
          url: SITE_URL,
          inLanguage: currentLang,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/${currentLang}/library?search={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        })}
      </script>

      {/* Phones-First Mobile Privacy & Telemetry Notification Drawer */}
      {showBanner && (
        <aside
          role="dialog"
          aria-label={strings.title}
          className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:right-4 sm:left-auto sm:max-w-md z-50 bg-card/95 dark:bg-slate-900/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-4 transition-all duration-300 animate-in slide-in-from-bottom-5"
        >
          <div className="flex flex-col gap-3">
            {/* Header Line */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Cookie className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>{strings.title}</span>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>{strings.privacyNotice}</span>
              </div>

              <button
                type="button"
                onClick={handleDecline}
                aria-label="Close banner"
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {strings.description}
            </p>

            {/* Phones-First Actions (Min touch target 44px) */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
              >
                <Check className="w-4 h-4" />
                <span>{strings.accept}</span>
              </button>

              <button
                type="button"
                onClick={handleDecline}
                className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-all active:scale-95 flex items-center justify-center border border-border/80"
              >
                <span>{strings.decline}</span>
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}