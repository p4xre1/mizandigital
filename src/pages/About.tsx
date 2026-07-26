import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Scale,
  BookOpen,
  Users,
  Zap,
  CheckCircle2,
  Globe2,
  Building2,
  Sparkles,
  FileText,
  KeyRound,
  Database,
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Award,
} from "lucide-react";

import { useI18n, serifFont, sansFont } from "@/lib/i18n";
import { useSeo } from "@/lib/seo";
import { useRole } from "@/hooks/useRole";
import ImageWithFallback from "@/components/common/ImageWithFallback";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";

export default function About() {
  const { lang, dir } = useI18n();
  const { role, isStaff, isAdmin, isSecurityAdmin, isRoot } = useRole();

  // Dynamic Translations for 4 Languages
  const t = useMemo(() => {
    const dict = {
      ar: {
        pageTitle: "عن منصة ميزان — المنصة الرقمية للحقوق والعلوم القانونية بالمغرب",
        pageDescription:
          "تعرّف على منصة ميزان، المرجع القانوني الرقمي الأول بالمغرب لتجميع، توثيق وأرشفة النصوص التشريعية، اجتهادات محكمة النقض، وأرشيف كليات الحقوق FSJES بأعلى معايير الأمان الرقمي.",
        heroBadge: "أمان واستقرار عسكري للأبحاث القانونية",
        heroHeading: "المجلة القانونية الرقمية الأولى بالمملكة المغربية",
        heroSubheading:
          "نوفر للباحثين، المحامين، والقضاة والطلبة بيئة رقمية متكاملة وسريعة للوصول إلى النصوص التشريعية والاجتهادات القضائية بمرجعية معتمدة وحماية فائقة للبيانات.",
        exploreLibrary: "استكشف المكتبة الرقمية",
        contactUs: "تواصل مع فريق التحرير",
        
        // Stats
        statDocs: "+50,000",
        statDocsLabel: "وثيقة ونص قانوني",
        statSec: "99.99%",
        statSecLabel: "حماية وتشفير عسكري",
        statLangs: "4 لغات",
        statLangsLabel: "عربي - فرنسي - إنجليزي - إسباني",
        statSpeed: "< 100ms",
        statSpeedLabel: "زمن استجابة فائق السرعة",

        // Mission & Vision
        missionTitle: "رسالتنا ورؤيتنا المستقبلية",
        missionSubtitle: "تمكين المجتمع القانوني المغربي من الحصول المعلومة القانونية بسرعة ودقة استثنائية.",
        p1Title: "الرقمنة الشاملة للتشريع",
        p1Desc: "أرشفة كافة النصوص التشريعية المنشورة بالجريدة الرسمية وتصنيفها بدقة وفق القطاعات القانونية.",
        p2Title: "دعم الباحث الجامعي",
        p2Desc: "توفير المراجع والمواريث الأكاديمية لمختلف كليات العلوم القانونية والاقتصادية والاجتماعية (FSJES).",
        p3Title: "حماية البيانات بصرامة",
        p3Desc: "تطبيق قواعد الأمان العسكري في إدارة الأدوار وتشفير الاتصالات لمنع الاختراق وضمان الاعتمادية.",

        // Security Highlights
        securitySectionTitle: "بنية تحتية بأمان عسكري (Military-Grade Security)",
        securityBadge: "ISO/IEC 27001 Prepared Architecture",
        sec1Title: "تشفير البيانات والاتصالات (End-to-End Integrity)",
        sec1Desc: "نستخدم تشفير TLS 1.3 مع معايير AES-256 لتأمين الاتصالات وإدارة الجلسات ومنع الهجمات المعتمدة على الهوية.",
        sec2Title: "إدارة الصلاحيات متعددة المستويات (Advanced RBAC)",
        sec2Desc: "منظومة صلاحيات دقيقة تشمل (Root, Security Admin, Admin, Marketer, Writer, Member, Guest) للتحكم الصارم في إنشاء وتعديل المحتوى.",
        sec3Title: "سجلات المراجعة الفورية (Real-time Audit Logs)",
        sec3Desc: "تتبع وتوثيق كل إجراء ينفذ عبر القاعدة البيانات العامة والخاصة لمنع أي تعديل غير مصرح به على التشريعات.",

        // Photo & SEO Assets
        galleryTitle: "معرض التوثيق والتحليل القانوني",
        gallerySubtitle: "صور عالية الجودة موثقة ومحسنة لمحركات البحث ومفهرسة بالكلمات المفتاحية القانونية.",
        img1Alt: "منصة ميزان الرقمية لأرشفة النصوص القانونية والاجتهادات القضائية المغربية",
        img1Title: "قوانين المغرب والجريدة الرسمية - منصة ميزان",
        img1Caption: "توثيق شامل للنصوص التنظيمية والمراسيم الوزارية",
        img2Alt: "أرشيف كليات الحقوق FSJES ومذكرات الماستر ودلائل الامتحانات",
        img2Title: "الأرشيف الجامعي لمواد القانون S1 - S6",
        img2Caption: "دعم كامل لطلاب الماستر والدكتوراه والطلبة الباحثين",

        // Role Banner
        roleBannerTitle: "مستوى الوصول الحالي الخاص بك",
        roleBannerStaff: "أنت تبحر حالياً بصلاحيات كادر تحريري / إداري مميز.",
        roleBannerGuest: "أنت تتصفح المنصة كزائر. يمكنك تسجيل الدخول للاستفادة من كامل الخصائص.",

        // FAQ
        faqTitle: "الأسئلة الشائعة حول منصة ميزان",
        q1: "هل النصوص والقوانين المنشورة على ميزان رسمية؟",
        a1: "نعم، يتم مطابقة جميع النصوص والقوانين بصفة دورية مع الجريدة الرسمية للجمهورية والوزارات المعنية.",
        q2: "كيف تضمن منصة ميزان أمان بيانات المستخدمين؟",
        a2: "نعتمد على تقنيات تشفير عالية الحماية وبنية Supabase RLS لمنع الوصول غير المصرح به للبيانات الشخصية.",
        
        // CTA
        ctaHeading: "هل أنت جاهز للتبحر في العصر الرقمي للحقوق؟",
        ctaBtn: "تصفح المكتبة القانونية الآن",
      },
      fr: {
        pageTitle: "À propos de Mizan — La plateforme juridique numérique au Maroc",
        pageDescription:
          "Découvrez Mizan, la première référence juridique numérique au Maroc pour la documentation, l'archivage législatif, la jurisprudence de la Cour de Cassation et les archives FSJES.",
        heroBadge: "Sécurité de Niveau Militaire & Ultra-Rapide",
        heroHeading: "La Première Revue Juridique Numérique au Maroc",
        heroSubheading:
          "Nous offrons aux chercheurs, avocats, magistrats et étudiants un environnement numérique performant et sécurisé pour accéder aux textes de loi et jurisprudences.",
        exploreLibrary: "Explorer la bibliothèque",
        contactUs: "Contacter la rédaction",
        
        statDocs: "+50 000",
        statDocsLabel: "Documents & Textes de Loi",
        statSec: "99.99%",
        statSecLabel: "Chiffrement Militaire Mil-Spec",
        statLangs: "4 Langues",
        statLangsLabel: "Arabe - Français - Anglais - Espagnol",
        statSpeed: "< 100ms",
        statSpeedLabel: "Temps de Réponse Ultra Rapide",

        missionTitle: "Notre Mission & Vision",
        missionSubtitle: "Rendre l'information juridique marocaine accessible, exacte et sécurisée.",
        p1Title: "Digitalisation de la Législation",
        p1Desc: "Archivage rigoureux des textes du Bulletin Officiel classés par domaine juridique.",
        p2Title: "Soutien aux Étudiants FSJES",
        p2Desc: "Mise à disposition des examens, cours et annales pour les facultés de droit au Maroc.",
        p3Title: "Protection Maximale des Données",
        p3Desc: "Politiques strictes de contrôle d'accès basé sur les rôles (RBAC) et chiffrement continu.",

        securitySectionTitle: "Infrastructure avec Sécurité de Niveau Militaire",
        securityBadge: "Architecture Conforme aux Normes ISO/IEC 27001",
        sec1Title: "Intégrité & Chiffrement de Bout en Bout",
        sec1Desc: "Connexions sécurisées via TLS 1.3, AES-256 et gestion rigoureuse des sessions.",
        sec2Title: "Gestion des Rôles Avancée (RBAC)",
        sec2Desc: "Système multi-niveaux (Root, Security Admin, Admin, Marketer, Writer, Member, Guest).",
        sec3Title: "Journaux d'Audit en Temps Réel",
        sec3Desc: "Traçabilité intégrale de chaque modification opérée dans la base de données.",

        galleryTitle: "Galerie de Documentation & Analyse Juridique",
        gallerySubtitle: "Images optimisées pour le référencement naturel (SEO) avec balisage sémantique.",
        img1Alt: "Plateforme numérique Mizan pour l'archivage juridique au Maroc",
        img1Title: "Lois du Maroc et Bulletin Officiel - Mizan",
        img1Caption: "Documentation complète des textes réglementaires et décrets",
        img2Alt: "Archives des facultés de droit FSJES Maroc et concours Master",
        img2Title: "Archives Universitaires Droit S1 - S6",
        img2Caption: "Support complet pour étudiants chercheurs et juristes",

        roleBannerTitle: "Votre Niveau d'Accès Actuel",
        roleBannerStaff: "Vous naviguez actuellement avec un rôle privilégié du staff.",
        roleBannerGuest: "Vous visitez en tant qu'invité. Connectez-vous pour plus de fonctionnalités.",

        faqTitle: "Foire Aux Questions",
        q1: "Les textes publiés sur Mizan sont-ils conformes au Bulletin Officiel ?",
        a1: "Oui, tous les textes sont vérifiés et mis à jour régulièrement.",
        q2: "Comment la plateforme garantit-elle la sécurité des données ?",
        a2: "Grâce au chiffrement avancé et aux règles de sécurité au niveau des lignes Supabase (RLS).",

        ctaHeading: "Prêt à explorer le Droit Marocain Numérique ?",
        ctaBtn: "Parcourir la Bibliothèque",
      },
      en: {
        pageTitle: "About Mizan — The Premier Digital Legal Platform in Morocco",
        pageDescription:
          "Learn about Mizan, Morocco's leading digital legal journal for legislative documentation, Court of Cassation rulings, and FSJES law school archives built with military-grade security.",
        heroBadge: "Military-Grade Security & Mobile First",
        heroHeading: "Morocco's Premier Digital Legal Platform",
        heroSubheading:
          "Empowering researchers, lawyers, judges, and students with an ultra-fast, encrypted digital ecosystem for legal texts, decrees, and academic research.",
        exploreLibrary: "Explore Digital Library",
        contactUs: "Contact Editorial Board",

        statDocs: "+50,000",
        statDocsLabel: "Legal Texts & Decrees",
        statSec: "99.99%",
        statSecLabel: "Military-Grade Encryption",
        statLangs: "4 Languages",
        statLangsLabel: "Arabic - French - English - Spanish",
        statSpeed: "< 100ms",
        statSpeedLabel: "Ultra-Fast Response Time",

        missionTitle: "Our Mission & Core Vision",
        missionSubtitle: "Democratizing access to verified Moroccan legal intelligence with zero compromise on security.",
        p1Title: "Comprehensive Codification",
        p1Desc: "Indexing Official Gazette publications across civil, criminal, commercial, and administrative sectors.",
        p2Title: "Academic Empowerment",
        p2Desc: "Providing university archives (S1-S6) and Master entrance exam repositories for FSJES students.",
        p3Title: "Zero-Trust Data Protection",
        p3Desc: "Implementing strict Role-Based Access Control (RBAC) and cryptographically audited database operations.",

        securitySectionTitle: "Military-Grade Infrastructure & Security",
        securityBadge: "ISO/IEC 27001 Ready Enterprise Stack",
        sec1Title: "End-to-End Cryptographic Integrity",
        sec1Desc: "TLS 1.3 protocol, AES-256 data payload encryption, and hardened session tokens.",
        sec2Title: "Tiered Role-Based Access Control (RBAC)",
        sec2Desc: "Granular capability flags for Root, Security Admin, Admin, Marketer, Writer, Member, and Guest roles.",
        sec3Title: "Real-Time Immutable Audit Logging",
        sec3Desc: "Complete database tracing ensuring no unauthorized tampering of statutory laws.",

        galleryTitle: "Legal Documentation & Digital Archives",
        gallerySubtitle: "SEO-optimized media tagged with comprehensive legal search keywords.",
        img1Alt: "Mizan digital platform for Moroccan law and judicial rulings archive",
        img1Title: "Moroccan Laws & Official Gazette - Mizan Platform",
        img1Caption: "Complete codification of ministerial decrees and constitutional texts",
        img2Alt: "FSJES Law school archive and university Master entry exam papers",
        img2Title: "University Legal Archive Semesters S1 to S6",
        img2Caption: "Full academic repository for law students and legal researchers",

        roleBannerTitle: "Your Current Access Tier",
        roleBannerStaff: "You are currently browsing with verified Staff / Administrative permissions.",
        roleBannerGuest: "You are currently viewing as a guest user. Sign in for complete feature access.",

        faqTitle: "Frequently Asked Questions",
        q1: "Are the legal documents on Mizan verified against official sources?",
        a1: "Yes, all legal texts undergo continuous cross-referencing with the Kingdom's Official Gazette.",
        q2: "How does Mizan safeguard user confidentiality and system data?",
        a2: "We enforce strict Supabase Row-Level Security (RLS) policies and enterprise-grade encryption.",

        ctaHeading: "Ready to Explore the Future of Legal Tech?",
        ctaBtn: "Browse Digital Library",
      },
      es: {
        pageTitle: "Sobre Mizan — Plataforma Digital Jurídica en Marruecos",
        pageDescription:
          "Conozca Mizan, la plataforma digital líder en Marruecos para documentación legislativa, jurisprudencia de la Corte de Casación y archivos universitarios FSJES.",
        heroBadge: "Seguridad Militar y Altísima Velocidad",
        heroHeading: "La Primera Revista Jurídica Digital de Marruecos",
        heroSubheading:
          "Proporcionamos a investigadores, abogados y estudiantes un entorno digital rápido y seguro para acceder a leyes, decretos y jurisprudencia.",
        exploreLibrary: "Explorar la Biblioteca",
        contactUs: "Contactar a la Redacción",

        statDocs: "+50.000",
        statDocsLabel: "Documentos y Textos Legales",
        statSec: "99.99%",
        statSecLabel: "Encriptación de Grado Militar",
        statLangs: "4 Idiomas",
        statLangsLabel: "Árabe - Francés - Inglés - Español",
        statSpeed: "< 100ms",
        statSpeedLabel: "Tiempo de Respuesta Ultrarrápido",

        missionTitle: "Nuestra Misión y Visión",
        missionSubtitle: "Facilitar el acceso rápido, preciso y seguro a la información jurídica marroquí.",
        p1Title: "Digitalización de la Legislación",
        p1Desc: "Archivado riguroso de los textos del Boletín Oficial categorizados por ramas del derecho.",
        p2Title: "Apoyo Académico Universitario",
        p2Desc: "Repositorio de exámenes y recursos para las facultades de derecho FSJES de Marruecos.",
        p3Title: "Protección Estricta de Datos",
        p3Desc: "Implementación de control de acceso basado en roles (RBAC) y máxima seguridad criptográfica.",

        securitySectionTitle: "Infraestructura con Seguridad de Grado Militar",
        securityBadge: "Arquitectura Preparada ISO/IEC 27001",
        sec1Title: "Encriptación y Cifrado Extremo a Extremo",
        sec1Desc: "Garantizado mediante protocolos TLS 1.3, cifrado AES-256 y gestión segura de sesiones.",
        sec2Title: "Control de Acceso Basado en Roles (RBAC)",
        sec2Desc: "Acceso multinivel (Root, Security Admin, Admin, Marketer, Writer, Member, Guest).",
        sec3Title: "Auditoría en Tiempo Real",
        sec3Desc: "Trazabilidad completa de modificaciones para evitar alteraciones no autorizadas.",

        galleryTitle: "Galería de Documentación y Análisis Legal",
        gallerySubtitle: "Imágenes optimizadas para motores de búsqueda con metadatos y palabras clave.",
        img1Alt: "Plataforma digital Mizan para archivo jurídico y decisiones judiciales en Marruecos",
        img1Title: "Leyes de Marruecos y Boletín Oficial - Mizan",
        img1Caption: "Documentación completa de decretos gubernamentales y textos legales",
        img2Alt: "Archivos universitarios FSJES Marruecos y exámenes de Master",
        img2Title: "Archivos Universitarios de Derecho S1 a S6",
        img2Caption: "Soporte integral para estudiantes e investigadores del derecho",

        roleBannerTitle: "Su Nivel de Acceso Actual",
        roleBannerStaff: "Actualmente está navegando con permisos especiales de personal/administración.",
        roleBannerGuest: "Está navegando como invitado. Inicie sesión para acceder a todas las funciones.",

        faqTitle: "Preguntas Frecuentes",
        q1: "¿Los textos legales publicados en Mizan son oficiales?",
        a1: "Sí, todos los textos se verifican y actualizan periódicamente con el Boletín Oficial.",
        q2: "¿Cómo garantiza Mizan la seguridad de los datos?",
        a2: "A través de encriptación avanzada y políticas de seguridad Row-Level Security (RLS) en Supabase.",

        ctaHeading: "¿Listo para explorar el derecho digital marroquí?",
        ctaBtn: "Explorar la Biblioteca",
      },
    };
    return dict[lang] || dict.ar;
  }, [lang]);

  // Master SEO Hooks
  useSeo(
    {
      title: t.pageTitle,
      description: t.pageDescription,
      path: "/about",
      lang,
      keywords: [
        "منصة ميزان القانونية",
        "المجلة القانونية المغربية",
        "الجريدة الرسمية المغرب",
        "اجتهادات محكمة النقض",
        "قانون الأسرة المغربي",
        "القانون الجنائي المغربي",
        "FSJES Morocco Law",
        "Moroccan Legal Tech",
        "Mizan Digital Legal Journal",
        "Revue Juridique Marocaine",
      ],
    },
    [lang]
  );

  // Master JSON-LD Schemas for Search Engines
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Mizan Digital Legal Platform — منصة ميزان",
    "url": SITE_URL,
    "logo": `${SITE_URL}/Logo.svg`,
    "sameAs": [
      "https://facebook.com/mizanpage",
      "https://twitter.com/mizanpage",
      "https://linkedin.com/company/mizanpage"
    ],
    "description": t.pageDescription,
  };

  const schemaAbout = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "mainEntity": {
      "@type": "Organization",
      "name": "Mizan Platform",
      "url": SITE_URL,
    },
    "name": t.pageTitle,
    "description": t.pageDescription,
    "inLanguage": lang,
  };

  const schemaBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": lang === "ar" ? "الرئيسية" : "Home",
        "item": `${SITE_URL}/${lang}`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": lang === "ar" ? "من نحن" : "About Us",
        "item": `${SITE_URL}/${lang}/about`
      }
    ]
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground transition-colors duration-200 antialiased selection:bg-primary/20 selection:text-primary"
      dir={dir}
    >
      {/* Inject JSON-LD Rich Snippets for Master SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaAbout) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumbs) }}
      />

      {/* Hero Section — Mobile First & Google Speed Optimized */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background pt-8 pb-12 md:pt-16 md:pb-20 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
            
            {/* Security Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs sm:text-sm font-semibold tracking-wide animate-pulse">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span>{t.heroBadge}</span>
            </div>

            {/* Main Title */}
            <h1
              className="text-2xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight max-w-4xl"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t.heroHeading}
            </h1>

            {/* Subtitle */}
            <p
              className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl leading-relaxed font-normal"
              style={{ fontFamily: sansFont(lang) }}
            >
              {t.heroSubheading}
            </p>

            {/* Action Buttons (Mobile Touch Optimized) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto pt-2">
              <Link
                to={`/${lang}/library`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm sm:text-base shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[48px]"
              >
                <BookOpen size={18} />
                <span>{t.exploreLibrary}</span>
                {dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>

              <a
                href="mailto:contact@mizan.page"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-muted text-foreground border border-border font-bold text-sm sm:text-base hover:bg-muted/80 hover:border-muted-foreground/30 transition-all min-h-[48px]"
              >
                <Globe2 size={18} />
                <span>{t.contactUs}</span>
              </a>
            </div>

            {/* Role Verification Bar */}
            <div className="mt-6 w-full max-w-2xl bg-card border border-border/80 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground shadow-sm flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-primary shrink-0" />
              <div className="text-start">
                <span className="font-bold text-foreground capitalize">
                  {t.roleBannerTitle}: ({role})
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isStaff ? t.roleBannerStaff : t.roleBannerGuest}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Metrics / Key Performance Grid */}
      <section className="py-10 bg-muted/30 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-xs text-center hover:border-primary/40 transition-colors">
              <FileText className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground">{t.statDocs}</div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{t.statDocsLabel}</p>
            </div>

            <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-xs text-center hover:border-primary/40 transition-colors">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground">{t.statSec}</div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{t.statSecLabel}</p>
            </div>

            <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-xs text-center hover:border-primary/40 transition-colors">
              <Globe2 className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground">{t.statLangs}</div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{t.statLangsLabel}</p>
            </div>

            <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-xs text-center hover:border-primary/40 transition-colors">
              <Zap className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground">{t.statSpeed}</div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{t.statSpeedLabel}</p>
            </div>

          </div>
        </div>
      </section>

      {/* Mission & Core Pillars */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t.missionTitle}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
              {t.missionSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Pillar 1 */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="p-3 w-fit rounded-2xl bg-primary/10 text-primary mb-5">
                  <Scale className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">{t.p1Title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{t.p1Desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center text-xs font-semibold text-primary">
                <span>{lang === "ar" ? "توثيق شامل للجريدة الرسمية" : "Official Gazette Compliance"}</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="p-3 w-fit rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-5">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">{t.p2Title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{t.p2Desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>{lang === "ar" ? "تغطية كافة كليات FSJES" : "FSJES University Archives"}</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="p-3 w-fit rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-5">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">{t.p3Title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{t.p3Desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>{lang === "ar" ? "أمان عسكري وحماية RLS" : "Row-Level Security Protocols"}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Military-Grade Security Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-950 text-white rounded-3xl max-w-6xl mx-auto my-8 px-6 sm:px-10 shadow-2xl overflow-hidden relative border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Lock className="w-72 h-72 text-white" />
        </div>

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold mb-4">
            <Sparkles size={14} />
            <span>{t.securityBadge}</span>
          </div>

          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight"
            style={{ fontFamily: serifFont(lang) }}
          >
            {t.securitySectionTitle}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm">
              <KeyRound className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-white mb-2">{t.sec1Title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{t.sec1Desc}</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm">
              <Users className="w-6 h-6 text-blue-400 mb-3" />
              <h3 className="text-base font-bold text-white mb-2">{t.sec2Title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{t.sec2Desc}</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm">
              <Database className="w-6 h-6 text-amber-400 mb-3" />
              <h3 className="text-base font-bold text-white mb-2">{t.sec3Title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{t.sec3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Photo SEO & Media Gallery Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-foreground"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t.galleryTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">{t.gallerySubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            
            {/* Image Card 1 */}
            <div className="group relative bg-card border border-border rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80"
                  alt={t.img1Alt}
                  title={t.img1Title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-primary font-bold mb-1">
                  <Award size={14} />
                  <span>Mizan Document Archive</span>
                </div>
                <h3 className="text-base font-bold text-foreground">{t.img1Title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.img1Caption}</p>
              </div>
            </div>

            {/* Image Card 2 */}
            <div className="group relative bg-card border border-border rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80"
                  alt={t.img2Alt}
                  title={t.img2Title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">
                  <BookOpen size={14} />
                  <span>FSJES Legal Repository</span>
                </div>
                <h3 className="text-base font-bold text-foreground">{t.img2Title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.img2Caption}</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Quad-lingual FAQ Section */}
      <section className="py-12 sm:py-16 bg-muted/20 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2
            className="text-2xl sm:text-3xl font-extrabold text-foreground text-center mb-8"
            style={{ fontFamily: serifFont(lang) }}
          >
            {t.faqTitle}
          </h2>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span>{t.q1}</span>
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed ps-7">
                {t.a1}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{t.q2}</span>
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed ps-7">
                {t.a2}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action */}
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-3xl p-8 sm:p-12 shadow-sm">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t.ctaHeading}
            </h2>
            <div className="mt-6 flex justify-center">
              <Link
                to={`/${lang}/library`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg hover:bg-primary/90 transition-all hover:scale-105 min-h-[48px]"
              >
                <span>{t.ctaBtn}</span>
                {dir === "rtl" ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}