import { type Role } from "./security";

// ── 🌐 DOMAIN & ENVIRONMENT CONFIGURATION ────────────────────────────────────
export const SITE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  "https://www.mizan.page";

export const APP_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  "https://www.mizan.page";

// ── 🌍 4-LANGUAGE TYPES & DIRECTIONALITY ──────────────────────────────────────
export type SupportedLang = "ar" | "fr" | "en" | "es";

export interface SecurityTranslation {
  ar: string;
  fr: string;
  en: string;
  es: string;
}

export const LANG_DIRECTION: Record<SupportedLang, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
  es: "ltr",
};

// ── 🔑 LOCALIZED ROLE DEFINITIONS & DESCRIPTIONS ─────────────────────────────
export const ROLE_LABELS: Record<Role, SecurityTranslation> = {
  root: {
    ar: "مالك النظام (Root)",
    fr: "Super Administrateur (Root)",
    en: "System Owner (Root)",
    es: "Propietario del Sistema (Root)",
  },
  security_admin: {
    ar: "مسؤول الأمن والحماية",
    fr: "Administrateur Sécurité",
    en: "Security Administrator",
    es: "Administrador de Seguridad",
  },
  admin: {
    ar: "مدير النظام",
    fr: "Administrateur",
    en: "Administrator",
    es: "Administrador",
  },
  marketer: {
    ar: "مسؤول التسويق وSEO",
    fr: "Responsable Marketing & SEO",
    en: "Marketing & SEO Specialist",
    es: "Especialista en Marketing y SEO",
  },
  writer: {
    ar: "محرر محتوى قانوني",
    fr: "Rédacteur Juridique",
    en: "Legal Content Writer",
    es: "Redactor de Contenido Legal",
  },
  member: {
    ar: "عضو مسجل",
    fr: "Membre Inscrit",
    en: "Registered Member",
    es: "Miembro Registrado",
  },
  guest: {
    ar: "زائر",
    fr: "Invité",
    en: "Guest Visitor",
    es: "Invitado",
  },
};

export const ROLE_DESCRIPTIONS: Record<Role, SecurityTranslation> = {
  root: {
    ar: "صلاحيات فائقة كاملة على جميع أجزاء المنصة، الإعدادات، وقواعد البيانات.",
    fr: "Contrôle total sur l'ensemble de la plateforme, paramètres et bases de données.",
    en: "Full root access over platform settings, database, and system configurations.",
    es: "Control total sobre la plataforma, configuración y bases de datos.",
  },
  security_admin: {
    ar: "إدارة سياسات التشفير، سجلات التدقيق، حظر الحسابات، ومراقبة الاختراقات.",
    fr: "Gestion du chiffrement, des journaux d'audit, des bannissements et de la sécurité.",
    en: "Manages encryption policies, audit logs, account bans, and security threats.",
    es: "Gestiona cifrado, registros de auditoría, bloqueos y amenazas de seguridad.",
  },
  admin: {
    ar: "إدارة المستخدمين، نشر المحتوى، وإشراف عام على المنصة.",
    fr: "Gestion des utilisateurs, publication de contenu et supervision générale.",
    en: "Manages platform users, content publishing, and operational workflows.",
    es: "Gestión de usuarios, publicación de contenido y supervisión general.",
  },
  marketer: {
    ar: "تحسين محركات البحث SEO، إدارة الحملات التسويقية، وتحليل الزيارات.",
    fr: "Optimisation SEO, gestion des campagnes marketing et analyse du trafic.",
    en: "SEO optimization, marketing campaigns, image/file meta tag controls, and analytics.",
    es: "Optimización SEO, campañas de marketing, metadatos y analítica de tráfico.",
  },
  writer: {
    ar: "كتابة وتعديل المقالات، النشرات القانونية، والمستندات.",
    fr: "Rédaction et édition des articles, bulletins juridiques et documents.",
    en: "Creates and edits legal articles, news items, and documentation.",
    es: "Creación y edición de artículos legales, noticias y documentación.",
  },
  member: {
    ar: "تصفح المحتوى الكامل، حفظ المقالات، وتحميل الملفات المتاحة.",
    fr: "Accès au contenu complet, sauvegarde d'articles et téléchargements.",
    en: "Access full articles, save favorites, and download permitted legal files.",
    es: "Acceso a contenido completo, guardar favoritos y descargar archivos.",
  },
  guest: {
    ar: "تصفح محدود للمحتوى العام مع حماية مكثفة ضد القرصنة والنقل.",
    fr: "Navigation limitée avec protection anti-copie et sécurité renforcée.",
    en: "Limited read-only browsing protected by anti-piracy controls.",
    es: "Navegación limitada con controles de protección contra piratería.",
  },
};

