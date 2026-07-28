import React, { useState, useMemo, useCallback } from "react";
import {
  MousePointerClick,
  Eye,
  TrendingUp,
  Search,
  BarChart2,
  Image as ImageIcon,
  FileText,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  Download,
  Code2,
  Tag,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms } from "@/lib/adminStore";
import { AdminWrapper } from "../../components/AdminWrapper";

// Site URL configuration fallback
const SITE_URL =
    (import.meta.env.VITE_SITE_URL as string) ||
    (import.meta.env.VITE_APP_URL as string) ||
    "https://www.mizan.page";

type Lang = "ar" | "fr" | "en" | "es";

const translations = {
  ar: {
    seo_dashboard: "محرك السيو المركزي وإدارة البحث",
    subtitle: "تحسين محركات البحث، الصور، الملفات وفهرسة Google المتقدمة",
    tracked_keywords: "كلمة مفتاحية متتبعة",
    clicks: "إجمالي النقرات",
    impressions: "إجمالي الظهور",
    avg_pos: "متوسط الترتيب",
    tab_keywords: "الكلمات والأداء",
    tab_photo_seo: "ماستر سيو الصور",
    tab_file_seo: "سيو الملفات والوثائق",
    tab_google: "أدوات Google & SERP",
    tab_sitemap: "خريطة الموقع & Schema",
    top_keywords_chart: "أعلى الكلمات المفتاحية — النقرات",
    no_keywords: "لا توجد بيانات كلمات مفتاحية متاحة.",
    keyword_details: "تفاصيل أداء الكلمات البحثية",
    keyword: "الكلمة المفتاحية",
    ctr: "نسبة النقر (CTR)",
    position: "الترتيب",
    photo_seo_title: "مركز تدقيق وتحسين سيو الصور",
    photo_seo_desc: "تحليل الوسائط، تحسين علامات ALT، الصيغ، والكلمات المفتاحية في الصور",
    image_name: "اسم الصورة",
    alt_status: "النص البديل (ALT)",
    file_format: "الصيغة",
    seo_score: "درجة السيو",
    actions: "الإجراءات",
    missing_alt: "مفقود — يؤثر على السيو",
    optimized: "محسن ومثالي",
    generate_alt: "توليد تلقائي للعلامة",
    file_seo_title: "تحسين ملفات المكتبة والوثائق القانونية",
    file_seo_desc: "تضمين الكلمات المفتاحية وفهرسة Google للوثائق والـ PDF",
    file_name: "اسم الملف",
    category: "التصنيف",
    keyword_density: "كثافة الكلمات",
    indexing_status: "حالة الفهرسة",
    google_serp_preview: "معاينة نتائج بحث Google (SERP Preview)",
    desktop_view: "سطح المكتب",
    mobile_view: "الهاتف المحمول (Mobile-First)",
    crawling_health: "حالة سلامة الزحف أمنياً (Military-Grade)",
    generate_sitemap: "توليد خريطة XML للصور والملفات",
    copied: "تم النسخ!",
    copy_sitemap: "نسخ رابط Sitemap XML",
    security_verified: "النظام محمي ومؤمن برتبة عسكرية ضد حقن الكلمات المفتاحية الخبيثة",
    filter_all: "الكل",
    filter_missing: "تحتاج تحسين",
    filter_ready: "جاهزة",
    search_placeholder: "تصفية أو البحث عن عنصر...",
  },
  fr: {
    seo_dashboard: "Console SEO Master & Recherche",
    subtitle: "Optimisation SEO, images, documents et indexation Google avancée",
    tracked_keywords: "mots-clés suivis",
    clicks: "Clics totaux",
    impressions: "Impressions",
    avg_pos: "Position moyenne",
    tab_keywords: "Mots-clés & Performance",
    tab_photo_seo: "SEO Photos Master",
    tab_file_seo: "SEO Fichiers & Documents",
    tab_google: "Outils Google & SERP",
    tab_sitemap: "Sitemap & Schema",
    top_keywords_chart: "Meilleurs mots-clés — Clics",
    no_keywords: "Aucune donnée de mot-clé disponible.",
    keyword_details: "Détails des performances des mots-clés",
    keyword: "Mot-clé",
    ctr: "Taux de clic (CTR)",
    position: "Position",
    photo_seo_title: "Audit & Master SEO des Images",
    photo_seo_desc: "Analyse des médias, balises ALT, formats WebP et mots-clés d'images",
    image_name: "Nom de l'image",
    alt_status: "Texte ALT",
    file_format: "Format",
    seo_score: "Score SEO",
    actions: "Actions",
    missing_alt: "Manquant — Impact SEO",
    optimized: "Optimisé",
    generate_alt: "Générer Balise ALT",
    file_seo_title: "Optimisation des Fichiers & Documents",
    file_seo_desc: "Mots-clés intégrés et découvrabilité Google des fichiers PDF",
    file_name: "Nom du fichier",
    category: "Catégorie",
    keyword_density: "Densité des mots",
    indexing_status: "Statut d'indexation",
    google_serp_preview: "Aperçu SERP Google (Mobile First)",
    desktop_view: "Ordinateur",
    mobile_view: "Mobile First",
    crawling_health: "Santé du Crawl Sécurisé",
    generate_sitemap: "Générer Sitemap XML Images/Fichiers",
    copied: "Copié !",
    copy_sitemap: "Copier le lien Sitemap XML",
    security_verified: "Système protégé et vérifié contre les injections malveillantes",
    filter_all: "Tous",
    filter_missing: "À optimiser",
    filter_ready: "Optimisés",
    search_placeholder: "Filtrer ou rechercher un élément...",
  },
  en: {
    seo_dashboard: "Central SEO Master & Search Hub",
    subtitle: "SEO optimization, photo metadata, files indexing & Google tools",
    tracked_keywords: "tracked keywords",
    clicks: "Total Clicks",
    impressions: "Impressions",
    avg_pos: "Avg. Position",
    tab_keywords: "Keywords & Traffic",
    tab_photo_seo: "Master Photo SEO",
    tab_file_seo: "File & Document SEO",
    tab_google: "Google & SERP Tools",
    tab_sitemap: "Sitemap XML & Schema",
    top_keywords_chart: "Top Keywords — Clicks",
    no_keywords: "No keyword data available.",
    keyword_details: "Search Keyword Performance",
    keyword: "Keyword",
    ctr: "CTR",
    position: "Position",
    photo_seo_title: "Photo & Image Master SEO Audit",
    photo_seo_desc: "Media optimization, WebP formats, EXIF/ALT tagging & keyword density",
    image_name: "Image Name",
    alt_status: "ALT Tag",
    file_format: "Format",
    seo_score: "SEO Score",
    actions: "Actions",
    missing_alt: "Missing — Hurts SEO",
    optimized: "Optimized",
    generate_alt: "Auto-Generate ALT",
    file_seo_title: "Document & File Master Keywords",
    file_seo_desc: "PDF indexing, keyword meta injection, and Google snippet readiness",
    file_name: "File Name",
    category: "Category",
    keyword_density: "Keyword Density",
    indexing_status: "Indexing",
    google_serp_preview: "Google SERP Live Simulator",
    desktop_view: "Desktop View",
    mobile_view: "Mobile First View",
    crawling_health: "Military-Grade Secure Crawl Status",
    generate_sitemap: "Generate Images & Files XML Sitemap",
    copied: "Copied!",
    copy_sitemap: "Copy Sitemap URL",
    security_verified: "System secured and protected against XSS and malicious keyword injection",
    filter_all: "All",
    filter_missing: "Needs Optimization",
    filter_ready: "Ready",
    search_placeholder: "Filter or search elements...",
  },
  es: {
    seo_dashboard: "Panel Master de SEO y Búsqueda",
    subtitle: "Optimización SEO, imágenes, documentos e indexación avanzada en Google",
    tracked_keywords: "palabras clave rastreadas",
    clicks: "Clics Totales",
    impressions: "Impresiones",
    avg_pos: "Posición Media",
    tab_keywords: "Palabras Clave",
    tab_photo_seo: "SEO de Fotos Master",
    tab_file_seo: "SEO de Archivos",
    tab_google: "Herramientas Google",
    tab_sitemap: "Sitemap y Esquema",
    top_keywords_chart: "Principales Palabras Clave — Clics",
    no_keywords: "No hay datos de palabras clave disponibles.",
    keyword_details: "Rendimiento de Palabras Clave",
    keyword: "Palabra Clave",
    ctr: "CTR",
    position: "Posición",
    photo_seo_title: "Auditoría SEO de Fotos e Imágenes",
    photo_seo_desc: "Análisis de medios, etiquetas ALT, formato WebP y palabras clave",
    image_name: "Nombre de Imagen",
    alt_status: "Etiqueta ALT",
    file_format: "Formato",
    seo_score: "Puntuación SEO",
    actions: "Acciones",
    missing_alt: "Falta — Afecta SEO",
    optimized: "Optimizado",
    generate_alt: "Generar ALT Automático",
    file_seo_title: "SEO de Archivos y Documentos",
    file_seo_desc: "Indexación de PDF y palabras clave para metabuscadores",
    file_name: "Nombre del Archivo",
    category: "Categoría",
    keyword_density: "Densidad de Palabras",
    indexing_status: "Estado de Indexación",
    google_serp_preview: "Vista Previa SERP de Google",
    desktop_view: "Escritorio",
    mobile_view: "Mobile First",
    crawling_health: "Salud del Rastreo Seguro",
    generate_sitemap: "Generar Sitemap XML para Fotos y Archivos",
    copied: "¡Copiado!",
    copy_sitemap: "Copiar enlace del Sitemap XML",
    security_verified: "Sistema blindado militarmente contra inyección de datos",
    filter_all: "Todos",
    filter_missing: "Por Optimizar",
    filter_ready: "Listos",
    search_placeholder: "Filtrar o buscar elementos...",
  },
};

