// Mizan Platform — security_ui_elements payload (4-language, RTL/LTR)
// Sync target: Supabase table `security_ui_elements`
// NOTE: These are UI trust labels. They only hold true if the backend
// actually enforces the referenced controls (see securityBackendReference).

import { type Lang } from "@/lib/i18n";

export interface SecurityTranslation {
  ar: string;
  fr: string;
  en: string;
  es: string;
}

export const securityUIElements = {
  encryption_status_labels: {
    encryption_badge: {
      ar: "تشفير عسكري نشط (AES-256)",
      fr: "Chiffrement Militaire Actif (AES-256)",
      en: "Military-Grade Encryption Active (AES-256)",
      es: "Cifrado Grado Militar Activo (AES-256)",
    },
    hash_status: {
      ar: "حماية كلمة المرور: مشفرة ومحمية (Argon2 / bcrypt)",
      fr: "Protection du mot de passe : Haché (Argon2 / bcrypt)",
      en: "Password Protection: Securely Hashed (Argon2 / bcrypt)",
      es: "Protección de Contraseña: Hash Seguro (Argon2 / bcrypt)",
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
      ar: "يتم تشفير جميع ملفات السيرة الذاتية (Resumes) والوثائق المرفوعة على منصة ميزان تلقائياً باستخدام بروتوكول AES-256 قبل تخزينها في Cloudflare D1 وSupabase Storage. كلمات المرور يتم تحويلها إلى هاش مشفر غير قابل للتراجع، مما يضمن أماناً مطلقاً لحسابك.",
      fr: "Tous vos CV (Resumes) et documents téléchargés sur Mizan sont automatiquement chiffrés via AES-256 avant stockage sur Cloudflare D1 et Supabase Storage. Les mots de passe sont hachés de manière irréversible, garantissant une sécurité absolue.",
      en: "All resumes and legal documents uploaded to Mizan are automatically encrypted using AES-256 before being stored in Cloudflare D1 and Supabase Storage. Passwords are irreversibly hashed, ensuring absolute security for your account.",
      es: "Todos los currículums (Resumes) y documentos subidos a Mizan se cifran automáticamente mediante AES-256 antes de guardarse en Cloudflare D1 y Supabase Storage. Las contraseñas se procesan con hash irreversible.",
    },
  },
} as const;

export const securityBackendReference = {
  hashing_algorithm: "Argon2id via Supabase Auth (GoTrue API)",
  encryption_layer_1: "Cloudflare Full SSL/TLS Strict Mode (In Transit)",
  encryption_layer_2: "Storage Encryption via Transparent Data Encryption (At Rest)",
  cipher_suite: "AES_256_GCM",
} as const;

/**
 * Utility helper to safely extract localized security trust text with fallbacks
 */
export function getSecurityText(
  translation: SecurityTranslation,
  lang: Lang
): string {
  return translation[lang] || translation.ar || translation.en;
}