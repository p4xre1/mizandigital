// Google Analytics 4 helpers
// Set your GA4 Measurement ID in .env: VITE_GA_ID=G-XXXXXXXXXX

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function initGA() {
  if (!GA_ID || typeof window === "undefined") return;
  if (document.getElementById("ga-script")) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args) { window.dataLayer.push(args); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

export function trackPageView(path: string, title?: string) {
  if (!GA_ID || typeof window?.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window?.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

// Track article read
export function trackArticleRead(articleId: string, title: string, category: string) {
  trackEvent("article_read", { article_id: articleId, article_title: title, category });
}

// Track PDF download
export function trackPDFDownload(articleId: string, title: string) {
  trackEvent("pdf_download", { article_id: articleId, article_title: title });
}

// Track search
export function trackSearch(query: string, results: number) {
  trackEvent("search", { search_term: query, results_count: results });
}