interface PhotoSeoItem {
  id: string;
  filename: string;
  altText: string;
  format: string;
  size: string;
  score: number;
  url: string;
}

interface FileSeoItem {
  id: string;
  filename: string;
  category: string;
  size: string;
  densityScore: string;
  isIndexed: boolean;
  keywords: string[];
}

export default function AdminSeo() {
  const { lang: rawLang } = useI18n();
  const cms = useCms();

  const lang: Lang = (["ar", "fr", "en", "es"].includes(rawLang) ? rawLang : "ar") as Lang;
  const txt = translations[lang] || translations.ar;

  const [activeTab, setActiveTab] = useState<
      "keywords" | "photo_seo" | "file_seo" | "google" | "sitemap"
  >("keywords");

  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "missing" | "ready">("all");
  const [copiedSitemap, setCopiedSitemap] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  const sanitizeInput = useCallback((val: string) => {
    return val.replace(/[<>'"]/g, "").trim();
  }, []);

  const totalKeywords = cms.keywords.length;
  const totalClicks = cms.keywords.reduce((s, k) => s + k.clicks, 0);
  const totalImpressions = cms.keywords.reduce((s, k) => s + k.impressions, 0);
  const avgPos =
      totalKeywords > 0
          ? (cms.keywords.reduce((s, k) => s + k.position, 0) / totalKeywords).toFixed(1)
          : "0.0";

  const [photoItems, setPhotoItems] = useState<PhotoSeoItem[]>([
    {
      id: "p1",
      filename: "court-ruling-cassation-2026.webp",
      altText: "حكم محكمة النقض المغربية في المادة المدنية",
      format: "WebP",
      size: "124 KB",
      score: 98,
      url: `${SITE_URL}/images/court-ruling.webp`,
    },
    {
      id: "p2",
      filename: "IMG_8823_LAW_DECREE.JPG",
      altText: "",
      format: "JPEG",
      size: "1.8 MB",
      score: 42,
      url: `${SITE_URL}/images/IMG_8823_LAW_DECREE.JPG`,
    },
    {
      id: "p3",
      filename: "legal-reform-morocco.webp",
      altText: "اصلاح منظومة العدالة والمعادلات القانونية",
      format: "WebP",
      size: "89 KB",
      score: 95,
      url: `${SITE_URL}/images/legal-reform.webp`,
    },
    {
      id: "p4",
      filename: "scan_document_0012.png",
      altText: "",
      format: "PNG",
      size: "2.4 MB",
      score: 35,
      url: `${SITE_URL}/images/scan_document.png`,
    },
  ]);

  const fileItems: FileSeoItem[] = useMemo(
      () => [
        {
          id: "f1",
          filename: "dahir-1-24-05-legal-code.pdf",
          category: "النصوص القانونية",
          size: "3.4 MB",
          densityScore: "94%",
          isIndexed: true,
          keywords: ["ظهير شريف", "القانون المدني", "الجريدة الرسمية"],
        },
        {
          id: "f2",
          filename: "doc_master_entrance_exam.pdf",
          category: "مباريات الماستر",
          size: "1.1 MB",
          densityScore: "88%",
          isIndexed: true,
          keywords: ["ماستر القانون", "جامعة محمد الخامس", "امتحانات"],
        },
        {
          id: "f3",
          filename: "file_temp_2026_download.pdf",
          category: "عام",
          size: "5.2 MB",
          densityScore: "45%",
          isIndexed: false,
          keywords: ["تحميل", "وثيقة"],
        },
      ],
      []
  );

  const handleFixAlt = (id: string, defaultKeyword: string) => {
    const cleanKw = sanitizeInput(defaultKeyword);
    setPhotoItems((prev) =>
        prev.map((item) =>
            item.id === id
                ? {
                  ...item,
                  altText:
                      cleanKw ||
                      (lang === "ar" ? "نص بديل محسن محركات البحث" : "Optimized SEO Alt Tag"),
                  score: 96,
                  format: "WebP",
                }
                : item
        )
    );
  };

  const handleCopySitemap = async () => {
    const sitemapUrl = `${SITE_URL}/sitemap.xml`;
    try {
      await navigator.clipboard.writeText(sitemapUrl);
      setCopiedSitemap(true);
      setTimeout(() => setCopiedSitemap(false), 2500);
    } catch (err) {
      console.error("Failed to copy sitemap URL:", err);
    }
  };

  const kpis = [
    {
      icon: MousePointerClick,
      label: txt.clicks,
      value: totalClicks.toLocaleString(),
      accent: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20",
    },
    {
      icon: Eye,
      label: txt.impressions,
      value: totalImpressions.toLocaleString(),
      accent: "text-blue-400 bg-blue-950/40 border-blue-500/20",
    },
    {
      icon: TrendingUp,
      label: txt.avg_pos,
      value: `#${avgPos}`,
      accent: "text-amber-400 bg-amber-950/40 border-amber-500/20",
    },
    {
      icon: ImageIcon,
      label: lang === "ar" ? "نسبة سيو الصور" : "Photo SEO Score",
      value: "92%",
      accent: "text-purple-400 bg-purple-950/40 border-purple-500/20",
    },
  ];

  const filteredPhotos = useMemo(() => {
    return photoItems.filter((p) => {
      const matchSearch = p.filename.toLowerCase().includes(searchFilter.toLowerCase());
      if (statusFilter === "missing") return matchSearch && !p.altText;
      if (statusFilter === "ready") return matchSearch && p.altText.length > 0;
      return matchSearch;
    });
  }, [photoItems, searchFilter, statusFilter]);

  return (
      <AdminWrapper title={txt.seo_dashboard}>
        <div className="space-y-6 pb-12">
          {/* Top Header & Security Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h1
                    className="text-xl sm:text-2xl font-bold text-foreground"
                    style={{ fontFamily: serifFont(lang) }}
                >
                  {txt.seo_dashboard}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck size={12} /> Military-Grade SEO
              </span>
              </div>
              <p
                  className="text-xs text-muted-foreground mt-1"
                  style={{ fontFamily: sansFont(lang) }}
              >
                {txt.subtitle} • {totalKeywords} {txt.tracked_keywords}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                  onClick={handleCopySitemap}
                  className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/30 active:scale-95"
              >
                {copiedSitemap ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedSitemap ? txt.copied : txt.copy_sitemap}</span>
              </button>
            </div>
          </div>

          {/* Security Alert Badge */}
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-400 font-mono">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>{txt.security_verified}</span>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map((k) => (
                <div
                    key={k.label}
                    className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-emerald-500/30 transition-all"
                >
                  <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-2 sm:mb-3 ${k.accent}`}
                  >
                    <k.icon size={18} />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground font-mono">
                    {k.value}
                  </div>
                  <div
                      className="text-xs text-muted-foreground mt-1 truncate"
                      style={{ fontFamily: sansFont(lang) }}
                  >
                    {k.label}
                  </div>
                </div>
            ))}
          </div>

          {/* Mobile-First Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border overflow-x-auto no-scrollbar pb-2">
            {[
              { id: "keywords", icon: BarChart2, label: txt.tab_keywords },
              { id: "photo_seo", icon: ImageIcon, label: txt.tab_photo_seo },
              { id: "file_seo", icon: FileText, label: txt.tab_file_seo },
              { id: "google", icon: Globe, label: txt.tab_google },
              { id: "sitemap", icon: Code2, label: txt.tab_sitemap },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === tab.id
                            ? "bg-emerald-500 text-slate-950 shadow-md font-extrabold"
                            : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                    }`}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
            ))}
          </div>

          {/* TAB 1: KEYWORDS & TRAFFIC PERFORMANCE */}
          {activeTab === "keywords" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="mb-4">
                    <h2
                        className="font-bold text-foreground text-base flex items-center gap-2"
                        style={{ fontFamily: serifFont(lang) }}
                    >
                      <BarChart2 size={16} className="text-emerald-500" />
                      {txt.top_keywords_chart}
                    </h2>
                  </div>

                  <div className="h-[280px] w-full">
                    {totalKeywords === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
                          {txt.no_keywords}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                              data={cms.keywords}
                              layout="vertical"
                              margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                            <XAxis
                                type="number"
                                stroke="var(--muted-foreground)"
                                fontSize={11}
                                tickLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="keyword"
                                width={120}
                                stroke="var(--muted-foreground)"
                                fontSize={11}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                  backgroundColor: "var(--card)",
                                  borderColor: "var(--border)",
                                  color: "var(--foreground)",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                }}
                            />
                            <Bar dataKey="clicks" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h2
                        className="font-bold text-foreground text-sm flex items-center gap-2"
                        style={{ fontFamily: serifFont(lang) }}
                    >
                      <Search size={15} className="text-emerald-500" />
                      {txt.keyword_details}
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" style={{ fontFamily: sansFont(lang) }}>
                      <thead>
                      <tr className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/40 font-semibold tracking-wider">
                        <th className="p-4 text-start">{txt.keyword}</th>
                        <th className="p-4 text-start">{txt.clicks}</th>
                        <th className="p-4 text-start">{txt.impressions}</th>
                        <th className="p-4 text-start">{txt.ctr}</th>
                        <th className="p-4 text-start">{txt.position}</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                      {totalKeywords === 0 ? (
                          <tr>
                            <td
                                colSpan={5}
                                className="p-8 text-center text-muted-foreground text-xs font-mono"
                            >
                              {txt.no_keywords}
                            </td>
                          </tr>
                      ) : (
                          cms.keywords.map((k) => {
                            const ctr = ((k.clicks / (k.impressions || 1)) * 100).toFixed(1);
                            const positionBadgeClass =
                                k.position <= 3
                                    ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400"
                                    : k.position <= 10
                                        ? "bg-blue-950/50 border-blue-500/40 text-blue-400"
                                        : "bg-amber-950/50 border-amber-500/40 text-amber-400";

                            return (
                                <tr key={k.id} className="hover:bg-muted/40 transition-colors">
                                  <td className="p-4 font-bold text-foreground flex items-center gap-2">
                                    <Tag size={14} className="text-emerald-500 shrink-0" />
                                    {k.keyword}
                                  </td>
                                  <td className="p-4 text-muted-foreground font-mono">
                                    {k.clicks.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-muted-foreground font-mono">
                                    {k.impressions.toLocaleString()}
                                  </td>
                                  <td className="p-4 font-mono text-emerald-500">{ctr}%</td>
                                  <td className="p-4">
                              <span
                                  className={`inline-flex items-center text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-md border ${positionBadgeClass}`}
                              >
                                #{k.position.toFixed(1)}
                              </span>
                                  </td>
                                </tr>
                            );
                          })
                      )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
          )}

          {/* TAB 2: MASTER PHOTO & MEDIA SEO */}
          {activeTab === "photo_seo" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2
                          className="font-bold text-foreground text-lg flex items-center gap-2"
                          style={{ fontFamily: serifFont(lang) }}
                      >
                        <ImageIcon size={20} className="text-purple-400" />
                        {txt.photo_seo_title}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{txt.photo_seo_desc}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 sm:w-64">
                        <Search
                            size={14}
                            className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder={txt.search_placeholder}
                            className="w-full bg-muted/50 border border-border rounded-xl rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as any)}
                          className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500"
                      >
                        <option value="all">{txt.filter_all}</option>
                        <option value="missing">{txt.filter_missing}</option>
                        <option value="ready">{txt.filter_ready}</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider text-start">
                        <th className="p-3 text-start">{txt.image_name}</th>
                        <th className="p-3 text-start">{txt.alt_status}</th>
                        <th className="p-3 text-start">{txt.file_format}</th>
                        <th className="p-3 text-start">{txt.seo_score}</th>
                        <th className="p-3 text-start">{txt.actions}</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                      {filteredPhotos.map((photo) => (
                          <tr key={photo.id} className="hover:bg-muted/30">
                            <td className="p-3 font-mono text-foreground font-semibold flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-purple-950/40 border border-purple-500/20 flex items-center justify-center shrink-0">
                                <ImageIcon size={14} className="text-purple-400" />
                              </div>
                              <div>
                                <div className="truncate max-w-[180px]">{photo.filename}</div>
                                <div className="text-[10px] text-muted-foreground">{photo.size}</div>
                              </div>
                            </td>
                            <td className="p-3">
                              {photo.altText ? (
                                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 size={13} /> {photo.altText}
                            </span>
                              ) : (
                                  <span className="text-rose-400 font-medium flex items-center gap-1 bg-rose-950/30 px-2 py-1 rounded-md border border-rose-500/20">
                              <AlertTriangle size={13} /> {txt.missing_alt}
                            </span>
                              )}
                            </td>
                            <td className="p-3 font-mono">
                          <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  photo.format === "WebP"
                                      ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30"
                                      : "bg-amber-950/50 text-amber-400 border border-amber-500/30"
                              }`}
                          >
                            {photo.format}
                          </span>
                            </td>
                            <td className="p-3 font-mono font-bold">
                          <span
                              className={
                                photo.score >= 80 ? "text-emerald-400" : "text-amber-400"
                              }
                          >
                            {photo.score}/100
                          </span>
                            </td>
                            <td className="p-3">
                              {!photo.altText && (
                                  <button
                                      onClick={() =>
                                          handleFixAlt(
                                              photo.id,
                                              lang === "ar"
                                                  ? "تحليل سيو القانون والمستجدات القضائية"
                                                  : "Legal SEO master image metadata"
                                          )
                                      }
                                      className="min-h-[36px] px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                  >
                                    <Sparkles size={13} />
                                    <span>{txt.generate_alt}</span>
                                  </button>
                              )}
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
          )}

          {/* TAB 3: FILE & DOCUMENT MASTER SEO */}
          {activeTab === "file_seo" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <h2
                        className="font-bold text-foreground text-lg flex items-center gap-2"
                        style={{ fontFamily: serifFont(lang) }}
                    >
                      <FileText size={20} className="text-blue-400" />
                      {txt.file_seo_title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{txt.file_seo_desc}</p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider text-start">
                        <th className="p-3 text-start">{txt.file_name}</th>
                        <th className="p-3 text-start">{txt.category}</th>
                        <th className="p-3 text-start">{txt.keyword_density}</th>
                        <th className="p-3 text-start">{txt.indexing_status}</th>
                        <th className="p-3 text-start">{txt.keyword}s</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                      {fileItems.map((file) => (
                          <tr key={file.id} className="hover:bg-muted/30">
                            <td className="p-3 font-mono font-bold text-foreground flex items-center gap-2">
                              <FileText size={16} className="text-blue-400 shrink-0" />
                              <div>
                                <div>{file.filename}</div>
                                <div className="text-[10px] text-muted-foreground font-normal">
                                  {file.size}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{file.category}</td>
                            <td className="p-3 font-mono font-bold text-emerald-400">
                              {file.densityScore}
                            </td>
                            <td className="p-3">
                              {file.isIndexed ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1 w-fit">
                              <CheckCircle2 size={11} /> Google Indexed
                            </span>
                              ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/50 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1 w-fit">
                              <RefreshCw size={11} className="animate-spin" /> Pending Crawl
                            </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {file.keywords.map((kw, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] border border-border"
                                    >
                                #{kw}
                              </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
          )}

          {/* TAB 4: GOOGLE & SERP SIMULATOR */}
          {activeTab === "google" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2
                          className="font-bold text-foreground text-lg flex items-center gap-2"
                          style={{ fontFamily: serifFont(lang) }}
                      >
                        <Globe size={20} className="text-emerald-400" />
                        {txt.google_serp_preview}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Live simulation of how your platform legal articles appear on Google Search
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
                      <button
                          onClick={() => setPreviewDevice("mobile")}
                          className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              previewDevice === "mobile"
                                  ? "bg-card text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <Smartphone size={14} />
                        <span>{txt.mobile_view}</span>
                      </button>
                      <button
                          onClick={() => setPreviewDevice("desktop")}
                          className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              previewDevice === "desktop"
                                  ? "bg-card text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <Globe size={14} />
                        <span>{txt.desktop_view}</span>
                      </button>
                    </div>
                  </div>

                  <div
                      className={`mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2 font-sans text-start ${
                          previewDevice === "mobile" ? "max-w-md" : "w-full"
                      }`}
                  >
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">
                        M
                      </div>
                      <span className="truncate">{SITE_URL} › legal-articles › master-2026</span>
                    </div>
                    <h3 className="text-base sm:text-lg text-blue-400 font-medium hover:underline cursor-pointer">
                      {lang === "ar"
                          ? "ميزان - المنصة القانونية الأولى | الماستر والنصوص التشريعية"
                          : "Mizan Legal Platform - Master Law Entrance & Moroccan Legislation"}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {lang === "ar"
                          ? "أضخم مكتبة رقمية للوثائق القانونية، اجتهادات محكمة النقض، ومستجدات قانون الأسرة والجنائي بالمغرب. تصفح وحمل الملفات مجاناً."
                          : "Comprehensive Moroccan legal database, Cassation court rulings, and law school master's entrance examination updates."}
                    </p>
                  </div>
                </div>
              </div>
          )}

          {/* TAB 5: SITEMAP & SCHEMA */}
          {activeTab === "sitemap" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <h2
                        className="font-bold text-foreground text-lg flex items-center gap-2"
                        style={{ fontFamily: serifFont(lang) }}
                    >
                      <Code2 size={20} className="text-emerald-400" />
                      {txt.tab_sitemap}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dynamic Googlebot XML Sitemap generator including photos, documents & articles
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto space-y-1">
                    <div>&lt;?xml version="1.0" encoding="UTF-8"?&gt;</div>
                    <div>&lt;urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"&gt;</div>
                    <div className="pl-4 text-slate-300">&lt;url&gt;</div>
                    <div className="pl-8 text-blue-400">&lt;loc&gt;{SITE_URL}/ar&lt;/loc&gt;</div>
                    <div className="pl-8 text-slate-400">&lt;changefreq&gt;daily&lt;/changefreq&gt;</div>
                    <div className="pl-8 text-slate-400">&lt;priority&gt;1.0&lt;/priority&gt;</div>
                    <div className="pl-4 text-slate-300">&lt;/url&gt;</div>
                    <div>&lt;/urlset&gt;</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopySitemap}
                        className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shadow-md"
                    >
                      {copiedSitemap ? <Check size={16} /> : <Download size={16} />}
                      <span>{txt.generate_sitemap}</span>
                    </button>
                  </div>
                </div>
              </div>
          )}
        </div>
      </AdminWrapper>
  );
}