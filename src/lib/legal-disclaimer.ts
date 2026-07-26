import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { type Role } from "./security";

// ── 🌐 DOMAIN & ENVIRONMENT CONFIGURATION ────────────────────────────────────
export const SITE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  "https://www.mizan.page";

export const APP_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  "https://www.mizan.page";

export type SupportedLang = "ar" | "fr" | "en" | "es";

export interface LegalDisclaimerDoc {
  node: "disclaimer";
  ar_title: string;
  fr_title: string;
  en_title: string;
  es_title: string;
  ar_content_html: string;
  fr_content_html: string;
  en_content_html: string;
  es_content_html: string;
  created_at?: string;
  updated_at?: string;
}

export interface DisclaimerSeoMeta {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  googleCrawlRules: string;
  jsonLd: Record<string, unknown>;
}

export interface DisclaimerPhotoSeo {
  cdnUrl: string;
  alt: string;
  title: string;
  keywords: string[];
  width: number;
  height: number;
  mimeType: string;
}

export interface DisclaimerFileSeo {
  downloadUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  title: string;
  keywords: string[];
  googleCrawlRules: string;
}

// ── 🏛️ MASTER LEGAL DISCLAIMER CONSTANT (4-LANGUAGE COMPLETE DATA) ──────────
export const disclaimerNode: LegalDisclaimerDoc = {
  node: "disclaimer",
  ar_title: "إخلاء المسؤولية القانونية والأكاديمية",
  fr_title: "Clause de Non-Responsabilité Légale et Académique",
  en_title: "Legal & Academic Disclaimer",
  es_title: "Exención de Responsabilidad Legal y Académica",

  ar_content_html: `
<section class="space-y-4 rtl text-right">
  <h2 class="text-xl font-bold text-primary">1. طبيعة المحتوى الأكاديمي</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    تُقدَّم جميع المواد ونماذج الامتحانات من الفصل الأول (S1) إلى الفصل السادس (S6) والتعليقات القانونية المنشورة على منصة ميزان لأغراض تعليمية وإعلامية بحتة، في إطار الموارد الأكاديمية المساعدة للطلبة والباحثين.
  </p>

  <h2 class="text-xl font-bold text-primary mt-6">2. حدود الضمان وتحديث النصوص</h2>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li>لا تضمن منصة ميزان التحديث المطلق للنصوص القانونية والمراسيم والقرارات الرسمية.</li>
    <li>لا تضمن المنصة خلوّ المحتوى من الأخطاء العفوية أو السهو المطبعي.</li>
    <li>قد تطرأ تعديلات تشريعية لاحقة في الجريدة الرسمية لا تظهر فوراً في المحتوى المنشور.</li>
  </ul>

  <h2 class="text-xl font-bold text-primary mt-6">3. عدم اعتباره استشارة قانونية</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    لا يشكّل أي محتوى منشور على هذه المنصة استشارة قانونية رسمية، ولا تنشأ عنه أي علاقة بين محامٍ وموكّل. تبقى المسؤولية القانونية الكاملة على عاتق المستخدم عند الاعتماد على هذه المواد في المساطر القضائية.
  </p>

  <h2 class="text-xl font-bold text-primary mt-6">4. المصدر الملزم والتنفيذي</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    يُنصح المستخدمون بالرجوع دائماً إلى <strong>الجريدة الرسمية</strong> للمملكة المغربية للاطلاع على النصوص التشريعية والتنظيمية الملزمة والمعتمدة رسمياً.
  </p>
</section>
`,

  fr_content_html: `
<section class="space-y-4 ltr text-left">
  <h2 class="text-xl font-bold text-primary">1. Nature du contenu académique</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    L'ensemble des supports, des modèles d'examen du premier au sixième semestre (S1 à S6) et des commentaires juridiques publiés sur la Plateforme Mizan sont fournis strictly à des fins éducatives et informatives, dans le cadre de ressources académiques destinées aux étudiants et chercheurs.
  </p>

  <h2 class="text-xl font-bold text-primary mt-6">2. Limites de garantie</h2>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li>Mizan ne garantit pas la mise à jour absolue des textes juridiques, décrets et décisions officielles.</li>
    <li>La plateforme ne garantit pas l'absence d'erreurs ou d'omissions dans le contenu.</li>
    <li>Des modifications législatives ultérieures peuvent ne pas être immédiatement reflétées.</li>
  </ul>

  <h2 class="text-xl font-bold text-primary mt-6">3. Absence de conseil juridique</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    Aucun contenu publié sur cette plateforme ne constitue un conseil juridique officiel et n'établit aucune relation avocat-client. L'utilisateur demeure seul responsable de l'usage de ces supports.
  </p>

  <h2 class="text-xl font-bold text-primary mt-6">4. Source contraignante</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    Il est recommandé aux utilisateurs de consulter le <strong>Bulletin Officiel</strong> du Royaume du Maroc pour les textes législatifs et réglementaires contraignants et officiellement adoptés.
  </p>
</section>
`,

  en_content_html: `
<section class="space-y-4 ltr text-left">
  <h2 class="text-xl font-bold text-primary">1. Nature of Academic Content</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    All materials, exam models from the first through sixth semester (S1 to S6), and legal commentaries published on the Mizan Platform are provided strictly for educational and informational purposes, as academic support resources for students and researchers.
  </p>

  <h2 class="text-xl font-bold text-primary mt-6">2. Limitations of Warranty</h2>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li>Mizan does not guarantee that official texts, decrees, and rulings are fully up to date.</li>
    <li>The platform does not guarantee that content is free of errors or omissions.</li>
    <li>Subsequent legislative amendments may not be immediately reflected in published content.</li>
  </ul>

  <h2 class="text-xl font-bold text-primary mt-6">3. Not Legal Advice</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    No content published on this platform constitutes formal legal advice, and no attorney-client relationship is created. Users bear sole responsibility for any reliance placed on these materials.
  </p>

  <h2 class="text-xl font-bold text-primary mt-6">4. Binding Official Source</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    Users are advised to consult the <strong>Official Bulletin</strong> (Bulletin Officiel) of the Kingdom of Morocco for binding and officially adopted statutory and regulatory texts.
  </p>
</section>
`,

  es_content_html: `
<section class="space-y-4 ltr text-left">
  <h2 class="text-xl font-bold text-primary">1. Naturaleza del contenido académico</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    Todos los materiales, modelos de examen del primer al sexto semestre (S1 a S6) y comentarios jurídicos publicados en la Plataforma Mizan se proporcionan estrictamente con fines educativos e informativos, como recursos académicos de apoyo para estudiantes e investigadores.
  </p>

  <h2 class="text-xl font-bold text-primary mt-6">2. Límites de la garantía</h2>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li>Mizan no garantiza la actualización absoluta de los textos jurídicos, decretos y resoluciones oficiales.</li>
    <li>La plataforma no garantiza que el contenido esté libre de errores u omisiones.</li>
    <li>Las modificaciones legislativas posteriores pueden no reflejarse de inmediato en el contenido publicado.</li>
  </ul>

  <h2 class="text-xl font-bold text-primary mt-6">3. No constituye asesoramiento jurídico</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    Ningún contenido publicado en esta plataforma constituye asesoramiento jurídico oficial, ni crea relación alguna entre abogado y cliente. El usuario asume la responsabilidad exclusiva del uso de estos materiales.
  </p>

  <h2 class="text-xl font-bold text-primary mt-6">4. Fuente vinculante</h2>
  <p class="text-base text-muted-foreground leading-relaxed">
    Se recomienda a los usuarios consultar el <strong>Boletín Oficial</strong> del Reino de Marruecos para los textos legislativos y reglamentarios vinculantes y oficialmente adoptados.
  </p>
</section>
`,
};

