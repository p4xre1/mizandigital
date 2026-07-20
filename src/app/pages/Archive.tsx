import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { GraduationCap, Filter, ArrowRight, Download, BookOpen } from "lucide-react";
import { getArticles, type Article } from "../lib/supabase";
import { useLocalizedPath, useI18n, serifFont, sansFont } from "../lib/i18n";

const UNIVERSITIES = [
  { slug: "all", labelAr: "كل الجامعات", labelEn: "All Universities" },
  { slug: "um5", labelAr: "محمد الخامس — الرباط", labelEn: "Mohammed V — Rabat" },
  { slug: "uh2", labelAr: "الحسن الثاني — الدار البيضاء", labelEn: "Hassan II — Casablanca" },
  { slug: "uqa", labelAr: "القاضي عياض — مراكش", labelEn: "Cadi Ayyad — Marrakech" },
  { slug: "umo", labelAr: "محمد الأول — وجدة", labelEn: "Mohammed I — Oujda" },
  { slug: "usa", labelAr: "ابن طفيل — القنيطرة", labelEn: "Ibn Tofail — Kenitra" },
  { slug: "uab", labelAr: "عبد المالك السعدي — تطوان", labelEn: "Abdelmalek Essaâdi — Tetouan" },
];

const SEMESTERS = [
  { slug: "all", labelAr: "كل الفصول", labelEn: "All Semesters" },
  { slug: "s1", labelAr: "الفصل الأول S1", labelEn: "Semester 1 (S1)" },
  { slug: "s2", labelAr: "الفصل الثاني S2", labelEn: "Semester 2 (S2)" },
  { slug: "s3", labelAr: "الفصل الثالث S3", labelEn: "Semester 3 (S3)" },
  { slug: "s4", labelAr: "الفصل الرابع S4", labelEn: "Semester 4 (S4)" },
  { slug: "s5", labelAr: "الفصل الخامس S5", labelEn: "Semester 5 (S5)" },
  { slug: "s6", labelAr: "الفصل السادس S6", labelEn: "Semester 6 (S6)" },
];

const MOCK: Article[] = [
  { id: "1", title: "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026", slug: "family-law-s1-2026", excerpt: "نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة.", category: "قانون الأسرة", university: "محمد الخامس — الرباط", semester: "s1", year: 2026, views: 4200, is_featured: true, created_at: "2026-07-13T10:00:00Z", updated_at: "2026-07-13T10:00:00Z", pdf_url: "#" },
  { id: "2", title: "امتحان القانون التجاري S3 — جامعة الحسن الثاني 2026", slug: "commercial-s3-uh2-2026", excerpt: "أسئلة وإجابات نموذجية لامتحان القانون التجاري — الفصل الثالث.", category: "القانون التجاري", university: "الحسن الثاني — الدار البيضاء", semester: "s3", year: 2026, views: 2100, is_featured: false, created_at: "2026-07-11T10:00:00Z", updated_at: "2026-07-11T10:00:00Z", pdf_url: "#" },
  { id: "3", title: "ملخص القانون الدستوري S2 — جامعة القاضي عياض 2025", slug: "constitutional-s2-uqa-2025", excerpt: "ملخص شامل لمقرر القانون الدستوري — الفصل الثاني، جامعة مراكش.", category: "القانون الدستوري", university: "القاضي عياض — مراكش", semester: "s2", year: 2025, views: 1800, is_featured: false, created_at: "2026-07-09T10:00:00Z", updated_at: "2026-07-09T10:00:00Z" },
  { id: "4", title: "أسئلة القانون الجنائي S4 — جامعة محمد الأول 2025", slug: "criminal-s4-umo-2025", excerpt: "نماذج امتحانات القانون الجنائي العام والخاص — الفصل الرابع.", category: "القانون الجنائي", university: "محمد الأول — وجدة", semester: "s4", year: 2025, views: 1400, is_featured: false, created_at: "2026-07-07T10:00:00Z", updated_at: "2026-07-07T10:00:00Z", pdf_url: "#" },
];

