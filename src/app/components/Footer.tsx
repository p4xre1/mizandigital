"use client";

import React from "react";
import Link from "next/link";

export interface FooterProps {
  lang?: "ar" | "fr" | "en" | "es";
  dir?: "rtl" | "ltr";
}

export function Footer({ lang = "ar", dir = "rtl" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const content = {
    ar: {
      disclaimerTitle: "إخلاء المسؤولية القانوني",
      disclaimerText:
        "كافة المواد والأحكام المذكورة على منصة ميزان هي لأغراض الأرشيف والبحث الأكاديمي فقط. لا تُعتبر هذه المحتويات استشارة قانونية مهنية ولا تحل محل الاستعانة بمحامٍ أو مستشار قانوني مرخص.",
      policiesTitle: "السياسات والامتثال",
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
      policiesTitle: "Politiques & Conformité",
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
      policiesTitle: "Policies & Compliance",
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
      policiesTitle: "Políticas y Cumplimiento",
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
  const getPath = (href: string) => `/${lang}${href}`;

  return (
    <footer
      dir={dir}
      className="bg-slate-900 text-slate-200 pt-10 pb-8 px-4 border-t border-slate-800 text-xs sm:text-sm font-sans mt-auto select-none"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        
        {/* Column 1: Academic & Legal Disclaimer */}
        <div className="space-y-2">
          <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
            <span aria-hidden="true">⚖️</span>
            <span>{t.disclaimerTitle}</span>
          </h2>
          <p className="text-slate-300 leading-relaxed text-xs">
            {t.disclaimerText}
          </p>
        </div>

        {/* Column 2: Legal Policies & Links */}
        <div>
          <h2 className="text-white font-bold text-sm sm:text-base mb-2">
            {t.policiesTitle}
          </h2>
          <nav aria-label={t.policiesTitle}>
            <ul className="space-y-1">
              <li>
                <Link
                  href={getPath("/privacy")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center min-h-[44px] touch-manipulation active:scale-[0.99]"
                >
                  🔒 <span className="mx-2">{t.privacy}</span>
                </Link>
              </li>
              <li>
                <Link
                  href={getPath("/terms")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center min-h-[44px] touch-manipulation active:scale-[0.99]"
                >
                  📝 <span className="mx-2">{t.terms}</span>
                </Link>
              </li>
              <li>
                <Link
                  href={getPath("/cookies")}
                  className="text-slate-300 hover:text-white transition-colors flex items-center min-h-[44px] touch-manipulation active:scale-[0.99]"
                >
                  🛡️ <span className="mx-2">{t.cookies}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Column 3: Infrastructure Badges */}
        <div className="space-y-3">
          <h2 className="text-white font-bold text-sm sm:text-base">
            {t.techTitle}
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed">
            {t.techDesc}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700/80 font-mono">
              Vite / Next.js
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

      {/* Copyright Footer Line */}
      <div
        suppressHydrationWarning
        className="max-w-7xl mx-auto border-t border-slate-800/80 pt-6 text-center text-slate-400 text-xs"
      >
        {t.rights}
      </div>
    </footer>
  );
}