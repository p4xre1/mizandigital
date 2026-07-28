import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./styles/globals.css";
import {
    SITE_URL,
    generatePhotoSeoSchema,
    generateDocumentSeoSchema,
} from "./lib/supabase";
import { initGA } from "./lib/analytics";

/**
 * 🛡️ Security Hardening & Console Protection for Production
 */
function applySecurityHardening(): void {
    if (import.meta.env.PROD) {
        const noop = () => {};
        console.log = noop;
        console.info = noop;
        console.debug = noop;
        console.warn = noop;
    }
}

/**
 * 🚀 Quad-Lingual Master SEO & Structured Data Injection
 */
function injectMasterSeoSchema(): void {
    if (typeof document === "undefined") return;

    const SCRIPT_ID = "mizan-master-schema";
    if (document.getElementById(SCRIPT_ID)) return;

    // Utilize photo & document SEO schema generators for root static assets
    const logoSchema = generatePhotoSeoSchema(
        {
            url: `${SITE_URL}/Logo.svg`,
            altText: {
                ar: "شعار منصة ميزان",
                fr: "Logo Mizan",
                en: "Mizan Logo",
                es: "Logo Mizan",
            },
            title: {
                ar: "ميزان الرقمية",
                fr: "Mizan Digital",
                en: "Mizan Digital",
                es: "Mizan Digital",
            },
            keywords: ["mizan", "logo", "legal", "morocco"],
            dimensions: { width: 512, height: 512 },
        },
        "ar"
    );

    const manifestDocSchema = generateDocumentSeoSchema(
        {
            fileUrl: `${SITE_URL}/manifest.json`,
            filename: "manifest.json",
            title: {
                ar: "بيانات تطبيق ميزان",
                fr: "Mizan PWA Manifest",
                en: "Mizan PWA Manifest",
                es: "Mizan PWA Manifest",
            },
            keywords: ["pwa", "manifest", "mizan"],
        },
        "ar"
    );

    const schemaData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: SITE_URL,
                name: "منصة ميزان الرقمية | Mizan Law & Digital Platform",
                alternateName: [
                    "Mizan Morocco",
                    "Plateforme Juridique Mizan",
                    "Plataforma Legal Mizan",
                    "ميزان المغرب",
                ],
                description:
                    "المرجع الرقمي الأول للعلوم القانونية، الاجتهاد القضائي، والوثائق الرسمية بالمغرب (عربي، فرنسي، إنجليزي، إسباني).",
                inLanguage: ["ar-MA", "fr-MA", "en-US", "es-ES"],
                potentialAction: {
                    "@type": "SearchAction",
                    target: {
                        "@type": "EntryPoint",
                        urlTemplate: `${SITE_URL}/ar/archive?search={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                },
            },
            logoSchema,
            manifestDocSchema,
        ],
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schemaData);
    document.head.appendChild(script);
}

/**
 * 📱 Mobile-First PWA Registration & Mobile Touch Fix
 */
function registerPwaAndMobileOptimizations(): void {
    if (typeof window === "undefined") return;

    document.documentElement.style.touchAction = "manipulation";

    if ("serviceWorker" in navigator && import.meta.env.PROD) {
        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (
                                    installingWorker.state === "installed" &&
                                    navigator.serviceWorker.controller
                                ) {
                                    // SW Updated
                                }
                            };
                        }
                    };
                })
                .catch((err) => {
                    console.error("❌ [PWA] Service Worker failed:", err);
                });
        });
    }
}

// 🚀 Startup Initializations
initGA();
applySecurityHardening();
injectMasterSeoSchema();
registerPwaAndMobileOptimizations();

// 🖥️ Mount React Application
const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Root element '#root' not found in index.html");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <HelmetProvider>
            <App />
        </HelmetProvider>
    </React.StrictMode>
);