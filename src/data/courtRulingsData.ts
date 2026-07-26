"use client";

import type { Role } from "@/hooks/useRole";

// 🌍 Site Domain Configuration
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) ||
  (import.meta.env.VITE_APP_URL as string) ||
  "https://www.mizan.page";

export type SupportedLanguage = "ar" | "fr" | "en" | "es";

// 🌐 4-Language Localized String Interface
export interface MultiLangText {
  ar: string;
  fr: string;
  en: string;
  es: string;
}

// 📸 Master SEO Photo Metadata Interface
export interface PhotoSEOMetadata {
  id: string;
  title: MultiLangText;
  altText: MultiLangText;
  src: string;
  keywords: string[];
  category: string;
  width: number;
  height: number;
  caption: MultiLangText;
}

// 📄 Master SEO File & Document Metadata Interface
export interface FileSEOMetadata {
  id: string;
  title: MultiLangText;
  fileUrl: string;
  fileType: "pdf" | "docx" | "epub";
  fileSizeBytes: number;
  keywords: string[];
  category: string;
  downloadCount: number;
}

// 🏛️ SubCategory Interface with Master SEO & Access Control
export interface SubCategory {
  id: string;
  slug: string;
  title: MultiLangText;
  description: MultiLangText;
  icon: string;
  featured: boolean;
  minRoleRequired: Role;
  seo: {
    metaTitle: MultiLangText;
    metaDescription: MultiLangText;
    keywords: string[];
  };
  heroPhoto: PhotoSEOMetadata;
  featuredFiles: FileSEOMetadata[];
}

// 📂 Main Section Category Interface
export interface SectionCategory {
  id: string;
  title: MultiLangText;
  description: MultiLangText;
  subcategories: SubCategory[];
}

