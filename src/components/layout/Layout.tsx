import React, { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Scale } from "lucide-react";
import { Navbar } from "./Navbar";
import { AuthModal } from "@/components/auth/AuthModal";
import { useLocalizedPath } from "@/lib/navigation";

interface LayoutProps {
  lang: "ar" | "fr" | "en" | "es";
  dir: "rtl" | "ltr";
}

export function Layout({ lang, dir }: LayoutProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const localizedPath = useLocalizedPath();

  const serifFont = (l: string) =>
    l === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)";

  const sansFont = (l: string) =>
    l === "ar" ? "var(--font-sans-ar)" : "var(--font-sans-en)";

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      brand_full: {
        ar: "منصة ميزان الرقمية",
        fr: "Plateforme Numérique Mizan",
        en: "Mizan Digital Platform",
        es: "Plataforma Digital Mizan",
      },
      motto: {
        ar: "الأرشيف الأكاديمي والاجتهادات القضائية الموحدة للباحثين والجامعات.",
        fr: "Archives académiques et jurisprudence unifiée pour les chercheurs et universités.",
        en: "Academic archives and unified legal jurisprudence for researchers and universities.",
        es: "Archivos académicos y jurisprudencia unificada para investigadores y universidades.",
      },
    };
    return translations[key]?.[lang] || key;
  };

  const footerCols = [
    {
      heading: {
        ar: "الأقسام والبحوث",
        fr: "Sections & Recherche",
        en: "Sections & Research",
        es: "Secciones e Investigación",
      },
      links: [
        {
          href: "/archive",
          label: {
            ar: "الأرشيف القانوني",
            fr: "Archives Juridiques",
            en: "Legal Archive",
            es: "Archivo Legal",
          },
        },
        {
          href: "/fields/family-law",
          label: {
            ar: "المكتبة الرقمية",
            fr: "Bibliothèque Numérique",
            en: "Digital Library",
            es: "Biblioteca Digital",
          },
        },
        {
          href: "/schools",
          label: {
            ar: "كليات الحقوق",
            fr: "Facultés de Droit",
            en: "Law Faculties",
            es: "Facultades de Derecho",
          },
        },
      ],
    },
    {
      heading: {
        ar: "المنصة والمؤسسة",
        fr: "Plateforme & Institution",
        en: "Platform & Institution",
        es: "Plataforma e Institución",
      },
      links: [
        {
          href: "/about",
          label: {
            ar: "عن منصة ميزان",
            fr: "À Propos de Mizan",
            en: "About Mizan",
            es: "Acerca de Mizan",
          },
        },
        {
          href: "/contact",
          label: {
            ar: "اتصل بنا",
            fr: "Contactez-nous",
            en: "Contact Us",
            es: "Contáctenos",
          },
        },
      ],
    },
  ];

  const legalLinks = [
    {
      href: "/legal#privacy",
      label: {
        ar: "سياسة الخصوصية",
        fr: "Politique de Confidentialité",
        en: "Privacy Policy",
        es: "Política de Privacidad",
      },
    },
    {
      href: "/legal#terms",
      label: {
        ar: "شروط الاستخدام",
        fr: "Conditions d'Utilisation",
        en: "Terms of Use",
        es: "Términos de Uso",
      },
    },
    {
      href: "/legal#cookies",
      label: {
        ar: "ملفات الكوكيز",
        fr: "Cookies",
        en: "Cookie Policy",
        es: "Política de Cookies",
      },
    },
  ];

  return (
    <div
      dir={dir}
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white"
    >
      {/* Top Header Navigation (No extra props passed) */}
      <Navbar />

      {/* Main Page Content */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer Section */}
      <footer className="w-full bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Real Internal Ad/Sponsorship Banner (No Premium/Enterprise) */}
          <div className="mb-10 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 via-slate-900/60 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {lang === "ar" ? "إعلان أكاديمي" : "Academic Sponsor"}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white">
                {lang === "ar"
                  ? "استكشف أحدث الأطروحات والاجتهادات القضائية"
                  : "Explore Latest Dissertations & Legal Precedents"}
              </h4>
              <p className="text-xs text-slate-300">
                {lang === "ar"
                  ? "وصول مباشر لقواعد البيانات والبحوث الجامعية الموثقة."
                  : "Direct access to verified academic research and judicial archives."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={localizedPath("/archive")}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
              >
                {lang === "ar" ? "تصفح الأرشيف" : "Browse Archive"}
              </Link>
              <Link
                to={localizedPath("/contact")}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
              >
                {lang === "ar" ? "أعلن معنا" : "Advertise"}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-200 dark:border-slate-800">
            {/* Brand Column */}
            <div className="lg:col-span-1 space-y-4">
              <Link to={localizedPath("/")} className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Scale size={18} className="text-white" />
                </div>
                <span
                  className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight"
                  style={{ fontFamily: serifFont(lang) }}
                >
                  {t("brand_full")}
                </span>
              </Link>
              <p
                className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
                style={{ fontFamily: sansFont(lang) }}
              >
                {t("motto")}
              </p>
            </div>

            {/* Links Columns */}
            {footerCols.map((col, idx) => (
              <div key={idx} className="space-y-3">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-200 tracking-wider uppercase">
                  {col.heading[lang]}
                </p>
                <ul className="space-y-2">
                  {col.links.map((lnk) => (
                    <li key={lnk.href}>
                      <Link
                        to={localizedPath(lnk.href)}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        style={{ fontFamily: sansFont(lang) }}
                      >
                        {lnk.label[lang]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Legal & Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} {t("brand_full")}. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {legalLinks.map((lnk) => (
                <Link
                  key={lnk.href}
                  to={localizedPath(lnk.href)}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {lnk.label[lang]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={lang}
        dir={dir}
      />
    </div>
  );
}