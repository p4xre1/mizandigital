import React from "react";
import { Link } from "react-router-dom";
import { useLocalizedPath } from "@/lib/navigation";

export interface FooterProps {
  lang?: "ar" | "fr" | "en" | "es";
  dir?: "rtl" | "ltr";
}

export function Footer({ lang = "ar", dir = "rtl" }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const l = useLocalizedPath();

  const content = {
    ar: {
      disclaimerTitle: "إخلاء المسؤولية القانوني",
      disclaimerText:
        "كافة المواد والأحكام المذكورة على منصة ميزان هي لأغراض الأرشيف والبحث الأكاديمي فقط. لا تُعتبر هذه المحتويات استشارة قانونية مهنية ولا تحل محل الاستعانة بمحامٍ أو مستشار قانوني مرخص.",
      menuTitle: "القائمة الرئيسية",
      policiesTitle: "السياسات والامتثال",
      home: "الرئيسية",
      library: "المكتبة القانونية",
      archive: "الأرشيف القانوني",
      pricing: "الاشتراكات الباقات",
      about: "عن المنصة",
      contact: "اتصل بنا",
      privacy: "سياسة الخصوصية وحماية البيانات",
      terms: "شروط الخدمة والاستخدام",
      cookies: "الإشعار القانوني وملفات الكوكيز",
      techTitle: "البنية التحتية والتقنيات",
      techDesc:
        "منظومة موثقة معززة بصلاحيات Row Level Security وموزعة عبر شبكة خوادم سحابية طرفية.",
      rights: `جميع الحقوق محفوظة © ${currentYear} — منصة ميزان الأكاديمية الرقمية`,
    },
    fr: {
      disclaimerTitle: "Avertissement Légal",
      disclaimerText:
        "Tous les contenus et jurisprudences publiés sur la plateforme Mizan sont destinés exclusivement à la recherche académique et éducative. Ils ne constituent en aucun cas un conseil juridique formel.",
      menuTitle: "Navigation Principal",
      policiesTitle: "Politiques & Conformité",
      home: "Accueil",
      library: "Bibliothèque",
      archive: "Archives",
      pricing: "Tarifs & Premium",
      about: "À propos",
      contact: "Contact",
      privacy: "Politique de Confidentialité",
      terms: "Conditions Générales d'Utilisation",
      cookies: "Mentions Légales & Cookies",
      techTitle: "Infrastructure Technique",
      techDesc:
        "Système sécurisé par règles RLS et distribué à travers un réseau mondial Edge.",
      rights: `Tous droits réservés © ${currentYear} — Plateforme Académique Mizan`,
    },
    en: {
      disclaimerTitle: "Legal Disclaimer",
      disclaimerText:
        "All materials and judicial precedents on Mizan Platform are provided solely for academic research and educational purposes. They do not constitute formal legal advice or substitute licensed legal counsel.",
      menuTitle: "Main Navigation",
      policiesTitle: "Policies & Compliance",
      home: "Home",
      library: "Library",
      archive: "Archive",
      pricing: "Pricing & Plans",
      about: "About Us",
      contact: "Contact",
      privacy: "Privacy & Data Protection Policy",
      terms: "Terms of Service",
      cookies: "Legal Notice & Cookies",
      techTitle: "Tech Stack & Infrastructure",
      techDesc:
        "Secured with Supabase Row Level Security and accelerated via Cloudflare Global Edge network.",
      rights: `All rights reserved © ${currentYear} — Mizan Digital Academic Platform`,
    },
    es: {
      disclaimerTitle: "Aviso Legal",
      disclaimerText:
        "Todo el contenido y jurisprudencia publicados en la plataforma Mizan tienen únicamente fines educativos e investigación académica. No constituyen asesoramiento legal formal ni sustituyen a un abogado.",
      menuTitle: "Navegación Principal",
      policiesTitle: "Políticas y Cumplimiento",
      home: "Inicio",
      library: "Biblioteca",
      archive: "Archivo",
      pricing: "Precios y Plan Premium",
      about: "Acerca de",
      contact: "Contacto",
      privacy: "Política de Privacidad",
      terms: "Términos del Servicio",
      cookies: "Aviso Legal y Cookies",
      techTitle: "Infraestructura Técnica",
      techDesc:
        "Asegurado con políticas RLS y distribuido a través de una red global Edge.",
      rights: `Todos los derechos reservados © ${currentYear} — Plataforma Digital Mizan`,
    },
  };

  const t = content[lang] || content.ar;

  return (
    <footer
      dir={dir}
      className="bg-slate-900 text-slate-200 pt-10 pb-8 px-4 border-t border-slate-800 text-xs sm:text-sm font-sans mt-auto select-none"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        
        {/* Column 1: Disclaimer */}
        <div className="space-y-2 md:col-span-1">
          <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
            <span aria-hidden="true">⚖️</span>
            <span>{t.disclaimerTitle}</span>
          </h2>
          <p className="text-slate-300 leading-relaxed text-xs">
            {t.disclaimerText}
          </p>
        </div>

        {/* Column 2: Main Menu Navigation Links */}
        <div>
          <h2 className="text-white font-bold text-sm sm:text-base mb-2">
            {t.menuTitle}
          </h2>
          <nav aria-label={t.menuTitle}>
            <ul className="space-y-1">
              <li>
                <Link
                  to={l("/")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center py-1 touch-manipulation"
                >
                  🏠 <span className="mx-2">{t.home}</span>
                </Link>
              </li>
              <li>
                <Link
                  to={l("/library")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center py-1 touch-manipulation"
                >
                  📚 <span className="mx-2">{t.library}</span>
                </Link>
              </li>
              <li>
                <Link
                  to={l("/archive")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center py-1 touch-manipulation"
                >
                  🎓 <span className="mx-2">{t.archive}</span>
                </Link>
              </li>
              <li>
                <Link
                  to={l("/pricing")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center py-1 touch-manipulation"
                >
                  ✨ <span className="mx-2">{t.pricing}</span>
                </Link>
              </li>
              <li>
                <Link
                  to={l("/about")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center py-1 touch-manipulation"
                >
                  ℹ️ <span className="mx-2">{t.about}</span>
                </Link>
              </li>
              <li>
                <Link
                  to={l("/contact")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center py-1 touch-manipulation"
                >
                  📬 <span className="mx-2">{t.contact}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Column 3: Legal Policies & Links */}
        <div>
          <h2 className="text-white font-bold text-sm sm:text-base mb-2">
            {t.policiesTitle}
          </h2>
          <nav aria-label={t.policiesTitle}>
            <ul className="space-y-1">
              <li>
                <Link
                  to={l("/legal")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center py-1 touch-manipulation"
                >
                  🔒 <span className="mx-2">{t.privacy}</span>
                </Link>
              </li>
              <li>
                <Link
                  to={l("/legal")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center py-1 touch-manipulation"
                >
                  📝 <span className="mx-2">{t.terms}</span>
                </Link>
              </li>
              <li>
                <Link
                  to={l("/legal")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center py-1 touch-manipulation"
                >
                  🛡️ <span className="mx-2">{t.cookies}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Column 4: Infrastructure Badges */}
        <div className="space-y-3">
          <h2 className="text-white font-bold text-sm sm:text-base">
            {t.techTitle}
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed">
            {t.techDesc}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700/80 font-mono">
              Vite / React
            </span>
            <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700/80 font-mono">
              Supabase RLS
            </span>
            <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700/80 font-mono">
              Cloudflare Edge
            </span>
          </div>
        </div>

      </div>

      {/* Copyright Line */}
      <div className="max-w-7xl mx-auto border-t border-slate-800/80 pt-6 text-center text-slate-400 text-xs">
        {t.rights}
      </div>
    </footer>
  );
}