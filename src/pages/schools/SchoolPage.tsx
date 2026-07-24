import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Search, FileText } from "lucide-react";
import { useI18n, sansFont, serifFont, Lang } from "../../lib/i18n";
import { LAW_SCHOOLS, getSchoolBySlug, getSchoolsByCity } from "../../data/lawSchools";
import SchoolHeader from "../../components/common/SchoolHeader";
import { SEOHead } from "../../components/seo/SEOHead";
import { DocumentCard } from "../../components/DocumentCard";

export default function SchoolPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, dir } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");

  // البحث عن الجامعة حسب الـ Slug أو اسم المدينة
  const school = useMemo(() => {
    if (!slug) return LAW_SCHOOLS[0];
    
    // 1. المطابقة التامة للـ Slug
    const exact = getSchoolBySlug(slug);
    if (exact) return exact;

    // 2. المطابقة الجزئية
    const partial = LAW_SCHOOLS.find((s) => s.slug.includes(slug.toLowerCase()));
    if (partial) return partial;

    // 3. المطابقة حسب المدينة
    const cityMatch = getSchoolsByCity(slug)[0];
    if (cityMatch) return cityMatch;

    return LAW_SCHOOLS[0];
  }, [slug]);

  const currentLang = (lang as Lang) || "ar";
  const schoolName = school.name[currentLang] || school.name.ar;
  const schoolDesc = school.description[currentLang] || school.description.ar;

  // نماذج المستندات المتوافقة مع نوع LegalDocument
  const mockDocuments = [
    {
      id: "1",
      title: currentLang === "ar" ? "قانون الالتزامات والعقود المغربي - النسخة المحينة 2026" : "Code des Obligations et Contrats 2026",
      category: currentLang === "ar" ? "قانون مدني" : "Droit Civil",
      university: schoolName,
      publishDate: "2026-07-23",
      modifiedDate: "2026-07-23",
      authorOrPublisher: currentLang === "ar" ? "وزارة العدل" : "Ministère de la Justice",
      downloadUrl: "#",
      viewUrl: "#",
      fileSize: "1,678 KB",
      fileType: "PDF" as const, // تحديث النوع إلى قيم صريحة مقبولة
      verified: true,
      downloads: 1420,
      description: currentLang === "ar" ? "النص الكامل لقانون الالتزامات والعقود المكون من الكتابين الأول والثاني مع كافة التعديلات الأخيرة." : "Texte intégral du code des obligations et contrats.",
      tags: ["#التزامات", "#عقود", "#قانون_مدني"],
    },
    {
      id: "2",
      title: currentLang === "ar" ? "Synthèse - ملخص الوجيز في القانون الجنائي الخاص" : "Synthèse - Droit Pénal Spécial",
      category: currentLang === "ar" ? "ملخصات" : "Résumés",
      university: schoolName,
      publishDate: "2026-07-23",
      modifiedDate: "2026-07-23",
      authorOrPublisher: currentLang === "ar" ? "كلية الحقوق" : "Faculté de Droit",
      downloadUrl: "#",
      viewUrl: "#",
      fileSize: "1,138 KB",
      fileType: "PDF" as const, // تحديث النوع إلى قيم صريحة مقبولة
      verified: true,
      downloads: 980,
      description: currentLang === "ar" ? "ملخص شامل ومكثف لدروس القانون الجنائي الخاص موجه لطلبة السداسيات المتقدمة والباحثين." : "Résumé complet pour les étudiants en droit pénal.",
      tags: ["#جنائي_خاص", "#ملخصات", "#سداسيات"],
    },
  ];

  const filteredDocuments = mockDocuments.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <SEOHead
        title={`${schoolName} | ميزان الرقمية`}
        description={schoolDesc}
        canonical={`https://mizandigital.ma/${currentLang}/schools/${school.slug}`}
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* قسم الهيدر الرئيسي للجامعة */}
        <SchoolHeader
          school={school}
          documentCount={filteredDocuments.length}
          lang={currentLang}
        />

        {/* شريط البحث عن المراجع داخل هذه الجامعة */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                dir === "rtl" ? "right-3" : "left-3"
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                currentLang === "ar"
                  ? "ابحث باسم الملف أو الدرس..."
                  : "Rechercher un document..."
              }
              className={`w-full py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary ${
                dir === "rtl" ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"
              }`}
              style={{ fontFamily: sansFont(currentLang) }}
            />
          </div>
        </div>

        {/* قائمة الدروس والمراجع */}
        <div className="space-y-4">
          <h2
            className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"
            style={{ fontFamily: serifFont(currentLang) }}
          >
            <FileText size={20} className="text-primary" />
            {currentLang === "ar" ? "المراجع والدروس المتاحة" : "Documents & Cours disponibles"}
          </h2>

          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} lang={currentLang} />
            ))
          ) : (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <p className="text-slate-500 text-sm">
                {currentLang === "ar"
                  ? "لم يتم العثور على ملفات تطابق بحثك."
                  : "Aucun document trouvé."}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}