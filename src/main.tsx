import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./imports/routes";
import { I18nProvider } from "./app/lib/i18n";
import "./styles/globals.css"; // or "./styles/index.css" depending on your project import

// 🚀 Site Domain Configuration
const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) || "https://mizanmaroc.qzz.io";

// 🚀 Inject Schema.org WebSite Structured Data dynamically
const schemaData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Mizan Digital Platform",
  "alternateName": "منصة ميزان الرقمية",
  "url": SITE_URL,
  "description":
    "المرجع الأول للباحثين القانونيين في المغرب - أرشيف جامعي شامل ووظائف تشريعية محدثة.",
  "inLanguage": ["ar", "en", "fr", "es"],
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${SITE_URL}/{lang}/archive?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

// Prevent duplicate injection during HMR / re-renders
if (!document.getElementById("mizan-schema-website")) {
  const script = document.createElement("script");
  script.id = "mizan-schema-website";
  script.type = "application/ld+json";
  script.text = JSON.stringify(schemaData);
  document.head.appendChild(script);
}

// Render React Root
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  </React.StrictMode>
);