// ── 🔍 MASTER SEO & GOOGLE CRAWLER HELPERS ───────────────────────────────────

const DISCLAIMER_DESCRIPTIONS: Record<SupportedLang, string> = {
  ar: "إخلاء المسؤولية القانونية والأكاديمية لمنصة ميزان المغربية. شروط استخدام المواد والمراجع القانونية ونماذج الامتحانات الجامعية.",
  fr: "Clause de non-responsabilité légale et académique de la plateforme Mizan Maroc. Conditions d'utilisation des ressources juridiques et examens.",
  en: "Official legal and academic disclaimer for Mizan Digital Platform Morocco. Terms of use for legal research and university resources.",
  es: "Exención de responsabilidad legal y académica de la Plataforma Digital Mizan Marruecos. Términos de uso de recursos jurídicos.",
};

const DISCLAIMER_KEYWORDS: Record<SupportedLang, string[]> = {
  ar: [
    "إخلاء المسؤولية",
    "شروط الاستخدام ميزان",
    "استشارة قانونية المغرب",
    "الجريدة الرسمية المغربية",
    "منصة ميزان الرقمية",
    "قوانين المغرب PDF",
  ],
  fr: [
    "clause de non-responsabilite",
    "conditions d utilisation mizan",
    "droit marocain",
    "bulletin officiel maroc",
    "conseil juridique maroc",
    "mizan digital",
  ],
  en: [
    "legal disclaimer",
    "terms of service mizan",
    "moroccan law platform",
    "official bulletin morocco",
    "legal advice notice",
    "mizan digital",
  ],
  es: [
    "exencion de responsabilidad",
    "terminos de uso mizan",
    "derecho marroqui",
    "boletin oficial marruecos",
    "asesoramiento juridico",
    "mizan digital",
  ],
};

