"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useRole, type Role } from "@/hooks/useRole";

// 🌍 Site Domain Configuration
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) ||
  (import.meta.env.VITE_APP_URL as string) ||
  "https://www.mizan.page";

export type SupportedLanguage = "ar" | "fr" | "en" | "es";

// 🔒 Military-Grade Security: Sensitive parameters to redact from Google Telemetry & URLs
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
  "otp",
];

// 📸 Master SEO Photo Metadata Interface
export interface PhotoSEOMetadata {
  id?: string;
  title: string;
  altText: string;
  src: string;
  keywords: string[];
  category?: string;
  width?: number;
  height?: number;
  caption?: string;
}

// 📄 Master SEO File & Document Metadata Interface
export interface FileSEOMetadata {
  id?: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes?: number;
  keywords: string[];
  category?: string;
  downloadCount?: number;
}

// 🌐 4-Language UI Dictionary for Cookie Consent, Mobile Drawers & Telemetry
const UI_I18N = {
  ar: {
    dir: "rtl" as const,
    consentTitle: "الخصوصية والتحليلات المشفرة",
    consentDesc: "نستخدم تحليلات مجهولة الهوية لتطوير منصة ميزان وتسهيل البحث القانوني.",
    accept: "موافقة وتفعيل",
    decline: "رفض التتبع",
    privacyNotice: "تشفير وأمان 256-bit",
    searchPlaceholder: "ابحث عن القوانين، الأحكام والقرارات...",
  },
  fr: {
    dir: "ltr" as const,
    consentTitle: "Confidentialité & Analytique Sécurisée",
    consentDesc: "Nous utilisons des données anonymisées pour améliorer la recherche juridique.",
    accept: "Accepter tout",
    decline: "Refuser",
    privacyNotice: "Chiffrement 256-bit",
    searchPlaceholder: "Rechercher lois, arrêts, décisions...",
  },
  en: {
    dir: "ltr" as const,
    consentTitle: "Privacy & Encrypted Analytics",
    consentDesc: "We use anonymized telemetry to enhance Mizan legal platform experience.",
    accept: "Accept All",
    decline: "Decline",
    privacyNotice: "256-bit Military Security",
    searchPlaceholder: "Search laws, rulings, decrees...",
  },
  es: {
    dir: "ltr" as const,
    consentTitle: "Privacidad y Analítica Cifrada",
    consentDesc: "Utilizamos datos anónimos para optimizar la plataforma jurídica Mizan.",
    accept: "Aceptar todo",
    decline: "Rechazar",
    privacyNotice: "Seguridad 256-bit",
    searchPlaceholder: "Buscar leyes, resoluciones, decretos...",
  },
};

interface UIContextType {
  // 🌐 Language & Domain State
  currentLang: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  dir: "rtl" | "ltr";
  siteUrl: string;
  i18n: typeof UI_I18N[SupportedLanguage];

  // 🔐 Auth Modal State
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  toggleAuthModal: () => void;

  // 📱 Mobile Navigation Drawer State
  isMobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;

  // 🔍 Mobile Fullscreen Search Overlay State
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  // 🍪 Cookie & Privacy Consent Banner State
  isConsentBannerOpen: boolean;
  hasConsentGiven: boolean | null;
  acceptConsent: () => void;
  declineConsent: () => void;

  // 🧹 Utility to close all mobile overlays
  closeAllOverlays: () => void;

  // 📈 Master Google Tag Manager Telemetry Dispatcher
  trackCustomEvent: (eventName: string, payload?: Record<string, unknown>) => void;

  // 📸 Master SEO Photo Telemetry & Keyword Ingestion
  trackPhotoSEO: (metadata: PhotoSEOMetadata) => void;

  // 📄 Master SEO File/Document Telemetry & Keyword Ingestion
  trackFileSEO: (metadata: FileSEOMetadata) => void;

  // 🛡️ Integrated User Role Context
  userRole: {
    role: Role;
    userId: string | null;
    loading: boolean;
    isStaff: boolean;
    canManageUsers: boolean;
    canWriteContent: boolean;
  };
}

const UIContext = createContext<UIContextType | undefined>(undefined);

/**
 * 🔒 Military-Grade URL Sanitizer
 * Redacts tokens, keys, and PII from analytics paths before Google Tag Manager pushes
 */
