import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Scale,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Archive,
  Info,
  Mail,
  FileText,
  Lock,
  Cookie,
  ChevronUp,
  Sparkles,
  Server,
  Zap,
  Globe2,
  ExternalLink,
  CheckCircle2,
  Building2,
  FileCode2
} from "lucide-react";

export interface FooterProps {
  lang?: "ar" | "fr" | "en" | "es";
  dir?: "rtl" | "ltr";
}

// Whitelist allowed languages to prevent route injection
const ALLOWED_LANGS = ["ar", "fr", "en", "es"] as const;

export function Footer({ lang = "ar", dir = "rtl" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  // Security: Sanitize incoming language parameter
  const safeLang = ALLOWED_LANGS.includes(lang) ? lang : "ar";

  // Localized route builder
  const l = (path: string) => {
    if (safeLang === "ar") return path;
    return `/${safeLang}${path === "/" ? "" : path}`;
  };

  // Safe Google AdSense Initializer
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.warn("Google Ads initialization bypassed in footer:", err);
    }
  }, []);

  // Smooth scroll to top handler for mobile UX
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const content = {
    ar: {
      brandTagline: "المنصة الرقمية الأولى للعلوم والتشريعات القانونية والاجتهاد القضائي",
      disclaimerTitle: "إخلاء المسؤولية القانوني",
      disclaimerText:
        "كافة المواد والأحكام المذكورة على منصة ميزان هي لأغراض الأرشيف والبحث الأكاديمي فقط. لا تُعتبر هذه المحتويات استشارة قانونية مهنية ولا تحل محل الاستعانة بمحامٍ أو مستشار قانوني مرخص.",
      menuTitle: "التصفح السريع",
      topicsTitle: "التخصصات القانونية",
      policiesTitle: "السياسات والامتثال",
      techTitle: "البنية التحتية والتقنيات",
      techDesc:
        "منظومة موثقة معززة بصلاحيات Row Level Security وموزعة عبر شبكة خوادم سحابية طرفية ذات أداء فائق.",
      home: "الرئيسية",
      library: "المكتبة الرقمية",
      schools: "كليات الحقوق (FSJES)",
      archive: "الأرشيف الجامعي",
      about: "عن منصة ميزان",
      contact: "اتصل بنا",
      privacy: "حماية البيانات والخصوصية",
      terms: "شروط الاستخدام والاستغلال",
      cookies: "ملفات الكوكيز والإشعار Legal Notice",
      backToTop: "للأعلى",
      seoKeywords: [
        "القانون المغربي",
        "مدونة الأسرة",
        "القانون الجنائي",
        "القانون التجاري",
        "الجريدة الرسمية",
        "ماستر الحقوق",
        "امتحانات FSJES",
        "القرارات القضائية"
      ],
      rights: `جميع الحقوق محفوظة © ${currentYear} — منصة ميزان الأكاديمية الرقمية`,
      systemStatus: "الأنظمة تعمل بنجاح 100%",
    },
    fr: {
      brandTagline: "La première plateforme digitale des sciences juridiques et jurisprudences.",
      disclaimerTitle: "Avertissement Légal",
      disclaimerText:
        "Tous les contenus et jurisprudences publiés sur la plateforme Mizan sont destinés exclusivement à la recherche académique et éducative. Ils ne constituent en aucun cas un conseil juridique formel.",
      menuTitle: "Navigation Principale",
      topicsTitle: "Domaines du Droit",
      policiesTitle: "Politiques & Conformité",
      techTitle: "Infrastructure Technique",
      techDesc:
        "Système sécurisé par des règles RLS Supabase et distribué à travers un réseau mondial Edge ultrarapide.",
      home: "Accueil",
      library: "Bibliothèque Numérique",
      schools: "Facultés de Droit (FSJES)",
      archive: "Archives Universitaires",
      about: "À propos de Mizan",
      contact: "Contactez-nous",
      privacy: "Politique de Confidentialité",
      terms: "Conditions Générales d'Utilisation",
      cookies: "Mentions Légales & Cookies",
      backToTop: "Haut de page",
      seoKeywords: [
        "Droit Marocain",
        "Code de la Famille",
        "Droit Pénal",
        "Droit Commercial",
        "Bulletin Officiel",
        "Master Droit Maroc",
        "Faculté FSJES",
        "Jurisprudence"
      ],
      rights: `Tous droits réservés © ${currentYear} — Plateforme Académique Mizan`,
      systemStatus: "Système 100% Opérationnel",
    },
    en: {
      brandTagline: "The premier digital platform for legal sciences, research, and jurisprudence.",
      disclaimerTitle: "Legal Disclaimer",
      disclaimerText:
        "All materials and judicial precedents on Mizan Platform are provided solely for academic research and educational purposes. They do not constitute formal legal advice or substitute licensed legal counsel.",
      menuTitle: "Main Navigation",
      topicsTitle: "Legal Domains",
      policiesTitle: "Policies & Compliance",
      techTitle: "Tech Stack & Infrastructure",
      techDesc:
        "Secured with Supabase Row Level Security (RLS) and accelerated via Cloudflare Global Edge CDN.",
      home: "Home",
      library: "Digital Library",
      schools: "Law Faculties (FSJES)",
      archive: "Academic Archive",
      about: "About Mizan",
      contact: "Contact Us",
      privacy: "Privacy & Data Protection",
      terms: "Terms of Service",
      cookies: "Legal Notice & Cookies",
      backToTop: "Back to top",
      seoKeywords: [
        "Moroccan Law",
        "Family Code",
        "Criminal Law",
        "Commercial Law",
        "Official Gazette",
        "Master of Laws",
        "FSJES Faculty",
        "Judicial Decisions"
      ],
      rights: `All rights reserved © ${currentYear} — Mizan Digital Academic Platform`,
      systemStatus: "All Systems Operational 100%",
    },
    es: {
      brandTagline: "La plataforma digital líder en ciencias jurídicas e investigación académica.",
      disclaimerTitle: "Aviso Legal",
      disclaimerText:
        "Todo el contenido y jurisprudencia publicados en la plataforma Mizan tienen únicamente fines educativos e investigación académica. No constituyen asesoramiento legal formal ni sustituyen a un abogado.",
      menuTitle: "Navegación Principal",
      topicsTitle: "Especialidades Legales",
      policiesTitle: "Políticas y Cumplimiento",
      techTitle: "Infraestructura Técnica",
      techDesc:
        "Asegurado con políticas RLS de Supabase y distribuido a través de una red global Edge.",
      home: "Inicio",
      library: "Biblioteca Digital",
      schools: "Facultades de Derecho",
      archive: "Archivo Académico",
      about: "Acerca de Mizan",
      contact: "Contacto",
      privacy: "Política de Privacidad",
      terms: "Términos del Servicio",
      cookies: "Aviso Legal y Cookies",
      backToTop: "Volver arriba",
      seoKeywords: [
        "Derecho Marroquí",
        "Código de Familia",
        "Derecho Penal",
        "Derecho Comercial",
        "Boletín Oficial",
        "Máster en Derecho",
        "Facultad FSJES",
        "Jurisprudencia"
      ],
      rights: `Todos los derechos reservados © ${currentYear} — Plataforma Digital Mizan`,
      systemStatus: "Sistemas 100% Operativos",
    },
  };

  const t = content[safeLang] || content.ar;

  // Master SEO Structured Schema Data
  const jsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Mizan Digital Platform",
    "url": "https://mizandigital.com",
    "logo": "https://mizandigital.com/logo.png",
    "description": t.brandTagline,
    "sameAs": [
      "https://facebook.com/mizandigital",
      "https://linkedin.com/company/mizandigital",
      "https://twitter.com/mizandigital"
    ]
  };

  return (
    <footer
      dir={dir}
      role="contentinfo"
      className="bg-slate-950 text-slate-300 pt-10 pb-8 px-4 sm:px-6 border-t border-slate-800/80 font-sans mt-auto select-none overflow-hidden relative"
    >
      {/* Embedded Master SEO Schema.org Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* ================= 1. GOOGLE ADSENSE FOOTER SLOT ================= */}
        <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-center overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 px-1">
            <span className="flex items-center gap-1 font-semibold text-amber-500">
              <Sparkles size={12} />
              {safeLang === "ar" ? "رعاية أكاديمية" : "Sponsored Placement"}
            </span>
            <span className="font-mono text-[9px] text-slate-400">AdSense Verified</span>
          </div>

          <div className="min-h-[90px] flex items-center justify-center">
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", minHeight: "90px" }}
              data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
              data-ad-slot="9876543210"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </div>

        {/* ================= 2. MAIN FOOTER CONTENT GRID ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
          
          {/* Column 1: Brand & SEO Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              to={l("/")}
              className="inline-flex items-center gap-2.5 group active:scale-98 transition-transform"
            >
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-slate-950 font-extrabold text-xl shadow-md">
                ⚖️
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black text-white tracking-tight flex items-center gap-1">
                  Mizan <span className="text-primary font-extrabold">Digital</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {t.brandTagline}
                </span>
              </div>
            </Link>

            {/* Disclaimer Text */}
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
              <h2 className="text-white font-bold text-xs flex items-center gap-1.5 text-amber-400">
                <ShieldCheck size={15} />
                <span>{t.disclaimerTitle}</span>
              </h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                {t.disclaimerText}
              </p>
            </div>

            {/* Master SEO Tag Cloud */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {safeLang === "ar" ? "كلمات مفتاحية شائعة" : "Popular Legal Keywords"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {t.seoKeywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-900 text-slate-300 text-[10px] px-2.5 py-1 rounded-lg border border-slate-800 hover:border-primary/40 transition-colors"
                  >
                    #{keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="space-y-3">
            <h2 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
              <BookOpen size={16} className="text-primary" />
              <span>{t.menuTitle}</span>
            </h2>
            <nav aria-label={t.menuTitle}>
              <ul className="space-y-1">
                <li>
                  <Link
                    to={l("/")}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <BookOpen size={14} className="text-slate-400" />
                    <span>{t.home}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to={l("/fields/family-law")}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <BookOpen size={14} className="text-slate-400" />
                    <span>{t.library}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to={l("/schools")}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <GraduationCap size={14} className="text-slate-400" />
                    <span>{t.schools}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to={l("/archive")}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <Archive size={14} className="text-slate-400" />
                    <span>{t.archive}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to={l("/about")}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <Info size={14} className="text-slate-400" />
                    <span>{t.about}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to={l("/contact")}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <Mail size={14} className="text-slate-400" />
                    <span>{t.contact}</span>
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Column 3: Legal Specializations */}
          <div className="space-y-3">
            <h2 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              <span>{t.topicsTitle}</span>
            </h2>
            <ul className="space-y-1">
              {[
                { name: safeLang === "ar" ? "قانون الأسرة والمداونة" : "Family Law & Code", path: "/fields/family-law" },
                { name: safeLang === "ar" ? "القانون الجنائي والمساطر" : "Criminal Law & Procedure", path: "/fields/criminal-law" },
                { name: safeLang === "ar" ? "القانون التجاري والشركات" : "Commercial & Corporate Law", path: "/fields/commercial-law" },
                { name: safeLang === "ar" ? "القانون الإداري والنزاعات" : "Administrative Law", path: "/fields/administrative-law" },
                { name: safeLang === "ar" ? "الجريدة الرسمية والنصوص" : "Official Gazette Documents", path: "/documents/official-journals" },
              ].map((item, i) => (
                <li key={i}>
                  <Link
                    to={l(item.path)}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center justify-between active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <span>{item.name}</span>
                    <ExternalLink size={12} className="text-slate-400 opacity-60" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Compliance & Policies */}
          <div className="space-y-3">
            <h2 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
              <Lock size={16} className="text-primary" />
              <span>{t.policiesTitle}</span>
            </h2>
            <nav aria-label={t.policiesTitle}>
              <ul className="space-y-1">
                <li>
                  <Link
                    to={l("/legal#privacy")}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <Lock size={14} className="text-emerald-400" />
                    <span>{t.privacy}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to={l("/legal#terms")}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <FileText size={14} className="text-blue-400" />
                    <span>{t.terms}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to={l("/legal#cookies")}
                    className="min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-900/80 px-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-95 touch-manipulation text-xs font-semibold"
                  >
                    <Cookie size={14} className="text-amber-400" />
                    <span>{t.cookies}</span>
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Infrastructure & Security Badges */}
            <div className="pt-2 space-y-2">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Server size={14} className="text-primary" />
                <span>{t.techTitle}</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                {t.techDesc}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="bg-slate-900 text-slate-300 text-[10px] px-2 py-0.5 rounded-md border border-slate-800 font-mono">
                  React 18 / Vite
                </span>
                <span className="bg-slate-900 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md border border-slate-800 font-mono">
                  Supabase RLS
                </span>
                <span className="bg-slate-900 text-amber-400 text-[10px] px-2 py-0.5 rounded-md border border-slate-800 font-mono">
                  Cloudflare Edge
                </span>
                <span className="bg-slate-900 text-blue-400 text-[10px] px-2 py-0.5 rounded-md border border-slate-800 font-mono">
                  TLS 1.3 Strict
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ================= 3. BOTTOM COPYRIGHT & ACCESSIBILITY BAR ================= */}
        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-start">
            <span className="font-medium">{t.rights}</span>
            <div className="hidden sm:block text-slate-800">•</div>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 size={13} />
              {t.systemStatus}
            </span>
          </div>

          {/* Back to Top Touch Target Button */}
          <button
            onClick={scrollToTop}
            aria-label={t.backToTop}
            className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 active:scale-95 transition-all flex items-center gap-2 cursor-pointer text-xs font-bold shrink-0"
          >
            <span>{t.backToTop}</span>
            <ChevronUp size={16} />
          </button>
        </div>

      </div>
    </footer>
  );
}