// ── 🛡️ SECURITY & TRUST UI TRANSLATIONS ────────────────────────────────────
export const securityUIElements = {
  encryption_status_labels: {
    encryption_badge: {
      ar: "تشفير عسكري نشط (AES-256)",
      fr: "Chiffrement Militaire Actif (AES-256)",
      en: "Military-Grade Encryption Active (AES-256)",
      es: "Cifrado Grado Militar Activo (AES-256)",
    },
    tls_status: {
      ar: "اتصال آمن ومُشفر (TLS 1.3 / SSL)",
      fr: "Connexion Sécurisée & Chiffrée (TLS 1.3 / SSL)",
      en: "Secure Encrypted Connection (TLS 1.3 / SSL)",
      es: "Conexión Segura Cifrada (TLS 1.3 / SSL)",
    },
    hash_status: {
      ar: "حماية كلمة المرور: مشفرة ومحمية (Argon2 / bcrypt)",
      fr: "Protection du mot de passe : Haché (Argon2 / bcrypt)",
      en: "Password Protection: Securely Hashed (Argon2 / bcrypt)",
      es: "Protección de Contraseña: Hash Seguro (Argon2 / bcrypt)",
    },
  },
  phone_security_labels: {
    mobile_first_shield: {
      ar: "حماية فائقة السرعة للأجهزة المحمولة",
      fr: "Protection Haute Vitesse pour Mobiles",
      en: "Ultra-Fast Mobile First Protection",
      es: "Protección Móvil de Alta Velocidad",
    },
    rate_limit_active: {
      ar: "تم تفعيل حماية الإغراق للطلب عبر الهاتف. يرجى الانتظار قليلاً.",
      fr: "Protection anti-flood mobile active. Veuillez patienter.",
      en: "Mobile anti-flood protection active. Please wait.",
      es: "Protección anti-flood móvil activa. Por favor espere.",
    },
    session_secured: {
      ar: "جلسة الهاتف محميّة وموثقة برمز أمان فريد",
      fr: "Session mobile sécurisée avec jeton unique",
      en: "Mobile session secured with unique security token",
      es: "Sesión móvil asegurada con token único",
    },
  },
  photo_seo_security: {
    alt_sanitized: {
      ar: "صورة مفهرسة ومحمية ضد التلغيم (SEO Safe Alt)",
      fr: "Image sécurisée et optimisée SEO (Alt Sécurisé)",
      en: "Photo SEO Optimized & Malware Sanitized",
      es: "Imagen optimizada para SEO y libre de malware",
    },
    google_image_ready: {
      ar: "جاهزة للفهرسة في محرك صور جوجل Fast CDN WebP/AVIF",
      fr: "Prêt pour Google Images via CDN WebP/AVIF Ultra Rapide",
      en: "Google Image Indexing Ready via Ultra-Fast CDN WebP/AVIF",
      es: "Listo para Google Imágenes mediante CDN WebP/AVIF Ultrarrápido",
    },
  },
  document_seo_security: {
    pdf_indexed_safe: {
      ar: "وثيقة قانونية مشفرة ومفهرسة بأمان لجوجل",
      fr: "Document juridique chiffré & indexé pour Google",
      en: "Secure Legal PDF Indexed for Google Search",
      es: "PDF Legal Seguro Indexado para Google Search",
    },
    hash_verified: {
      ar: "بصمة الوثيقة الرقمية موثوقة (SHA-256 Hash Verified)",
      fr: "Empreinte numérique vérifiée (Hash SHA-256)",
      en: "Document Hash Digitally Verified (SHA-256)",
      es: "Huella Digital del Documento Verificada (SHA-256)",
    },
  },
  bot_compliance_labels: {
    googlebot_verified: {
      ar: "تم التحقق من زاحف جوجل الرسمي (Googlebot Safe Zone)",
      fr: "Robot Google Officiel Vérifié (Googlebot Safe Zone)",
      en: "Official Googlebot Crawler Verified",
      es: "Rastreador Oficial de Google Verificado",
    },
    canonical_protected: {
      ar: "الرابط الأصلي محمي ضد التكرار والتزوير",
      fr: "URL Canonique Protégée contre la duplication",
      en: "Canonical URL Protected against Spoofing",
      es: "URL Canónica Protegida contra Falsificación",
    },
  },
  security_dashboard_texts: {
    data_privacy_heading: {
      ar: "حماية البيانات والخصوصية المشددة",
      fr: "Protection des Données & Haute Sécurité",
      en: "Data Protection & High Security",
      es: "Protección de Datos y Alta Seguridad",
    },
    security_description: {
      ar: "يتم تشفير جميع ملفات السيرة الذاتية والوثائق المرفوعة على منصة ميزان تلقائياً باستخدام بروتوكول AES-256 قبل تخزينها. كلمات المرور يتم تحويلها إلى هاش مشفر غير قابل للتراجع، مما يضمن أماناً مطلقاً لحسابك.",
      fr: "Tous vos documents et fichiers téléchargés sur Mizan sont automatiquement chiffrés via AES-256 avant stockage. Les mots de passe sont hachés de manière irréversible, garantissant une sécurité absolue.",
      en: "All uploaded documents and files on Mizan are automatically encrypted using AES-256 before storage. Passwords are irreversibly hashed, ensuring absolute account security.",
      es: "Todos los documentos subidos a Mizan se cifran automáticamente mediante AES-256 antes de guardarse. Las contraseñas se procesan con hash irreversible.",
    },
  },
} as const;