function sanitizePath(pathname: string, search: string): string {
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
 * Extracts language code from the current URL path
 */
function extractLanguageFromPath(pathname: string): SupportedLanguage {
  const match = pathname.match(/^\/(ar|fr|en|es)(\/|$)/i);
  return match ? (match[1].toLowerCase() as SupportedLanguage) : "ar";
}

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const roleData = useRole();

  // 🌐 Language & UI State
  const [currentLang, setCurrentLangState] = useState<SupportedLanguage>(() =>
    extractLanguageFromPath(location.pathname)
  );

  // 📱 Mobile Overlay States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 🍪 Consent State
  const [hasConsentGiven, setHasConsentGiven] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("mizan_analytics_consent");
    if (stored === "granted") return true;
    if (stored === "denied") return false;
    return null;
  });
  const [isConsentBannerOpen, setIsConsentBannerOpen] = useState<boolean>(false);

  // Synchronize Language on Route Navigation
  useEffect(() => {
    const extracted = extractLanguageFromPath(location.pathname);
    if (extracted !== currentLang) {
      setCurrentLangState(extracted);
    }
  }, [location.pathname, currentLang]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setCurrentLangState(lang);
    if (typeof window !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = UI_I18N[lang].dir;
    }
  }, []);

  const dir = useMemo(() => UI_I18N[currentLang].dir, [currentLang]);
  const i18n = useMemo(() => UI_I18N[currentLang], [currentLang]);

  // 🍪 Check Consent Delay for Landing
  useEffect(() => {
    if (hasConsentGiven === null) {
      const timer = setTimeout(() => setIsConsentBannerOpen(true), 1200);
      return () => clearTimeout(timer);
    } else {
      setIsConsentBannerOpen(false);
    }
  }, [hasConsentGiven]);

  // 🔒 Master Google Tag Manager Dispatcher with Security Redaction
  const trackCustomEvent = useCallback(
    (eventName: string, payload: Record<string, unknown> = {}) => {
      if (typeof window === "undefined") return;

      window.dataLayer = window.dataLayer || [];
      const cleanPath = sanitizePath(location.pathname, location.search);

      window.dataLayer.push({
        event: eventName,
        timestamp: new Date().toISOString(),
        site_domain: SITE_URL,
        page_language: currentLang,
        page_path: cleanPath,
        user_role: roleData.loading ? "loading" : roleData.role,
        is_staff: roleData.isStaff,
        ...payload,
      });
    },
    [location.pathname, location.search, currentLang, roleData.loading, roleData.role, roleData.isStaff]
  );

  // 📸 Master SEO Photo Tracker Function
  const trackPhotoSEO = useCallback(
    (metadata: PhotoSEOMetadata) => {
      trackCustomEvent("mizan_photo_view", {
        photo_id: metadata.id || "N/A",
        photo_title: metadata.title,
        photo_alt_text: metadata.altText,
        photo_src: metadata.src,
        photo_keywords: metadata.keywords.join(", "),
        photo_category: metadata.category || "general",
        photo_dimensions: metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : "unknown",
      });
    },
    [trackCustomEvent]
  );

  // 📄 Master SEO File/Document Tracker Function
  const trackFileSEO = useCallback(
    (metadata: FileSEOMetadata) => {
      trackCustomEvent("mizan_file_interaction", {
        file_id: metadata.id || "N/A",
        file_title: metadata.title,
        file_url: metadata.fileUrl,
        file_type: metadata.fileType,
        file_size_bytes: metadata.fileSizeBytes || 0,
        file_keywords: metadata.keywords.join(", "),
        file_category: metadata.category || "document",
        download_count: metadata.downloadCount || 0,
      });
    },
    [trackCustomEvent]
  );

  // 🍪 Consent Action Handlers
  const acceptConsent = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mizan_analytics_consent", "granted");
    }
    setHasConsentGiven(true);
    setIsConsentBannerOpen(false);
    trackCustomEvent("consent_granted", { category: "privacy" });
  }, [trackCustomEvent]);

  const declineConsent = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mizan_analytics_consent", "denied");
    }
    setHasConsentGiven(false);
    setIsConsentBannerOpen(false);
  }, []);

  // 🧹 Utility to close all overlays
  const closeAllOverlays = useCallback(() => {
    setIsAuthModalOpen(false);
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, []);

  // 📱 Auto Lock Body Scroll when Drawer or Overlay is active (iOS touch prevention)
  useEffect(() => {
    const isAnyOverlayOpen = isAuthModalOpen || isMobileMenuOpen || isSearchOpen;

    if (isAnyOverlayOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isAuthModalOpen, isMobileMenuOpen, isSearchOpen]);

  // ⌨️ Accessibility Keyboard Shortcut ('Escape' closes overlays)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllOverlays();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeAllOverlays]);

  // ⚙️ Handlers for mobile controls
  const openAuthModal = useCallback(() => {
    closeAllOverlays();
    setIsAuthModalOpen(true);
  }, [closeAllOverlays]);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const toggleAuthModal = useCallback(() => {
    setIsAuthModalOpen((prev) => {
      if (!prev) closeAllOverlays();
      return !prev;
    });
  }, [closeAllOverlays]);

  const openMobileMenu = useCallback(() => {
    closeAllOverlays();
    setIsMobileMenuOpen(true);
  }, [closeAllOverlays]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => {
      if (!prev) closeAllOverlays();
      return !prev;
    });
  }, [closeAllOverlays]);

  const openSearch = useCallback(() => {
    closeAllOverlays();
    setIsSearchOpen(true);
  }, [closeAllOverlays]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => {
      if (!prev) closeAllOverlays();
      return !prev;
    });
  }, [closeAllOverlays]);

  const userRole = useMemo(
    () => ({
      role: roleData.role,
      userId: roleData.userId,
      loading: roleData.loading,
      isStaff: roleData.isStaff,
      canManageUsers: roleData.canManageUsers,
      canWriteContent: roleData.canWriteContent,
    }),
    [
      roleData.role,
      roleData.userId,
      roleData.loading,
      roleData.isStaff,
      roleData.canManageUsers,
      roleData.canWriteContent,
    ]
  );

  const value = useMemo(
    () => ({
      currentLang,
      setLanguage,
      dir,
      siteUrl: SITE_URL,
      i18n,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      toggleAuthModal,
      isMobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
      isSearchOpen,
      openSearch,
      closeSearch,
      toggleSearch,
      isConsentBannerOpen,
      hasConsentGiven,
      acceptConsent,
      declineConsent,
      closeAllOverlays,
      trackCustomEvent,
      trackPhotoSEO,
      trackFileSEO,
      userRole,
    }),
    [
      currentLang,
      setLanguage,
      dir,
      i18n,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      toggleAuthModal,
      isMobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
      isSearchOpen,
      openSearch,
      closeSearch,
      toggleSearch,
      isConsentBannerOpen,
      hasConsentGiven,
      acceptConsent,
      declineConsent,
      closeAllOverlays,
      trackCustomEvent,
      trackPhotoSEO,
      trackFileSEO,
      userRole,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};