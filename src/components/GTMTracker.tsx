import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

export function GTMTracker() {
  const location = useLocation();

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];

    // Extract language prefix (e.g., 'ar', 'fr', 'en')
    const langMatch = location.pathname.match(/^\/(ar|fr|en)(\/|$)/);
    const currentLang = langMatch ? langMatch[1] : 'ar';

    // Push route + query parameters to GTM
    window.dataLayer.push({
      event: 'page_view',
      page_path: location.pathname + location.search, // e.g. /ar/library?category=family-law
      page_location: window.location.href,
      page_title: document.title,
      page_language: currentLang,
    });
  }, [location]);

  return null;
}