export const securityBackendReference = {
  hashing_algorithm: "Argon2id via Supabase Auth (GoTrue API)",
  encryption_layer_1: "Cloudflare Full SSL/TLS Strict Mode (In Transit)",
  encryption_layer_2: "Storage Encryption via Transparent Data Encryption (At Rest)",
  cipher_suite: "AES_256_GCM",
} as const;

// ── 🛠️ HELPER UTILITIES ──────────────────────────────────────────────────────

/** Safely extracts localized security text with fallbacks */
export function getSecurityText(
  translation: SecurityTranslation | Record<SupportedLang, string>,
  lang: SupportedLang
): string {
  return translation[lang] || translation.ar || translation.en || "";
}

/** Get localized label for a system role */
export function getRoleLabel(role: Role, lang: SupportedLang = "ar"): string {
  const labelObj = ROLE_LABELS[role] || ROLE_LABELS.member;
  return getSecurityText(labelObj, lang);
}

/** Get localized description for a system role */
export function getRoleDescription(role: Role, lang: SupportedLang = "ar"): string {
  const descObj = ROLE_DESCRIPTIONS[role] || ROLE_DESCRIPTIONS.member;
  return getSecurityText(descObj, lang);
}

/** Master SEO Keyphrases for Images across 4 languages */
export function getPhotoSeoKeywords(lang: SupportedLang = "ar"): string[] {
  switch (lang) {
    case "ar":
      return ["منصة ميزان الرقمية", "صور قانونية عالية الجودة", "وثائق قانونية مغربية", "استشارات قانونية"];
    case "fr":
      return ["Mizan Digital", "Images Juridiques HD", "Documents Légaux Maroc", "Jurisprudence"];
    case "es":
      return ["Mizan Digital", "Imágenes Legales HD", "Documentos Legales Marruecos", "Jurisprudencia"];
    case "en":
    default:
      return ["Mizan Digital Platform", "HD Legal Images", "Moroccan Legal Documents", "Law Case Files"];
  }
}

/** Master SEO Keyphrases for Files and PDFs across 4 languages */
export function getFileSeoKeywords(lang: SupportedLang = "ar"): string[] {
  switch (lang) {
    case "ar":
      return ["تحميل ملفات قانونية PDF", "مستندات ميزان الرسمية", "قرارات محكمة النقض", "الجريدة الرسمية المغربية"];
    case "fr":
      return ["Télécharger PDF Juridique", "Documents Officiels Mizan", "Arrêts Cour de Cassation", "Bulletin Officiel"];
    case "es":
      return ["Descargar PDF Legal", "Documentos Oficiales Mizan", "Sentencias Tribunal de Casación", "Boletín Oficial"];
    case "en":
    default:
      return ["Download Legal PDF Files", "Mizan Official Documents", "Cassation Rulings", "Official Gazette"];
  }
}