// 🔒 Deep Freeze Utility for Immutable Data Safety
function deepFreeze<T>(obj: T): Readonly<T> {
  Object.keys(obj as object).forEach((prop) => {
    const value = (obj as Record<string, unknown>)[prop];
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  return Object.freeze(obj);
}

// 🏛️ Master Court Rulings, Doctrine & Legal Gazette Dataset
const RAW_COURT_RULINGS_AND_DOCTRINE: SectionCategory[] = [
  {
    id: "court-rulings",
    title: {
      ar: "الاجتهاد القضائي والقرارات",
      fr: "Jurisprudence et Règlements",
      en: "Court Rulings & Precedents",
      es: "Jurisprudencia y Sentencias",
    },
    description: {
      ar: "سجل متكامل لأحكام محكمة النقض ومحاكم الاستئناف والمحاكم الإدارية والتجارية.",
      fr: "Registre complet des arrêts de la Cour de Cassation, Cours d'Appel et Tribunaux.",
      en: "Comprehensive database of Court of Cassation, Appellate, and Commercial rulings.",
      es: "Base de datos completa de sentencias del Tribunal de Casación y Cortes de Apelación.",
    },
    subcategories: [
      {
        id: "court-of-cassation",
        slug: "court-of-cassation",
        title: {
          ar: "قرارات محكمة النقض",
          fr: "Cour de Cassation",
          en: "Court of Cassation",
          es: "Tribunal de Casación",
        },
        description: {
          ar: "أهم السوابق والقرارات القضائية الصادرة عن أعلى هرم قضائي بالمملكة.",
          fr: "Jurisprudence et arrêts de principe de la plus haute juridiction.",
          en: "Binding legal precedents and rulings from the highest judicial tribunal.",
          es: "Precedentes y sentencias emitidas por la más alta autoridad judicial.",
        },
        icon: "Gavel",
        featured: true,
        minRoleRequired: "guest",
        seo: {
          metaTitle: {
            ar: "اجتهادات محكمة النقض المغربية | منصة ميزان الرقمية",
            fr: "Jurisprudence Cour de Cassation du Maroc | Plateforme Mizan",
            en: "Moroccan Court of Cassation Rulings | Mizan Legal Platform",
            es: "Jurisprudencia del Tribunal de Casación de Marruecos | Mizan",
          },
          metaDescription: {
            ar: "استعرض أحدث قرارات واجتهادات محكمة النقض في المادة المدنية، الجنائية، والأسرة مع التحميل المباشر.",
            fr: "Consultez les derniers arrêts de la Cour de Cassation en matière civile, pénale et familiale.",
            en: "Browse the latest Court of Cassation rulings in civil, criminal, and family law with direct download.",
            es: "Explore las últimas sentencias del Tribunal de Casación en materia civil, penal y de familia.",
          },
          keywords: [
            "محكمة النقض",
            "اجتهاد قضائي",
            "قرارات مدنية",
            "Cour de Cassation",
            "Court of Cassation Morocco",
            "Tribunal de Casación",
            "Mizan Legal",
          ],
        },
        heroPhoto: {
          id: "photo-cassation-hero-01",
          title: {
            ar: "مقر محكمة النقض - العاصمة الرباط",
            fr: "Siège de la Cour de Cassation - Rabat",
            en: "Court of Cassation Headquarters - Rabat",
            es: "Sede del Tribunal de Casación - Rabat",
          },
          altText: {
            ar: "واجهة محكمة النقض المغربية بالرباط مع رمز العدالة Mizan",
            fr: "Façade de la Cour de Cassation marocaine à Rabat",
            en: "Façade of the Moroccan Court of Cassation in Rabat",
            es: "Fachada del Tribunal de Casación de Marruecos en Rabat",
          },
          src: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop",
          keywords: ["محكمة النقض", "الرباط", "عدالة", "قضاء مغربي", "Cour de Cassation"],
          category: "court-architecture",
          width: 1200,
          height: 800,
          caption: {
            ar: "المقر الرسمي لمحكمة النقض - رمز أعلى درجات التقاضي بالمملكة.",
            fr: "Le siège officiel de la Cour de Cassation au Maroc.",
            en: "Official seat of the Court of Cassation in Morocco.",
            es: "Sede oficial del Tribunal de Casación en Marruecos.",
          },
        },
        featuredFiles: [
          {
            id: "file-cassation-2025-civil",
            title: {
              ar: "دليل القرارات الكبرى لمحكمة النقض 2025 - الغرفة المدنية",
              fr: "Recueil des Grands Arrêts - Chambre Civile 2025",
              en: "Major Rulings Compendium - Civil Chamber 2025",
              es: "Compendio de Grandes Sentencias - Cámara Civil 2025",
            },
            fileUrl: `${SITE_URL}/docs/cassation_civil_2025.pdf`,
            fileType: "pdf",
            fileSizeBytes: 4850000,
            keywords: ["قرارات مدنية", "محكمة النقض", "PDF", "Mizan Doc"],
            category: "rulings-pdf",
            downloadCount: 1420,
          },
        ],
      },
      {
        id: "courts-of-appeal",
        slug: "courts-of-appeal",
        title: {
          ar: "محاكم الاستئناف",
          fr: "Cours d'Appel",
          en: "Courts of Appeal",
          es: "Cortes de Apelación",
        },
        description: {
          ar: "أحكام وقرارات محاكم الاستئناف بمختلف الدوائر القضائية بالمملكة.",
          fr: "Décisions et arrêts des Cours d'Appel dans les différentes juridictions.",
          en: "Appellate judgments and decisions across regional jurisdictions.",
          es: "Sentencias de las Cortes de Apelación en diversas jurisdicciones.",
        },
        icon: "Scale",
        featured: false,
        minRoleRequired: "guest",
        seo: {
          metaTitle: {
            ar: "قرارات محاكم الاستئناف المغربية | منصة ميزان",
            fr: "Arrêts des Cours d'Appel du Maroc | Mizan",
            en: "Moroccan Courts of Appeal Rulings | Mizan",
            es: "Sentencias de Cortes de Apelación | Mizan",
          },
          metaDescription: {
            ar: "قاعدة بيانات أحكام محاكم الاستئناف بالرباط، الدار البيضاء، فاس، ومراكش.",
            fr: "Base de données des décisions des Cours d'Appel de Rabat, Casablanca, Fès, et Marrakech.",
            en: "Database of appellate court rulings from Rabat, Casablanca, Fez, and Marrakech.",
            es: "Base de datos de sentencias de apelación de Rabat, Casablanca, Fez y Marrakech.",
          },
          keywords: ["محاكم الاستئناف", "استئناف الرباط", "استئناف البيضاء", "Cours d'Appel", "Appellate Court"],
        },
        heroPhoto: {
          id: "photo-appeal-hero-02",
          title: {
            ar: "قاعة الجلسات بمحكمة الاستئناف",
            fr: "Salle d'Audience - Cour d'Appel",
            en: "Courtroom - Court of Appeal",
            es: "Sala de Audiencias - Corte de Apelación",
          },
          altText: {
            ar: "قاعة المحاكمة وقضاة استئناف بالزي الرسمي",
            fr: "Salle d'audience de la Cour d'Appel",
            en: "Courtroom of the Court of Appeal",
            es: "Sala de audiencias de la Corte de Apelación",
          },
          src: "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=1200&auto=format&fit=crop",
          keywords: ["محكمة الاستئناف", "قاعة المحاكمة", "قضاة", "Courtroom"],
          category: "courtroom",
          width: 1200,
          height: 800,
          caption: {
            ar: "جلسة علنية بإحدى محاكم الاستئناف المغربية.",
            fr: "Audience publique dans une Cour d'Appel marocaine.",
            en: "Public hearing in a Moroccan Court of Appeal.",
            es: "Audiencia pública en una Corte de Apelación marroquí.",
          },
        },
        featuredFiles: [
          {
            id: "file-appeal-2025-commercial",
            title: {
              ar: "مجموعة قرارات الاستئناف التجاري - الدار البيضاء 2025",
              fr: "Arrêts de la Cour d'Appel de Commerce - Casablanca 2025",
              en: "Commercial Court of Appeal Rulings - Casablanca 2025",
              es: "Sentencias Apelación Comercial - Casablanca 2025",
            },
            fileUrl: `${SITE_URL}/docs/appeal_commercial_casa_2025.pdf`,
            fileType: "pdf",
            fileSizeBytes: 3200000,
            keywords: ["استئناف تجاري", "الدار البيضاء", "PDF"],
            category: "rulings-pdf",
            downloadCount: 890,
          },
        ],
      },
      {
        id: "administrative-courts",
        slug: "administrative-courts",
        title: {
          ar: "المحاكم الإدارية",
          fr: "Tribunaux Administratifs",
          en: "Administrative Courts",
          es: "Tribunales Administrativos",
        },
        description: {
          ar: "أحكام وقرارات منازعات الجماعات الترابية، الصفقات العمومية والمسؤولية الإدارية.",
          fr: "Jugements concernant les litiges administratifs et marchés publics.",
          en: "Rulings regarding public administration, public procurement, and regulatory disputes.",
          es: "Sentencias sobre litigios administrativos y contratación pública.",
        },
        icon: "Building2",
        featured: true,
        minRoleRequired: "guest",
        seo: {
          metaTitle: {
            ar: "أحكام المحاكم الإدارية | القضاء الإداري المغربي | ميزان",
            fr: "Jurisprudence des Tribunaux Administratifs | Mizan",
            en: "Administrative Court Decisions Morocco | Mizan",
            es: "Jurisprudencia Administrativa de Marruecos | Mizan",
          },
          metaDescription: {
            ar: "تصفح أحكام القضاء الإداري في دعوى إلغاء قرارات السلطة والشطط في استعمال السلطة.",
            fr: "Accédez aux jugements administratifs sur les recours pour excès de pouvoir.",
            en: "Access administrative court decisions on abuse of power and public contracts.",
            es: "Acceda a sentencias administrativas sobre exceso de poder y contratos públicos.",
          },
          keywords: ["القضاء الإداري", "المحاكم الإدارية", "إلغاء القرار الإداري", "Tribunaux Administratifs"],
        },
        heroPhoto: {
          id: "photo-admin-hero-03",
          title: {
            ar: "المحكمة الإدارية بالرباط",
            fr: "Tribunal Administratif de Rabat",
            en: "Administrative Court of Rabat",
            es: "Tribunal Administrativo de Rabat",
          },
          altText: {
            ar: "مبنى المحكمة الإدارية بالرباط",
            fr: "Bâtiment du Tribunal Administratif de Rabat",
            en: "Building of the Administrative Court of Rabat",
            es: "Edificio del Tribunal Administrativo de Rabat",
          },
          src: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=1200&auto=format&fit=crop",
          keywords: ["المحكمة الإدارية", "الرباط", "قضاء إداري"],
          category: "court-building",
          width: 1200,
          height: 800,
          caption: {
            ar: "المحكمة الإدارية - الحصن الضامن لسيادة القانون وحماية الحقوق.",
            fr: "Le Tribunal Administratif - Garant de l'État de droit.",
            en: "The Administrative Court - Guardian of the rule of law.",
            es: "El Tribunal Administrativo - Garante del Estado de derecho.",
          },
        },
        featuredFiles: [
          {
            id: "file-admin-decrees-2025",
            title: {
              ar: "دليل أحكام إلغاء القرارات الإدارية بسبب الشطط 2025",
              fr: "Recueil des Annulations pour Excès de Pouvoir 2025",
              en: "Judicial Review Rulings Digest 2025",
              es: "Guía de Sentencias de Anulación Administrativa 2025",
            },
            fileUrl: `${SITE_URL}/docs/admin_review_2025.pdf`,
            fileType: "pdf",
            fileSizeBytes: 5120000,
            keywords: ["الشطط في استعمال السلطة", "قضاء إداري", "PDF"],
            category: "rulings-pdf",
            downloadCount: 1105,
          },
        ],
      },
    ],
  },
  {
    id: "doctrine",
    title: {
      ar: "الفقه القانوني والأبحاث",
      fr: "Doctrine Legal & Études",
      en: "Legal Doctrine & Research",
      es: "Doctrina Jurídica y Estudios",
    },
    description: {
      ar: "دراسات أكاديمية محكمة وتعليقات على الأحكام القضائية من كبار الأساتذة والممارسين.",
      fr: "Articles académiques, commentaires d'arrêts et analyses juridiques approfondies.",
      en: "In-depth legal scholarship, peer-reviewed studies, and expert case commentaries.",
      es: "Artículos académicos, comentarios de sentencias y análisis jurídicos profundos.",
    },
    subcategories: [
      {
        id: "academic-articles",
        slug: "academic-articles",
        title: {
          ar: "الأبحاث والدراسات الأكاديمية",
          fr: "Articles Académiques",
          en: "Academic Research Articles",
          es: "Artículos Académicos",
        },
        description: {
          ar: "دراسات قانونية محكمة في العلوم الجنائية، المدنية، والتجارية.",
          fr: "Études juridiques publiées par des professeurs et chercheurs émérites.",
          en: "Peer-reviewed studies in criminal, civil, and commercial jurisprudence.",
          es: "Estudios jurídicos revisados por pares en jurisprudencia civil y penal.",
        },
        icon: "BookOpen",
        featured: true,
        minRoleRequired: "guest",
        seo: {
          metaTitle: {
            ar: "أبحاث ودراسات قانونية محكمة | مجلة ميزان",
            fr: "Recherches et Études Juridiques | Revue Mizan",
            en: "Academic Legal Studies & Papers | Mizan Journal",
            es: "Investigaciones y Estudios Jurídicos | Revista Mizan",
          },
          metaDescription: {
            ar: "حمل أحدث البحوث الجامعية والأكاديمية في القانون المغربي والمقارن.",
            fr: "Téléchargez les derniers travaux de recherche en droit marocain et comparé.",
            en: "Download the latest university research papers in Moroccan and comparative law.",
            es: "Descargue los últimos trabajos de investigación en derecho marroquí y comparado.",
          },
          keywords: ["بحوث قانونية", "دراسات أكاديمية", "مجلة قانونية", "Academic Law", "Mizan Journal"],
        },
        heroPhoto: {
          id: "photo-academic-hero-04",
          title: {
            ar: "المكتبة القانونية والبحوث الجامعية",
            fr: "Bibliothèque de Recherche Juridique",
            en: "Legal Research Library",
            es: "Biblioteca de Investigación Jurídica",
          },
          altText: {
            ar: "كتب ومراجع قانونية ومجلدات الفقه الإسلامي والقانون المغربي",
            fr: "Livres et ouvrages de droit marocain",
            en: "Law books and research journals in legal library",
            es: "Libros y revistas de investigación jurídica",
          },
          src: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1200&auto=format&fit=crop",
          keywords: ["كتب قانونية", "مكتبة حقوق", "بحث أكاديمي", "Legal Library"],
          category: "library",
          width: 1200,
          height: 800,
          caption: {
            ar: "مركز الأبحاث والتوثيق القانوني بمنصة ميزان.",
            fr: "Centre de recherche et de documentation juridique Mizan.",
            en: "Mizan Legal Research and Documentation Center.",
            es: "Centro de Investigación y Documentación Jurídica Mizan.",
          },
        },
        featuredFiles: [
          {
            id: "file-doctrine-penal-2025",
            title: {
              ar: "السياسة الجنائية المعاصرة وتحديات التحول الرقمي 2025",
              fr: "Politique Criminelle & Digitalisation 2025",
              en: "Contemporary Criminal Policy & Digitalization 2025",
              es: "Política Criminal y Digitalización 2025",
            },
            fileUrl: `${SITE_URL}/docs/criminal_policy_digital_2025.pdf`,
            fileType: "pdf",
            fileSizeBytes: 2900000,
            keywords: ["سياسة جنائية", "تحول رقمي", "بحث أكاديمي"],
            category: "academic-pdf",
            downloadCount: 2310,
          },
        ],
      },
      {
        id: "case-commentaries",
        slug: "case-commentaries",
        title: {
          ar: "التعليق على الأحكام والقرارات",
          fr: "Commentaires d'Arrêts",
          en: "Case Commentaries",
          es: "Comentarios de Sentencias",
        },
        description: {
          ar: "تحليلات تفصيلية للأحكام القضائية المستجدة والمبادئ المستحدثة.",
          fr: "Analyses critiques des grands arrêts rendus par les hautes juridictions.",
          en: "Expert breakdowns and critical reviews of landmark court rulings.",
          es: "Análisis críticos de las principales sentencias judiciales.",
        },
        icon: "FileText",
        featured: false,
        minRoleRequired: "guest",
        seo: {
          metaTitle: {
            ar: "التعليق على الأحكام القضائية | دراسات فقهية | ميزان",
            fr: "Commentaires des Arrêts Jurisprudentiels | Mizan",
            en: "Landmark Case Commentaries & Analysis | Mizan",
            es: "Comentarios de Sentencias Jurisprudenciales | Mizan",
          },
          metaDescription: {
            ar: "قراءة نقدية وفقهية لأهم القرارات الصادرة عن محكمة النقض ومحاكم الاستئناف.",
            fr: "Analyses doctrinales et jurisprudentielles des décisions de justice.",
            en: "Doctrinal analysis and expert legal commentaries on major court decisions.",
            es: "Análisis doctrinales y jurisprudenciales de decisiones judiciales.",
          },
          keywords: ["التعليق على الأحكام", "تحليل قرار قضائي", "فقه القضاء", "Case Analysis"],
        },
        heroPhoto: {
          id: "photo-commentary-hero-05",
          title: {
            ar: "دراسة وتدقيق العقود والأحكام القضائية",
            fr: "Analyse et Expertise des Jugements",
            en: "Analysis and Audit of Rulings",
            es: "Análisis y Auditoría de Sentencias",
          },
          altText: {
            ar: "خبير قانوني يقوم بالتعليق على قرار قضائي محرر",
            fr: "Juriste analysant une décision de justice",
            en: "Legal expert commenting on a judicial ruling",
            es: "Experto jurídico analizando una sentencia judicial",
          },
          src: "https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=1200&auto=format&fit=crop",
          keywords: ["تحليل قانوني", "تعليق فقهي", "استشارة"],
          category: "legal-audit",
          width: 1200,
          height: 800,
          caption: {
            ar: "القراءة الفقهية التحليلية للنصوص والأحكام.",
            fr: "Lecture doctrinale et analytique des arrêts.",
            en: "Doctrinal and analytical reading of court decisions.",
            es: "Lectura doctrinal y analítica de las sentencias.",
          },
        },
        featuredFiles: [
          {
            id: "file-commentary-family-2025",
            title: {
              ar: "تعليق فقهي على مستجدات مدونة الأسرة والعمل القضائي 2025",
              fr: "Commentaire sur l'Évolution du Code de la Famille 2025",
              en: "Legal Analysis on Family Code Updates 2025",
              es: "Comentario Doctrinal sobre el Código de Familia 2025",
            },
            fileUrl: `${SITE_URL}/docs/family_code_commentary_2025.pdf`,
            fileType: "pdf",
            fileSizeBytes: 3750000,
            keywords: ["مدونة الأسرة", "تعليق فقهي", "PDF"],
            category: "commentary-pdf",
            downloadCount: 1840,
          },
        ],
      },
      {
        id: "comparative-studies",
        slug: "comparative-studies",
        title: {
          ar: "الدراسات والقوانين المقارنة",
          fr: "Droit Comparé & Études",
          en: "Comparative Legal Studies",
          es: "Estudios de Derecho Comparado",
        },
        description: {
          ar: "أبحاث تعنى بمقارنة التشريع المغربي بالأنظمة القانونية العربية والأورو-متوسطية.",
          fr: "Recherches comparatives entre le droit marocain, européen et arabe.",
          en: "Cross-jurisdictional research linking Moroccan law with Euro-Mediterranean systems.",
          es: "Investigación comparada entre el derecho marroquí, europeo y árabe.",
        },
        icon: "ShieldCheck",
        featured: false,
        minRoleRequired: "guest",
        seo: {
          metaTitle: {
            ar: "دراسات القانون المقارن | المغرب والمحيط الدولي | ميزان",
            fr: "Études de Droit Comparé International | Mizan",
            en: "Comparative Law Studies & Research | Mizan",
            es: "Estudios de Derecho Comparado Internacional | Mizan",
          },
          metaDescription: {
            ar: "استكشف أبحاث مقارنة التشريعات التجاري والأنظمة الفرنكوفونية والأنغلو-سكسونية.",
            fr: "Découvrez les études comparatives sur les systèmes juridiques internationaux.",
            en: "Discover comparative research on international legal frameworks.",
            es: "Descubra estudios comparativos sobre sistemas jurídicos internacionales.",
          },
          keywords: ["قانون مقارن", "تشريع دولي", "Droit Comparé", "Comparative Law"],
        },
        heroPhoto: {
          id: "photo-comparative-hero-06",
          title: {
            ar: "التعاون القانوني والتكامل التشريعي الدولي",
            fr: "Coopération Juridique Internationale",
            en: "International Legal Cooperation",
            es: "Cooperación Jurídica Internacional",
          },
          altText: {
            ar: "كرة أرضية وموازين العدالة الدولية",
            fr: "Globe terrestre et symboles de justice internationale",
            en: "Globe and international justice symbols",
            es: "Globo terráqueo y símbolos de justicia internacional",
          },
          src: "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=1200&auto=format&fit=crop",
          keywords: ["دولية", "قانون مقارن", "تشريع"],
          category: "international-law",
          width: 1200,
          height: 800,
          caption: {
            ar: "ربط الفقه المحلي بالتجارب التشريعية الدولية.",
            fr: "Relier la doctrine locale aux expériences internationales.",
            en: "Connecting domestic jurisprudence with international legal frameworks.",
            es: "Conectando la doctrina local con experiencias internacionales.",
          },
        },
        featuredFiles: [
          {
            id: "file-comparative-arbitration-2025",
            title: {
              ar: "دراسة مقارنة: التحكيم التجاري الدولي بين التشريع المغربي وقواعد UNCITRAL",
              fr: "Droit Comparé: Arbitrage Commercial Maroc vs UNCITRAL",
              en: "Comparative Study: Moroccan Arbitration Law vs UNCITRAL Rules",
              es: "Estudio Comparado: Arbitraje Comercial Marruecos vs UNCITRAL",
            },
            fileUrl: `${SITE_URL}/docs/comparative_arbitration_2025.pdf`,
            fileType: "pdf",
            fileSizeBytes: 6100000,
            keywords: ["تحكيم تجاري", "UNCITRAL", "قانون مقارن"],
            category: "comparative-pdf",
            downloadCount: 975,
          },
        ],
      },
    ],
  },
];

// 🔒 Deeply Freeze Dataset for Production Safety
export const COURT_RULINGS_AND_DOCTRINE = deepFreeze(RAW_COURT_RULINGS_AND_DOCTRINE);

// ⚡ Mobile-First Flattened Map for O(1) Quick Lookups (FIXED READONLY TYPE)
export const COURT_RULINGS_FLAT: readonly SubCategory[] = deepFreeze(
  COURT_RULINGS_AND_DOCTRINE.flatMap((section) => section.subcategories)
);

// 🔍 Lookup Helper: Retrieve SubCategory by Slug
export function getCategoryBySlug(slug: string): SubCategory | undefined {
  if (!slug) return undefined;
  const cleanSlug = slug.trim().toLowerCase();
  return COURT_RULINGS_FLAT.find((cat) => cat.slug.toLowerCase() === cleanSlug);
}

// 🌐 Localization Helper: Resolve MultiLangText based on Active Lang
export function getLocalizedText(textObj: MultiLangText, lang: SupportedLanguage): string {
  return textObj[lang] || textObj.ar || textObj.en || "";
}

// 📱 Phone-First Light Payload Helper for Fast Mobile Rendering
export interface LocalizedMobileCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  featured: boolean;
  minRoleRequired: Role;
  heroPhotoSrc: string;
  heroPhotoAlt: string;
  metaTitle: string;
  metaDescription: string;
}

export function getLocalizedCategoriesForMobile(lang: SupportedLanguage): LocalizedMobileCategory[] {
  return COURT_RULINGS_FLAT.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    title: getLocalizedText(cat.title, lang),
    description: getLocalizedText(cat.description, lang),
    icon: cat.icon,
    featured: cat.featured,
    minRoleRequired: cat.minRoleRequired,
    heroPhotoSrc: cat.heroPhoto.src,
    heroPhotoAlt: getLocalizedText(cat.heroPhoto.altText, lang),
    metaTitle: getLocalizedText(cat.seo.metaTitle, lang),
    metaDescription: getLocalizedText(cat.seo.metaDescription, lang),
  }));
}

// 🛡️ Telemetry Sanitizer: Strips sensitive PII tokens before pushing photo or file metadata to Tag Manager
export function sanitizeTelemetryPayload<T extends Record<string, unknown>>(payload: T): T {
  const SENSITIVE_KEYS = ["token", "secret", "password", "auth", "api_key", "session", "otp"];
  const sanitized = { ...payload };

  Object.keys(sanitized).forEach((key) => {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      (sanitized as Record<string, unknown>)[key] = "[REDACTED]";
    }
  });

  return sanitized;
}