export function getDisclaimerSeoMeta(lang: SupportedLang = "ar"): DisclaimerSeoMeta {
  const title = (disclaimerNode[`${lang}_title` as keyof LegalDisclaimerDoc] as string) || disclaimerNode.ar_title;
  const description = DISCLAIMER_DESCRIPTIONS[lang] || DISCLAIMER_DESCRIPTIONS.ar;
  const keywords = DISCLAIMER_KEYWORDS[lang] || DISCLAIMER_KEYWORDS.ar;
  const canonicalUrl = `${SITE_URL}/${lang}/legal/disclaimer`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": canonicalUrl,
    url: canonicalUrl,
    name: title,
    description,
    inLanguage: lang,
    isPartOf: {
      "@type": "WebSite",
      name: "Mizan Digital Platform",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Mizan",
      url: SITE_URL,
      logo: `${SITE_URL}/Logo.svg`,
    },
  };

  return {
    title: `${title} | Mizan Digital`,
    description,
    keywords,
    canonicalUrl,
    googleCrawlRules: "index, follow, max-image-preview:large, max-snippet:-1",
    jsonLd,
  };
}

export function getDisclaimerPhotoMeta(lang: SupportedLang = "ar"): DisclaimerPhotoSeo {
  const titles: Record<SupportedLang, string> = {
    ar: "صورة إخلاء المسؤولية القانونية - منصة ميزان",
    fr: "Image Clause de Non-Responsabilité - Plateforme Mizan",
    en: "Legal Disclaimer Image - Mizan Digital Platform",
    es: "Imagen Exención de Responsabilidad - Plataforma Mizan",
  };

  return {
    cdnUrl: `${SITE_URL}/assets/images/legal/disclaimer-banner.webp`,
    alt: titles[lang],
    title: `${titles[lang]} | ${SITE_URL}`,
    keywords: DISCLAIMER_KEYWORDS[lang],
    width: 1200,
    height: 630,
    mimeType: "image/webp",
  };
}