export default function Archive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const localizedPath = useLocalizedPath();
  const { lang, dir, t } = useI18n();
  const [articles, setArticles] = useState<Article[]>(MOCK);
  const [loading, setLoading] = useState(false);

  const university = searchParams.get("university") || "all";
  const semester = searchParams.get("semester") || "all";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key); else next.set(key, value);
    setSearchParams(next);
  };

  useEffect(() => {
    setLoading(true);
    getArticles({
      university: university !== "all" ? university : undefined,
      semester: semester !== "all" ? semester : undefined,
      limit: 20,
    })
      .then(data => { if (data?.length) setArticles(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [university, semester]);

  const filtered = articles.filter(a => {
    const univObj = UNIVERSITIES.find(u => u.slug === university);
    const univKeyword = univObj ? univObj.labelAr.split("—")[0].trim() : "";
    
    return (
      (university === "all" || (a.university && a.university.includes(univKeyword))) &&
      (semester === "all" || a.semester === semester)
    );
  });

  const arrowFlip = dir === "rtl" ? "rotate-180" : "";

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" dir={dir}>
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 rounded-xl flex items-center justify-center shrink-0">
          <GraduationCap size={20} className="text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>
            {lang === "ar" ? "الأرشيف الجامعي" : "Academic Archive"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300" style={{ fontFamily: sansFont(lang) }}>
            {lang === "ar" ? "نماذج امتحانات، ملخصات، وأطروحات من جامعات مغربية" : "Exams, summaries, and legal theses from Moroccan universities"}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={16} className="text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: sansFont(lang) }}>
            {lang === "ar" ? "تصفية:" : "Filter:"}
          </span>
        </div>
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <div className="flex-1">
            <label htmlFor="university-filter" className="text-xs text-slate-500 dark:text-slate-400 mb-1 block" style={{ fontFamily: sansFont(lang) }}>
              {lang === "ar" ? "الجامعة" : "University"}
            </label>
            <select
              id="university-filter"
              value={university}
              onChange={e => setFilter("university", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px]"
              style={{ fontFamily: sansFont(lang) }}
              aria-label={lang === "ar" ? "اختر الجامعة" : "Select University"}
            >
              {UNIVERSITIES.map(u => (
                <option key={u.slug} value={u.slug}>
                  {lang === "ar" ? u.labelAr : u.labelEn}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="semester-filter" className="text-xs text-slate-500 dark:text-slate-400 mb-1 block" style={{ fontFamily: sansFont(lang) }}>
              {lang === "ar" ? "الفصل الدراسي" : "Semester"}
            </label>
            <select
              id="semester-filter"
              value={semester}
              onChange={e => setFilter("semester", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px]"
              style={{ fontFamily: sansFont(lang) }}
              aria-label={lang === "ar" ? "اختر الفصل الدراسي" : "Select Semester"}
            >
              {SEMESTERS.map(s => (
                <option key={s.slug} value={s.slug}>
                  {lang === "ar" ? s.labelAr : s.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Semester quick-tabs */}
      <nav aria-label={lang === "ar" ? "تصفية السداسيات" : "Semester Filters"} className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {SEMESTERS.map(s => (
          <button
            key={s.slug}
            onClick={() => setFilter("semester", s.slug)}
            className={`px-4 py-2 text-xs md:text-sm rounded-full border whitespace-nowrap transition-colors min-h-[38px] ${
              semester === s.slug
                ? "bg-primary text-primary-foreground border-primary font-semibold"
                : "border-border text-slate-600 dark:text-slate-300 hover:border-primary/50 hover:text-primary"
            }`}
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" ? s.labelAr : s.labelEn}
          </button>
        ))}
      </nav>

      {/* Results */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl p-8" style={{ fontFamily: sansFont(lang) }}>
          <BookOpen className="mx-auto h-10 w-10 text-slate-400 mb-3" aria-hidden="true" />
          <p className="text-base font-semibold text-foreground mb-1">
            {lang === "ar" ? "لا توجد نتائج لهذه الفلترة" : "No results found for this filter"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === "ar" ? "جرّب تغيير معايير البحث أو تصفح الأرشيف الكامل." : "Try changing your search criteria or browse all documents."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(a => (
            <article
              key={a.id}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                    {a.category}
                  </span>
                  {a.semester && (
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 border border-border px-2 py-0.5 rounded-full">
                      {a.semester?.toUpperCase()}
                    </span>
                  )}
                  {a.year && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {a.year}
                    </span>
                  )}
                </div>

                <Link to={localizedPath(`/article/${a.slug}`)}>
                  <h2 className="text-base font-bold text-foreground hover:text-primary transition-colors mb-1.5" style={{ fontFamily: serifFont(lang) }}>
                    {a.title}
                  </h2>
                </Link>

                {a.university && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5" style={{ fontFamily: sansFont(lang) }}>
                    <GraduationCap size={13} className="shrink-0" aria-hidden="true" />
                    <span>{a.university}</span>
                  </p>
                )}

                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed" style={{ fontFamily: sansFont(lang) }}>
                  {a.excerpt}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <Link
                  to={localizedPath(`/article/${a.slug}`)}
                  className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 min-h-[36px]"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  <span>{lang === "ar" ? "اقرأ" : "Read"}</span>
                  <ArrowRight size={12} className={arrowFlip} aria-hidden="true" />
                </Link>
                {a.pdf_url && (
                  <a
                    href={a.pdf_url}
                    className="px-3.5 py-2 border border-border text-xs text-slate-700 dark:text-slate-200 rounded-lg hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 min-h-[36px]"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    <Download size={12} aria-hidden="true" />
                    <span>{lang === "ar" ? "تحميل PDF" : "Download PDF"}</span>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}