import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Search, Filter } from "lucide-react";
import { DocumentCard, LegalDocument } from "../components/DocumentCard";

// 1. تحديث الفئات لتعتمد على معرفات (IDs) إنجليزية وتوفر ترجمات لجميع اللغات
const CATEGORIES: Record<string, any>[] = [
  { id: "all", ar: "الكل", en: "All", fr: "Tout" },
  { id: "civil", ar: "القانون المدني", en: "Civil Law", fr: "Droit Civil" },
  { id: "criminal", ar: "القانون الجنائي", en: "Criminal Law", fr: "Droit Pénal" },
  { id: "family", ar: "قانون الأسرة", en: "Family Law", fr: "Droit de la Famille" },
  { id: "commercial", ar: "القانون التجاري", en: "Commercial Law", fr: "Droit Commercial" },
  { id: "administrative", ar: "القانون الإداري", en: "Administrative Law", fr: "Droit Administratif" },
  { id: "constitutional", ar: "القانون الدستوري", en: "Constitutional Law", fr: "Droit Constitutionnel" },
];

const DOC_TYPES: Record<string, any>[] = [
  { id: "all", ar: "جميع أنواع الوثائق", en: "All Document Types", fr: "Tous les types" },
  { id: "legal_texts", ar: "النصوص القانونية", en: "Legal Texts", fr: "Textes Juridiques" },
  { id: "decrees", ar: "المراسيم والقرارات", en: "Ministerial Decrees", fr: "Décrets et Arrêtés" },
  { id: "rulings", ar: "قرارات محكمة النقض", en: "Cassation Rulings", fr: "Arrêts de Cassation" },
  { id: "official_journal", ar: "الجريدة الرسمية", en: "Official Journals", fr: "Journal Officiel" },
];

// 2. تحديث قاعدة البيانات لتشمل كائن "translations" لكل لغة
const DOCS_DB = [
  {
    id: "13234",
    // البيانات الافتراضية (عربي)
    title: "قانون الالتزامات والعقود المغربي - النسخة المحينة 2026",
    description: "النص الكامل لقانون الالتزامات والعقود المكون من الكتابين الأول والثاني مع كافة التعديلات الأخيرة المعتمدة.",
    category: "civil", // 👈 نستخدم الـ ID بدلاً من النص العربي
    docType: "legal_texts",
    fileType: "PDF",
    fileSize: "1,678 KB",
    pages: 342,
    documentNumber: "رقم 1.11.140",
    publishDate: "2026-01-10",
    modifiedDate: "7/23/2026",
    authorOrPublisher: "الأمانة العامة للحكومة",
    downloadUrl: "#",
    tags: ["التزامات", "عقود", "قانون_مدني"],
    isVerified: true,
    // 👈 الترجمات للغات الأخرى
    translations: {
      en: {
        title: "Moroccan Code of Obligations and Contracts - 2026 Update",
        description: "Full text of the Code of Obligations and Contracts comprising the first and second books with all recently approved amendments.",
        tags: ["obligations", "contracts", "civil_law"],
        documentNumber: "No. 1.11.140",
        authorOrPublisher: "General Secretariat of the Government",
      },
      fr: {
        title: "Code des Obligations et des Contrats - Version 2026",
        description: "Texte complet du DOC avec tous les amendements récents.",
        tags: ["obligations", "contrats", "droit_civil"],
        documentNumber: "N° 1.11.140",
        authorOrPublisher: "Secrétariat Général du Gouvernement",
      }
    }
  },
  {
    id: "98765",
    title: "Synthèse - ملخص الوجيز في القانون الجنائي الخاص",
    description: "ملخص شامل ومكثف لدروس القانون الجنائي الخاص موجه لطلبة السداسيات المتقدمة والباحثين.",
    category: "criminal",
    docType: "official_journal",
    fileType: "PDF",
    fileSize: "1,138 KB",
    pages: 45,
    documentNumber: "مطبوع جامعي",
    publishDate: "2026-05-14",
    modifiedDate: "7/23/2026",
    authorOrPublisher: "جامعة محمد الخامس",
    downloadUrl: "#",
    tags: ["جنائي_خاص", "ملخصات", "سداسيات"],
    isVerified: true,
    translations: {
      en: {
        title: "Synthesis - Brief in Special Criminal Law",
        description: "Comprehensive summary of Special Criminal Law lessons for advanced semester students and researchers.",
        tags: ["special_criminal", "summaries", "semesters"],
        documentNumber: "University Print",
        authorOrPublisher: "Mohammed V University",
      },
      fr: {
        title: "Synthèse - Droit Pénal Spécial",
        description: "Résumé complet du droit pénal spécial pour les étudiants.",
        tags: ["pénal_spécial", "résumés", "semestres"],
        documentNumber: "Impression Universitaire",
        authorOrPublisher: "Université Mohammed V",
      }
    }
  }
];

