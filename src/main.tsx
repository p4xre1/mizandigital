import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

// 🚀 Site Domain Configuration
const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) || "https://www.mizan.page";

/**
 * Dynamically injects Schema.org WebSite JSON-LD for Google search engine indexing.
 */
function injectWebSiteSchema() {
  if (typeof document === "undefined") return;

  const SCRIPT_ID = "mizan-schema-website";
  if (document.getElementById(SCRIPT_ID)) return;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "منصة ميزان الرقمية - Mizan Digital",
    "alternateName": [
      "منصة ميزان القانونية المغربية",
      "Mizan Law Morocco",
      "Plateforme Numérique Mizan Maroc"
    ],
    "url": SITE_URL,
    "description": "المرجع الأول للباحثين القانونيين والمحامين في المغرب - أرشيف قانوني شامل، النصوص التشريعية المحدثة، ومدونة الأسرة والشغل.",
    "inLanguage": ["ar-MA", "fr-MA", "ar", "fr", "en"],
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/ar/archive?search={search_term_string}`
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

/**
 * Registers PWA Service Worker for zero-lag mobile loading and offline legal access.
 */
function registerServiceWorker() {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("⚡ [Mizan PWA] Service Worker registered:", reg.scope);

          // Check for new updates on site load
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("🔄 [Mizan PWA] New version available! Refresh to update.");
                }
              };
            }
          };
        })
        .catch((err) => {
          console.error("❌ [Mizan PWA] Service Worker registration failed:", err);
        });
    });
  }
}

// 1. Inject structured SEO metadata for Google Morocco
injectWebSiteSchema();

// 2. Enable offline PWA capabilities for smartphones
registerServiceWorker();

// 3. Mount React Root securely
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root container missing: Failed to find element with id 'root'. Check index.html."
  );
}

// Render React App wrapped in StrictMode
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);