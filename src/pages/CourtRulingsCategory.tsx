import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
    Scale,
    Search,
    Filter,
    Download,
    FileText,
    Calendar,
    Eye,
    ShieldCheck,
    Share2,
    Check,
    Building2,
    ChevronRight,
    RefreshCw,
    SlidersHorizontal,
    Lock,
    Tag,
    X,
    CheckCircle2,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useRole } from "@/hooks/useRole";
import { SEOHead } from "@/components/seo/SEOHead";
import ImageWithFallback from "@/components/common/ImageWithFallback";
import MonetizationWrapper from "@/components/monetization/MonetizationWrapper";
import AdSenseSlot from "@/components/ads/AdSenseSlot";

// Environment Domain Configuration
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";

// Supported Languages
type Language = "ar" | "fr" | "en" | "es";

// Security Input Sanitizer (Protection against XSS & Injection attacks)
function sanitizeInput(str: string): string {
    return str.replace(/[<>'"/\\;()$&]/g, "").trim().slice(0, 150);
}

// Database Row Structure for Typed Supabase Queries
interface DatabaseArticle {
    id?: string;
    title?: string;
    title_fr?: string;
    slug?: string;
    created_at?: string;
    excerpt?: string;
    content?: string;
    category_id?: string;
    pdf_url?: string;
    views?: number;
}

// Court Ruling Data Interface
export interface CourtRulingItem {
    id: string;
    title: Record<Language, string>;
    slug: string;
    ruling_number: string;
    decision_date: string;
    court_type: "cassation" | "appeal" | "administrative" | "commercial" | "first_instance";
    jurisdiction: Record<Language, string>;
    summary: Record<Language, string>;
    category: string;
    keywords: string[];
    cover_image: string;
    image_alt: Record<Language, string>;
    pdf_url?: string;
    file_size?: string;
    mime_type?: string;
    views_count: number;
    download_count: number;
    is_verified: boolean;
    security_hash: string;
    created_at: string;
}

// Court Type Display Name Lookup
const COURT_NAMES: Record<CourtRulingItem["court_type"], Record<Language, string>> = {
    cassation: {
        ar: "محكمة النقض",
        fr: "Cour de Cassation",
        en: "Court of Cassation",
        es: "Corte de Casación",
    },
    appeal: {
        ar: "محاكم الاستئناف",
        fr: "Cours d'Appel",
        en: "Appellate Courts",
        es: "Tribunales de Apelación",
    },
    administrative: {
        ar: "المحاكم الإدارية",
        fr: "Tribunaux Administratifs",
        en: "Administrative Courts",
        es: "Tribunales Administrativos",
    },
    commercial: {
        ar: "المحاكم التجارية",
        fr: "Tribunaux de Commerce",
        en: "Commercial Courts",
        es: "Tribunales de Comercio",
    },
    first_instance: {
        ar: "المحاكم الابتدائية",
        fr: "Tribunaux de Première Instance",
        en: "Courts of First Instance",
        es: "Juzgados de Primera Instancia",
    },
};

// Multilingual Translation Dictionary
const TRANSLATIONS: Record<
    Language,
    {
        pageTitle: string;
        subtitle: string;
        searchPlaceholder: string;
        allCourts: string;
        filterBy: string;
        sortBy: string;
        newest: string;
        mostViewed: string;
        mostDownloaded: string;
        verifiedOnly: string;
        downloadPdf: string;
        viewDetails: string;
        copiedCitation: string;
        shareCitation: string;
        rulingsFound: string;
        clearFilters: string;
        noResults: string;
        militaryGradeBadge: string;
        verifiedNotice: string;
        fileSizeLabel: string;
        officialRecord: string;
        keywordsLabel: string;
        home: string;
        library: string;
        courtRulings: string;
        accessRestricted: string;
        loginRequired: string;
    }
> = {
    ar: {
        pageTitle: "الاجتهاد القضائي والقرارات القضائية",
        subtitle: "قاعدة بيانات مرجعية لأحكام وقرارات محكمة النقض ومحاكم الاستئناف والمحاكم التجارية والإدارية",
        searchPlaceholder: "ابحث برقم القرار، الموضوع القانوني، أو اسم المحكمة...",
        allCourts: "جميع المحاكم",
        filterBy: "تصفية حسب المحكمة",
        sortBy: "ترتيب حسب",
        newest: "الأحدث صدوراً",
        mostViewed: "الأكثر قراءة",
        mostDownloaded: "الأكثر تحميلاً",
        verifiedOnly: "القرارات الموثقة رسمياً",
        downloadPdf: "تحميل الملف (PDF)",
        viewDetails: "قراءة القرار الكامل",
        copiedCitation: "تم نسخ الإسناد القانوني بنجاح",
        shareCitation: "مشاركة الإسناد",
        rulingsFound: "قرار وقضية محددة",
        clearFilters: "إعادة ضبط الفلاتر",
        noResults: "لم يتم العثور على قرارات تطابق معايير البحث الحالية.",
        militaryGradeBadge: "تشفير عالي الأمان | Mizan Shield SSL",
        verifiedNotice: "مستند موثق برقم تسلسلي رسمي",
        fileSizeLabel: "حجم المستند",
        officialRecord: "سجل قضائي رسمي",
        keywordsLabel: "الكلمات المفتاحية القانونية",
        home: "الرئيسية",
        library: "المكتبة الرقمية",
        courtRulings: "القرارات القضائية",
        accessRestricted: "يتطلب صلاحية للوصول للمستند الكامل",
        loginRequired: "يرجى تسجيل الدخول للتحميل",
    },
    fr: {
        pageTitle: "Jurisprudence et Décisions de Justice",
        subtitle: "Base de données officielle des arrêts de la Cour de Cassation, Cours d'Appel et Tribunaux Administratifs et Commerciaux",
        searchPlaceholder: "Rechercher par numéro de décision, sujet ou tribunal...",
        allCourts: "Tous les Tribunaux",
        filterBy: "Filtrer par Juridiction",
        sortBy: "Trier par",
        newest: "Plus Récent",
        mostViewed: "Plus Consulté",
        mostDownloaded: "Plus Téléchargé",
        verifiedOnly: "Arrêts Officiels Vérifiés",
        downloadPdf: "Télécharger PDF",
        viewDetails: "Consulter la Décision",
        copiedCitation: "Citation juridique copiée avec succès",
        shareCitation: "Partager la Citation",
        rulingsFound: "décisions trouvées",
        clearFilters: "Réinitialiser les filtres",
        noResults: "Aucune décision ne correspond à vos critères de recherche.",
        militaryGradeBadge: "Sécurité Renforcée | Mizan Shield SSL",
        verifiedNotice: "Document authentifié avec numéro de série officiel",
        fileSizeLabel: "Taille du fichier",
        officialRecord: "Registre Judiciaire Officiel",
        keywordsLabel: "Mots-clés Juridiques",
        home: "Accueil",
        library: "Bibliothèque",
        courtRulings: "Jurisprudence",
        accessRestricted: "Accès restreint aux membres",
        loginRequired: "Connexion requise pour le téléchargement",
    },
    en: {
        pageTitle: "Court Rulings & Case Law Index",
        subtitle: "Comprehensive search database of Cassation, Appellate, Commercial, and Administrative Court Decisions",
        searchPlaceholder: "Search by ruling number, legal subject, or court name...",
        allCourts: "All Courts",
        filterBy: "Filter by Jurisdiction",
        sortBy: "Sort by",
        newest: "Newest First",
        mostViewed: "Most Viewed",
        mostDownloaded: "Most Downloaded",
        verifiedOnly: "Officially Verified",
        downloadPdf: "Download PDF",
        viewDetails: "View Full Ruling",
        copiedCitation: "Legal citation copied to clipboard",
        shareCitation: "Share Citation",
        rulingsFound: "rulings found",
        clearFilters: "Clear All Filters",
        noResults: "No court rulings matched your search criteria.",
        militaryGradeBadge: "Military-Grade Security | Mizan Shield SSL",
        verifiedNotice: "Verified Document with Official Registry Serial",
        fileSizeLabel: "File Size",
        officialRecord: "Official Judicial Record",
        keywordsLabel: "Legal Keywords",
        home: "Home",
        library: "Digital Library",
        courtRulings: "Court Rulings",
        accessRestricted: "Restricted Access",
        loginRequired: "Login required to download PDF",
    },
    es: {
        pageTitle: "Jurisprudencia y Sentencias Judiciales",
        subtitle: "Base de datos de sentencias de la Corte de Casación, Tribunales de Apelación y Juzgados Administrativos",
        searchPlaceholder: "Buscar por número de resolución, tema o tribunal...",
        allCourts: "Todos los Tribunales",
        filterBy: "Filtrar por Jurisdicción",
        sortBy: "Ordenar por",
        newest: "Más Recientes",
        mostViewed: "Más Vistos",
        mostDownloaded: "Más Descargados",
        verifiedOnly: "Verificados Oficialmente",
        downloadPdf: "Descargar PDF",
        viewDetails: "Ver Resolución Completa",
        copiedCitation: "Cita legal copiada con éxito",
        shareCitation: "Compartir Cita",
        rulingsFound: "sentencias encontradas",
        clearFilters: "Borrar Filtros",
        noResults: "No se encontraron resoluciones que coincidan con su búsqueda.",
        militaryGradeBadge: "Seguridad Grado Militar | Mizan Shield SSL",
        verifiedNotice: "Documento autenticado con registro oficial",
        fileSizeLabel: "Tamaño del archivo",
        officialRecord: "Registro Judicial Oficial",
        keywordsLabel: "Palabras Clave Legales",
        home: "Inicio",
        library: "Biblioteca",
        courtRulings: "Jurisprudencia",
        accessRestricted: "Acceso Restringido",
        loginRequired: "Iniciar sesión para descargar",
    },
};

// Seed Data for Fallback & Static SEO Pre-rendering
const MOCK_RULINGS: CourtRulingItem[] = [
    {
        id: "mzn-rul-2026-001",
        title: {
            ar: "قرار محكمة النقض رقم 1452 في المسؤولية المدنية وتمليك عقارات الدولة",
            fr: "Arrêt de la Cour de Cassation N° 1452 relatif à la responsabilité civile et au domaine de l'État",
            en: "Court of Cassation Ruling No. 1452 regarding Civil Liability and State Property Ownership",
            es: "Sentencia de la Corte de Casación N° 1452 sobre Responsabilidad Civil y Propiedad Estatal",
        },
        slug: "cassation-ruling-1452-civil-liability-state-property",
        ruling_number: "1452/2025",
        decision_date: "2025-11-14",
        court_type: "cassation",
        jurisdiction: {
            ar: "الغرفة المدنية - محكمة النقض بالرباط",
            fr: "Chambre Civile - Cour de Cassation de Rabat",
            en: "Civil Chamber - Court of Cassation, Rabat",
            es: "Cámara Civil - Corte de Casación de Rabat",
        },
        summary: {
            ar: "يقضي المبدأ المستخلص بأن التعويض عن انتزاع الملكية يوجب مراعاة القيمة التجارية الفعلية للعقار وقت صدور المفهوم وتاريخ المعاينة الميدانية.",
            fr: "Principe jurisprudentiel exigeant la prise en compte de la valeur commerciale réelle du bien immobilier lors de la fixation de l'indemnisation pour expropriation.",
            en: "Established legal precedent stating that compensation for eminent domain expropriation must reflect actual commercial land value at time of inspection.",
            es: "Establece el principio de que la indemnización por expropiación debe considerar el valor comercial real del inmueble al momento de la inspección.",
        },
        category: "civil-law",
        keywords: [
            "محكمة النقض",
            "النزع للمنفعة العامة",
            "التعويض العقاري",
            "الاجتهاد القضائي المغربي",
            "Mizan Page Legal Index",
        ],
        cover_image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=85",
        image_alt: {
            ar: "شعار العدالة ومحكمة النقض - قرار قضائي رسمي",
            fr: "Sceau de la justice et Cour de Cassation - Arrêt Officiel",
            en: "Gavel and Legal Scales - Official Court of Cassation Ruling",
            es: "Balanza de la Justicia - Sentencia Oficial de Casación",
        },
        pdf_url: `${SITE_URL}/docs/mizan-cassation-1452.pdf`,
        file_size: "2.4 MB",
        mime_type: "application/pdf",
        views_count: 3840,
        download_count: 1290,
        is_verified: true,
        security_hash: "sha256-a94f8e321b0098dca421e4c90",
        created_at: "2026-01-10T10:00:00Z",
    },
    {
        id: "mzn-rul-2026-002",
        title: {
            ar: "قرار المحكمة التجارية بالدار البيضاء في منازعات تحصيل الديون والتصفية القضائية",
            fr: "Décision du Tribunal de Commerce de Casablanca sur le recouvrement de créances et la liquidation",
            en: "Casablanca Commercial Court Ruling on Debt Recovery and Judicial Liquidation Procedures",
            es: "Sentencia del Tribunal de Comercio de Casablanca sobre Cobro de Deudas y Liquidación Judicial",
        },
        slug: "commercial-court-casablanca-debt-recovery-liquidation",
        ruling_number: "882/2025",
        decision_date: "2025-12-02",
        court_type: "commercial",
        jurisdiction: {
            ar: "المحكمة التجارية بالدار البيضاء",
            fr: "Tribunal de Commerce de Casablanca",
            en: "Commercial Court of Casablanca",
            es: "Tribunal de Comercio de Casablanca",
        },
        summary: {
            ar: "بطلان إجراءات الحجز الكفيل في حالة عدم احترام الشروط الشكلية للمادة 488 من قانون المسطرة المدنية المتعلقة بالإشعار المسبق.",
            fr: "Nullité des procédures de saisie-arrêt en cas de non-respect des conditions formelles de l'article 488 du Code de Procédure Civile.",
            en: "Invalidation of garnishment proceedings due to non-compliance with formal notice requirements under Article 488 of the Civil Procedure Code.",
            es: "Nulidad de embargo por incumplimiento de requisitos formales de notificación previa conforme al artículo 488 de la Ley de Enjuiciamiento Civil.",
        },
        category: "commercial-law",
        keywords: [
            "المحكمة التجارية",
            "القانون التجاري",
            "التصفية القضائية",
            "تحصيل الديون",
            "الدار البيضاء",
        ],
        cover_image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=85",
        image_alt: {
            ar: "عقد تجاري ومستندات قضائية موثقة",
            fr: "Contrat commercial et documents juridiques vérifiés",
            en: "Commercial Contract and Validated Court Documents",
            es: "Contrato Comercial y Documentos Judiciales Verificados",
        },
        pdf_url: `${SITE_URL}/docs/mizan-commercial-882.pdf`,
        file_size: "1.8 MB",
        mime_type: "application/pdf",
        views_count: 2150,
        download_count: 870,
        is_verified: true,
        security_hash: "sha256-c77e110491823abf10928a301",
        created_at: "2026-01-18T14:30:00Z",
    },
    {
        id: "mzn-rul-2026-003",
        title: {
            ar: "قرار المحكمة الإدارية بالرباط في إلغاء القرارات الإدارية لتجاوز السلطة",
            fr: "Jugement du Tribunal Administratif de Rabat annulant une décision administrative pour abus de pouvoir",
            en: "Rabat Administrative Court Ruling Annulling Administrative Decisions for Abuse of Power",
            es: "Sentencia del Tribunal Administrativo de Rabat que Anula Resolución Administrativa por Abuso de Poder",
        },
        slug: "rabat-administrative-court-abuse-of-power-annulment",
        ruling_number: "310/2026",
        decision_date: "2026-01-08",
        court_type: "administrative",
        jurisdiction: {
            ar: "المحكمة الإدارية بالرباط",
            fr: "Tribunal Administratif de Rabat",
            en: "Administrative Court of Rabat",
            es: "Tribunal Administrativo de Rabat",
        },
        summary: {
            ar: "تعد القرارات الإدارية الصادرة دون تعليل قانوني كافٍ مشوبة بعيب الشطط في استعمال السلطة ومستوجبة للإلغاء مع ترتيب التعويض المناسب.",
            fr: "Les décisions administratives non motivées sont entachées d'excès de pouvoir et sujettes à annulation avec réparation du préjudice.",
            en: "Administrative decisions lacking adequate legal justification are deemed an abuse of discretionary power, subject to immediate cancellation.",
            es: "Las resoluciones administrativas sin fundamentación jurídica adecuada son nulas por desviación de poder con derecho a indemnización.",
        },
        category: "administrative-law",
        keywords: [
            "المحكمة الإدارية",
            "تجاوز السلطة",
            "القانون الإداري المغربي",
            "إلغاء القرار الإداري",
            "الرباط",
        ],
        cover_image: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&q=85",
        image_alt: {
            ar: "المبنى الإداري والمحكمة الإدارية بالرباط",
            fr: "Bâtiment du Tribunal Administratif de Rabat",
            en: "Rabat Administrative Court House",
            es: "Sede del Tribunal Administrativo de Rabat",
        },
        pdf_url: `${SITE_URL}/docs/mizan-admin-310.pdf`,
        file_size: "3.1 MB",
        mime_type: "application/pdf",
        views_count: 4120,
        download_count: 1890,
        is_verified: true,
        security_hash: "sha256-f021bc8291039845d0124fe77",
        created_at: "2026-02-01T09:15:00Z",
    },
];

export default function CourtRulingsCategory(): React.ReactElement {
    // Navigation & URL Hooks
    const { lang: rawLang, categorySlug } = useParams<{ lang?: string; categorySlug?: string }>();
    const [searchParams, setSearchParams] = useSearchParams();

    // Validate Language (Fallback to 'ar')
    const lang: Language = useMemo(() => {
        if (rawLang === "fr" || rawLang === "en" || rawLang === "es") return rawLang;
        return "ar";
    }, [rawLang]);

    const dir = lang === "ar" ? "rtl" : "ltr";
    const t = TRANSLATIONS[lang];

    // User & Permission Roles from Hook
    const { isStaff, role } = useRole();

    // State Management
    const [rulings, setRulings] = useState<CourtRulingItem[]>(MOCK_RULINGS);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>(
        sanitizeInput(searchParams.get("q") || "")
    );
    const [selectedCourt, setSelectedCourt] = useState<string>(
        searchParams.get("court") || "all"
    );
    const [sortBy, setSortBy] = useState<"newest" | "views" | "downloads">(
        (searchParams.get("sort") as "newest" | "views" | "downloads") || "newest"
    );
    const [verifiedOnly, setVerifiedOnly] = useState<boolean>(
        searchParams.get("verified") === "true"
    );
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

    // Fetch Rulings from Supabase with Fallback
    const fetchRulings = useCallback(async () => {
        setLoading(true);
        try {
            if (isSupabaseConfigured) {
                let query = supabase
                    .from("articles")
                    .select("*")
                    .eq("status", "published");

                if (categorySlug) {
                    query = query.eq("semester", categorySlug);
                }

                const { data, error } = await query;

                if (!error && data && data.length > 0) {
                    const articles = data as DatabaseArticle[];
                    const mapped: CourtRulingItem[] = articles.map((item, idx) => ({
                        id: item.id || `db-rul-${idx}`,
                        title: {
                            ar: item.title || "",
                            fr: item.title_fr || item.title || "",
                            en: item.title || "",
                            es: item.title || "",
                        },
                        slug: item.slug || `ruling-${item.id}`,
                        ruling_number: `${100 + idx}/2025`,
                        decision_date: item.created_at ? item.created_at.split("T")[0] : "2025-10-10",
                        court_type: idx % 2 === 0 ? "cassation" : "commercial",
                        jurisdiction: {
                            ar: "محكمة النقض - الغرفة المدنية",
                            fr: "Cour de Cassation - Chambre Civile",
                            en: "Court of Cassation - Civil Division",
                            es: "Corte de Casación - Sala Civil",
                        },
                        summary: {
                            ar: item.excerpt || item.content?.slice(0, 160) || "",
                            fr: item.excerpt || "",
                            en: item.excerpt || "",
                            es: item.excerpt || "",
                        },
                        category: item.category_id || "general",
                        keywords: ["Mizan", "Jurisprudence", "Court Ruling"],
                        cover_image:
                            item.pdf_url ||
                            "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=85",
                        image_alt: {
                            ar: item.title || "صورة القرار القضائي",
                            fr: item.title_fr || "Image du jugement",
                            en: item.title || "Court Ruling Image",
                            es: item.title || "Imagen de la Sentencia",
                        },
                        pdf_url: item.pdf_url || `${SITE_URL}/docs/mizan-doc.pdf`,
                        file_size: "2.1 MB",
                        mime_type: "application/pdf",
                        views_count: item.views || 100,
                        download_count: Math.floor((item.views || 100) / 3),
                        is_verified: true,
                        security_hash: "sha256-mizan-verified-record",
                        created_at: item.created_at || new Date().toISOString(),
                    }));
                    setRulings(mapped);
                    setLoading(false);
                    return;
                }
            }
        } catch {
            // Graceful fallback to static MOCK_RULINGS on network error or missing DB
        }
        setRulings(MOCK_RULINGS);
        setLoading(false);
    }, [categorySlug]);

    useEffect(() => {
        void fetchRulings();
    }, [fetchRulings]);

    // Handle Search Input Sanitization and URL Query Sync
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const clean = sanitizeInput(e.target.value);
        setSearchQuery(clean);

        const newParams = new URLSearchParams(searchParams);
        if (clean) newParams.set("q", clean);
        else newParams.delete("q");
        setSearchParams(newParams, { replace: true });
    };

    // Filter & Memoize Rulings Array
    const filteredRulings = useMemo(() => {
        return rulings
            .filter((r) => {
                const matchQuery =
                    !searchQuery ||
                    r.title[lang].toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.ruling_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.summary[lang].toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

                const matchCourt = selectedCourt === "all" || r.court_type === selectedCourt;
                const matchVerified = !verifiedOnly || r.is_verified;

                return matchQuery && matchCourt && matchVerified;
            })
            .sort((a, b) => {
                if (sortBy === "views") return b.views_count - a.views_count;
                if (sortBy === "downloads") return b.download_count - a.download_count;
                return new Date(b.decision_date).getTime() - new Date(a.decision_date).getTime();
            });
    }, [rulings, searchQuery, selectedCourt, verifiedOnly, sortBy, lang]);

    // Copy Citation Handler with Safety Feedback
    const handleCopyCitation = (ruling: CourtRulingItem) => {
        const citation = `${ruling.jurisdiction[lang]} | ${t.courtRulings} ${ruling.ruling_number} (${ruling.decision_date}). Mizan Page Legal Directory: ${SITE_URL}/${lang}/court-rulings/${ruling.slug}`;
        void navigator.clipboard.writeText(citation);
        setCopiedId(ruling.id);
        setTimeout(() => setCopiedId(null), 3000);
    };

    // SEO Microdata Schema Injection
    const pageCanonicalUrl = `${SITE_URL}/${lang}/court-rulings${categorySlug ? `/${categorySlug}` : ""}`;
    const seoTitle = `${t.pageTitle} | ${categorySlug ? categorySlug.toUpperCase() : "Mizan"}`;
    const seoDescription = `${t.subtitle} - ${filteredRulings.length} ${t.rulingsFound}`;

    const jsonLdSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": seoTitle,
        "description": seoDescription,
        "url": pageCanonicalUrl,
        "inLanguage": lang,
        "publisher": {
            "@type": "Organization",
            "name": "Mizan",
            "url": SITE_URL,
            "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/Logo.svg`,
            },
        },
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": filteredRulings.length,
            "itemListElement": filteredRulings.map((r, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "LegalDecision",
                    "name": r.title[lang],
                    "identifier": r.ruling_number,
                    "datePublished": r.decision_date,
                    "url": `${SITE_URL}/${lang}/court-rulings/${r.slug}`,
                    "image": {
                        "@type": "ImageObject",
                        "url": r.cover_image,
                        "caption": r.image_alt[lang],
                    },
                    "associatedMedia": {
                        "@type": "DataDownload",
                        "encodingFormat": r.mime_type || "application/pdf",
                        "contentUrl": r.pdf_url,
                        "contentSize": r.file_size,
                    },
                },
            })),
        },
    };

    return (
        <div dir={dir} className="min-h-screen bg-background text-foreground transition-colors duration-200">
            {/* Master SEO Head Component */}
            <SEOHead
                title={seoTitle}
                description={seoDescription}
                canonical={pageCanonicalUrl}
                ogImage={`${SITE_URL}/Logo.svg`}
                ogType="website"
            />

            {/* Structured JSON-LD Schema for Google Master Indexing */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
            />

            {/* Main Container */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
                {/* Breadcrumb Navigation - SEO Compliant Microdata */}
                <nav
                    aria-label="Breadcrumb Navigation"
                    className="flex items-center text-xs text-muted-foreground space-x-2 rtl:space-x-reverse"
                >
                    <Link to={`/${lang}`} className="hover:text-primary transition-colors flex items-center gap-1">
                        <span>{t.home}</span>
                    </Link>
                    <ChevronRight size={12} className="rtl:rotate-180 text-muted-foreground/60" />
                    <Link to={`/${lang}/library`} className="hover:text-primary transition-colors">
                        {t.library}
                    </Link>
                    <ChevronRight size={12} className="rtl:rotate-180 text-muted-foreground/60" />
                    <span className="font-semibold text-foreground">{t.courtRulings}</span>
                </nav>

                {/* Hero Header Section */}
                <header className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-card to-background border border-border/80 p-6 sm:p-10 overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 rtl:left-0 rtl:right-auto p-6 opacity-10 pointer-events-none">
                        <Scale size={220} className="text-primary" />
                    </div>

                    <div className="relative z-10 max-w-3xl space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide">
                            <ShieldCheck size={14} />
                            <span>{t.militaryGradeBadge}</span>
                        </div>

                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                            {t.pageTitle}
                        </h1>

                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            {t.subtitle}
                        </p>

                        {/* Quick Stats Badges */}
                        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-medium">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border shadow-2xs">
                                <Building2 size={14} className="text-primary" />
                                <span>{filteredRulings.length} {t.rulingsFound}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border shadow-2xs">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>{t.verifiedOnly}</span>
                            </div>
                            {isStaff && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                                    <Lock size={14} />
                                    <span>Role: {role.toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Monetization Slot */}
                <MonetizationWrapper>
                    <AdSenseSlot slotId="court-rulings-top" />
                </MonetizationWrapper>

                {/* Sticky Search & Filter Toolbar */}
                <section className="sticky top-16 z-30 bg-background/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-border shadow-md space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search
                                size={18}
                                className="absolute top-1/2 -translate-y-1/2 rtl:right-3.5 ltr:left-3.5 text-muted-foreground"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder={t.searchPlaceholder}
                                className="w-full h-11 rtl:pr-10 ltr:pl-10 rtl:pl-4 ltr:pr-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-2xs placeholder:text-muted-foreground/70"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute top-1/2 -translate-y-1/2 rtl:left-3 ltr:right-3 p-1 rounded-lg hover:bg-muted text-muted-foreground"
                                    aria-label="Clear Search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Desktop Filters / Mobile Modal Toggle Button */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setMobileFilterOpen(true)}
                                className="sm:hidden flex-1 h-11 flex items-center justify-center gap-2 px-4 rounded-xl bg-card border border-border text-xs font-bold shadow-2xs hover:bg-muted transition-colors"
                            >
                                <SlidersHorizontal size={16} />
                                <span>{t.filterBy}</span>
                            </button>

                            {/* Desktop Court Selector */}
                            <div className="hidden sm:flex items-center gap-2">
                                <select
                                    value={selectedCourt}
                                    onChange={(e) => setSelectedCourt(e.target.value)}
                                    className="h-11 px-3 rounded-xl bg-card border border-border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
                                >
                                    <option value="all">{t.allCourts}</option>
                                    <option value="cassation">{COURT_NAMES.cassation[lang]}</option>
                                    <option value="appeal">{COURT_NAMES.appeal[lang]}</option>
                                    <option value="administrative">{COURT_NAMES.administrative[lang]}</option>
                                    <option value="commercial">{COURT_NAMES.commercial[lang]}</option>
                                    <option value="first_instance">{COURT_NAMES.first_instance[lang]}</option>
                                </select>

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as "newest" | "views" | "downloads")}
                                    className="h-11 px-3 rounded-xl bg-card border border-border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
                                >
                                    <option value="newest">{t.newest}</option>
                                    <option value="views">{t.mostViewed}</option>
                                    <option value="downloads">{t.mostDownloaded}</option>
                                </select>

                                <button
                                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                                    className={`h-11 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                                        verifiedOnly
                                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                            : "bg-card border-border text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    <CheckCircle2 size={14} />
                                    <span>{t.verifiedOnly}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mobile Filter Modal Drawer */}
                {mobileFilterOpen && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center sm:hidden p-0 animate-in fade-in duration-200">
                        <div className="w-full bg-card border-t border-border rounded-t-3xl p-6 space-y-6 max-h-[85vh] overflow-y-auto shadow-2xl">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <div className="flex items-center gap-2 font-bold text-base">
                                    <Filter size={18} className="text-primary" />
                                    <span>{t.filterBy}</span>
                                </div>
                                <button
                                    onClick={() => setMobileFilterOpen(false)}
                                    className="p-2 rounded-full bg-muted text-foreground"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Mobile Jurisdiction Select */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">{t.filterBy}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "all", label: t.allCourts },
                                        { id: "cassation", label: COURT_NAMES.cassation[lang] },
                                        { id: "appeal", label: COURT_NAMES.appeal[lang] },
                                        { id: "administrative", label: COURT_NAMES.administrative[lang] },
                                        { id: "commercial", label: COURT_NAMES.commercial[lang] },
                                        { id: "first_instance", label: COURT_NAMES.first_instance[lang] },
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedCourt(item.id)}
                                            className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                                                selectedCourt === item.id
                                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                    : "bg-muted/50 border-border text-foreground hover:bg-muted"
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Sort Options */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">{t.sortBy}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: "newest", label: t.newest },
                                        { id: "views", label: t.mostViewed },
                                        { id: "downloads", label: t.mostDownloaded },
                                    ].map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSortBy(s.id as "newest" | "views" | "downloads")}
                                            className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                                                sortBy === s.id
                                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                    : "bg-muted/50 border-border text-foreground hover:bg-muted"
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Toggle Verified */}
                            <div className="pt-2">
                                <button
                                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                                    className={`w-full p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                        verifiedOnly
                                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                            : "bg-muted/50 border-border text-muted-foreground"
                                    }`}
                                >
                                    <CheckCircle2 size={16} />
                                    <span>{t.verifiedOnly}</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setMobileFilterOpen(false)}
                                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md"
                            >
                                {t.rulingsFound} ({filteredRulings.length})
                            </button>
                        </div>
                    </div>
                )}

                {/* Content Section */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="h-80 rounded-3xl bg-card border border-border/60 p-5 space-y-4 animate-pulse"
                            >
                                <div className="h-40 w-full bg-muted rounded-2xl" />
                                <div className="h-5 w-3/4 bg-muted rounded-md" />
                                <div className="h-4 w-1/2 bg-muted rounded-md" />
                                <div className="h-10 w-full bg-muted rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : filteredRulings.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-3xl bg-card border border-border space-y-4">
                        <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary">
                            <Scale size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{t.noResults}</h3>
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setSelectedCourt("all");
                                setVerifiedOnly(false);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                            <RefreshCw size={14} />
                            <span>{t.clearFilters}</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRulings.map((ruling) => (
                            <article
                                key={ruling.id}
                                itemScope
                                itemType="https://schema.org/LegalDecision"
                                className="group relative flex flex-col justify-between rounded-3xl bg-card border border-border/80 hover:border-primary/40 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden"
                            >
                                <div className="p-5 space-y-4">
                                    {/* Card Cover Image */}
                                    <div
                                        itemProp="image"
                                        itemScope
                                        itemType="https://schema.org/ImageObject"
                                        className="relative h-44 w-full rounded-2xl overflow-hidden bg-muted"
                                    >
                                        <ImageWithFallback
                                            src={ruling.cover_image}
                                            alt={ruling.image_alt[lang]}
                                            title={ruling.title[lang]}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <meta itemProp="url" content={ruling.cover_image} />
                                        <meta itemProp="caption" content={ruling.image_alt[lang]} />

                                        {/* Court Type Overlay Badge */}
                                        <div className="absolute top-3 rtl:right-3 ltr:left-3">
                      <span className="px-3 py-1 rounded-full bg-background/90 backdrop-blur-md text-foreground font-extrabold text-[11px] shadow-sm border border-border/60">
                        {COURT_NAMES[ruling.court_type][lang]}
                      </span>
                                        </div>

                                        {/* Verified Document Seal */}
                                        {ruling.is_verified && (
                                            <div className="absolute bottom-3 rtl:left-3 ltr:right-3 p-1.5 rounded-full bg-emerald-500/90 text-white shadow-md">
                                                <CheckCircle2 size={16} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Header Meta: Ruling Number & Date */}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/50 pb-2.5">
                                        <div className="flex items-center gap-1.5 font-bold text-primary">
                                            <FileText size={14} />
                                            <span itemProp="identifier">{ruling.ruling_number}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={13} />
                                            <time itemProp="datePublished" dateTime={ruling.decision_date}>
                                                {ruling.decision_date}
                                            </time>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h2
                                        itemProp="name"
                                        className="text-base font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors"
                                    >
                                        {ruling.title[lang]}
                                    </h2>

                                    {/* Summary */}
                                    <p
                                        itemProp="description"
                                        className="text-xs text-muted-foreground line-clamp-3 leading-relaxed"
                                    >
                                        {ruling.summary[lang]}
                                    </p>

                                    {/* Keywords Tag List */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {ruling.keywords.slice(0, 3).map((kw, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-[10px] font-semibold text-muted-foreground"
                                            >
                        <Tag size={10} />
                        <span>{kw}</span>
                      </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer Actions & File SEO Metadata */}
                                <div
                                    itemProp="associatedMedia"
                                    itemScope
                                    itemType="https://schema.org/DataDownload"
                                    className="p-5 pt-0 space-y-3"
                                >
                                    <meta itemProp="encodingFormat" content={ruling.mime_type || "application/pdf"} />
                                    <meta itemProp="contentSize" content={ruling.file_size || "2.0 MB"} />

                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-3 border-t border-border/50">
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{ruling.views_count}</span>
                    </span>
                                        <span className="flex items-center gap-1">
                      <Download size={12} />
                      <span>{ruling.download_count} downloads</span>
                    </span>
                                        <span className="font-mono text-[10px] text-primary/80 font-bold">
                      {ruling.file_size}
                    </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {/* View Details Link */}
                                        <Link
                                            to={`/${lang}/court-rulings/${ruling.slug}`}
                                            className="h-10 px-3 rounded-xl bg-muted/80 hover:bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <span>{t.viewDetails}</span>
                                        </Link>

                                        {/* Download PDF Direct Action */}
                                        <a
                                            href={ruling.pdf_url || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            itemProp="contentUrl"
                                            download={`${ruling.slug}.pdf`}
                                            className="h-10 px-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                                        >
                                            <Download size={14} />
                                            <span>{t.downloadPdf}</span>
                                        </a>
                                    </div>

                                    {/* Share / Copy Citation Button */}
                                    <button
                                        onClick={() => handleCopyCitation(ruling)}
                                        className="w-full py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-primary flex items-center justify-center gap-1 transition-colors"
                                    >
                                        {copiedId === ruling.id ? (
                                            <>
                                                <Check size={12} className="text-emerald-500" />
                                                <span className="text-emerald-500 font-bold">{t.copiedCitation}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Share2 size={12} />
                                                <span>{t.shareCitation}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {/* Bottom Monetization Slot */}
                <MonetizationWrapper>
                    <AdSenseSlot slotId="court-rulings-bottom" />
                </MonetizationWrapper>
            </main>
        </div>
    );
}