export function getDisclaimerFileSeo(lang: SupportedLang = "ar"): DisclaimerFileSeo {
  const titles: Record<SupportedLang, string> = {
    ar: "تحميل وثيقة إخلاء المسؤولية القانونية PDF",
    fr: "Télécharger la Clause de Non-Responsabilité en PDF",
    en: "Download Legal Disclaimer Document PDF",
    es: "Descargar Documento de Exención de Responsabilidad PDF",
  };

  return {
    downloadUrl: `${SITE_URL}/assets/docs/mizan-legal-disclaimer-${lang}.pdf`,
    fileName: `mizan-legal-disclaimer-${lang}.pdf`,
    fileSizeBytes: 245000,
    mimeType: "application/pdf",
    title: titles[lang],
    keywords: DISCLAIMER_KEYWORDS[lang],
    googleCrawlRules: "index, follow",
  };
}

// ── 🛡️ MILITARY-GRADE SECURITY & RBAC PERMISSION HELPERS ────────────────────

export function hasDisclaimerEditAccess(role: Role): boolean {
  return ["root", "security_admin", "admin", "writer"].includes(role);
}

// ── 🔄 SUPABASE DATABASE INTEGRATION ─────────────────────────────────────────

/** Fetches the latest disclaimer document from Supabase `site_legal_documents` */
export async function fetchDisclaimerNode(): Promise<LegalDisclaimerDoc> {
  if (!isSupabaseConfigured) {
    return disclaimerNode;
  }

  try {
    // Cast query builder to avoid 'never' type mismatch when DB types are ungenerated
    const { data, error } = await (supabase.from("site_legal_documents" as never) as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: LegalDisclaimerDoc | null; error: unknown }>;
        };
      };
    })
      .select("*")
      .eq("node", "disclaimer")
      .maybeSingle();

    if (error || !data) {
      return disclaimerNode;
    }

    return {
      node: "disclaimer",
      ar_title: data.ar_title || disclaimerNode.ar_title,
      fr_title: data.fr_title || disclaimerNode.fr_title,
      en_title: data.en_title || disclaimerNode.en_title,
      es_title: data.es_title || disclaimerNode.es_title,
      ar_content_html: data.ar_content_html || disclaimerNode.ar_content_html,
      fr_content_html: data.fr_content_html || disclaimerNode.fr_content_html,
      en_content_html: data.en_content_html || disclaimerNode.en_content_html,
      es_content_html: data.es_content_html || disclaimerNode.es_content_html,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch {
    return disclaimerNode;
  }
}

/** Safely updates the disclaimer document in Supabase with role checks */
export async function updateDisclaimerNode(
  updatedDoc: Partial<LegalDisclaimerDoc>,
  userRole: Role
): Promise<{ success: boolean; error?: string }> {
  if (!hasDisclaimerEditAccess(userRole)) {
    return { success: false, error: "Unauthorized: Insufficient role permissions." };
  }

  if (!isSupabaseConfigured) {
    return { success: false, error: "Database connection unavailable." };
  }

  try {
    const payload = {
      node: "disclaimer",
      ar_title: updatedDoc.ar_title,
      fr_title: updatedDoc.fr_title,
      en_title: updatedDoc.en_title,
      es_title: updatedDoc.es_title,
      ar_content_html: updatedDoc.ar_content_html,
      fr_content_html: updatedDoc.fr_content_html,
      en_content_html: updatedDoc.en_content_html,
      es_content_html: updatedDoc.es_content_html,
      updated_at: new Date().toISOString(),
    };

    // Bypass 'never[]' type mismatch by explicitly typing table name query builder
    const { error } = await (supabase.from("site_legal_documents" as never) as unknown as {
      upsert: (
        data: Record<string, unknown>,
        options?: { onConflict?: string }
      ) => Promise<{ error: { message: string } | null }>;
    }).upsert(payload, { onConflict: "node" });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return { success: false, error: message };
  }
}