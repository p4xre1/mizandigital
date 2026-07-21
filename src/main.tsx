import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./imports/routes";
import { I18nProvider } from "./app/lib/i18n";
import "./styles/globals.css";

// 🚀 Site Domain Configuration
const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) || "https://mizanmaroc.qzz.io";

/**
 * Dynamically injects Schema.org WebSite JSON-LD for rich search results.
 * Supports multi-language search endpoints across Arabic, French, English, and Spanish.
 */
function injectWebSiteSchema() {
  if (typeof document === "undefined") return;

  const SCRIPT_ID = "mizan-schema-website";
  if (document.getElementById(SCRIPT_ID)) return;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Mizan Digital Platform",
    "alternateName": [
      "منصة ميزان الرقمية",
      "Plateforme Numérique Mizan",
      "Plataforma Digital Mizan"
    ],
    "url": SITE_URL,
    "description": "المرجع الأول للباحثين القانونيين والمحامين - أرشيف قانوني شامل ونصوص تشريعية محدثة.",
    "inLanguage": ["ar", "fr", "en", "es"],
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/{lang}/archive?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schemaData);
  document.head.appendChild(script);
}

// Inject structured SEO metadata
injectWebSiteSchema();

// Mount React Root securely
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root container missing: Failed to find element with id 'root'. Check index.html."
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  </React.StrictMode>
);