export default function Library() {
  const { lang: rawLang = "ar" } = useParams();
  const lang = ["ar", "fr", "en", "es"].includes(rawLang) ? rawLang : "ar";
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDocType, setSelectedDocType] = useState("all");

  // 3. دالة سحرية تقوم بتحويل الوثائق للغة المطلوبة قبل عرضها!
  const getLocalizedDocuments = (): LegalDocument[] => {
    return DOCS_DB.map((doc) => {
      const t = (doc.translations as any)?.[lang] || {};
      
      // استخراج الاسم المترجم للتخصص ونوع الوثيقة
      const categoryLabel = CATEGORIES.find(c => c.id === doc.category)?.[lang] || doc.category;
      const docTypeLabel = DOC_TYPES.find(d => d.id === doc.docType)?.[lang] || doc.docType;

      return {
        id: doc.id,
        title: t.title || doc.title,
        description: t.description || doc.description,
        category: categoryLabel,
        docType: docTypeLabel,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        pages: doc.pages,
        documentNumber: t.documentNumber || doc.documentNumber,
        publishDate: doc.publishDate,
        modifiedDate: doc.modifiedDate,
        authorOrPublisher: t.authorOrPublisher || doc.authorOrPublisher,
        downloadUrl: doc.downloadUrl,
        viewUrl: `/${lang}/library/${doc.id}`, // توليد الرابط الديناميكي
        tags: t.tags || doc.tags,
        isVerified: doc.isVerified,
      };
    });
  };

  const localizedDocs = getLocalizedDocuments();

  // دوال حساب الأرقام (تستخدم البيانات الأصلية بمعرفاتها)
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === "all") return DOCS_DB.length;
    return DOCS_DB.filter((doc) => doc.category === categoryId).length;
  };

  const getDocTypeCount = (typeId: string) => {
    if (typeId === "all") return DOCS_DB.length;
    return DOCS_DB.filter((doc) => doc.docType === typeId).length;
  };

  // فلترة الوثائق بعد ترجمتها
  const filteredDocs = localizedDocs.filter((doc) => {
    const docOriginal = DOCS_DB.find(d => d.id === doc.id);
    
    // البحث يعتمد على النصوص المترجمة الحالية ليتمكن المستخدم من البحث بلغته!
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    // الفلترة تعتمد على المعرف (ID) الأصلي لضمان الدقة
    const matchesCategory = selectedCategory === "all" || docOriginal?.category === selectedCategory;
    const matchesDocType = selectedDocType === "all" || docOriginal?.docType === selectedDocType;

    return matchesSearch && matchesCategory && matchesDocType;
  });

  // نصوص الواجهة
  const uiTexts = {
    title: { ar: "المكتبة الرقمية القانونية", en: "Digital Legal Library", fr: "Bibliothèque Juridique Numérique" },
    subtitle: { ar: "دليل المراجع والكتب القانونية الموثوقة.", en: "Catalog of verified legal references and documents.", fr: "Catalogue de références et documents juridiques vérifiés." },
    search: { ar: "ابحث باسم الملف أو الكلمة المفتاحية...", en: "Search file or keyword...", fr: "Rechercher un fichier ou mot-clé..." },
    empty: { ar: "لا توجد ملفات تطابق الفلاتر المحددة.", en: "No documents match your filters.", fr: "Aucun document ne correspond à vos filtres." }
  };

  return (
    <main dir={dir} className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">
          {(uiTexts.title as any)[lang] || uiTexts.title.ar}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
          {(uiTexts.subtitle as any)[lang] || uiTexts.subtitle.ar}
        </p>
      </header>

      <div className="space-y-4">
        {/* شريط البحث والفلترة */}
        <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-3 rounded-2xl border border-border shadow-xs">
          
          <div className="relative w-full sm:flex-1">
            <Search size={16} className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={(uiTexts.search as any)[lang] || uiTexts.search.ar}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rtl:pr-9 ltr:pl-9 pl-3 pr-3 py-2.5 text-xs bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Filter size={14} className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full rtl:pr-9 ltr:pl-9 pl-3 pr-8 py-2.5 text-xs font-medium bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              {DOC_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type[lang] || type.ar} ({getDocTypeCount(type.id)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* أزرار التخصصات */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 snap-start flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-200 cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-blue-600 border-blue-600 text-white shadow-md"
                  : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{cat[lang] || cat.ar}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                selectedCategory === cat.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {getCategoryCount(cat.id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* قائمة الوثائق */}
      <section className="space-y-3">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} lang={lang} />
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {(uiTexts.empty as any)[lang] || uiTexts.empty.ar}
          </div>
        )}
      </section>
    </main>
  );
}