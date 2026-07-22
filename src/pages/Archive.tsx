import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GraduationCap, Filter, ArrowRight, Download, BookOpen, Search, ShieldCheck, UserPlus, Sparkles } from "lucide-react";
import { getArticles, type Article } from "../lib/supabase";
import { useLocalizedPath, useI18n, serifFont, sansFont, type Lang } from "../lib/i18n";
import { useRole } from "../hooks/useRole";
import { trackEvent } from "../lib/analytics";

// Moroccan Law Faculties & Universities
const UNIVERSITIES = [
  { slug: "all", labelAr: "جميع الكليات والجامعات", labelFr: "Toutes les universités", labelEn: "All Universities" },
  { slug: "um5", labelAr: "جامعة محمد الخامس — الرباط (FSJES)", labelFr: "Université Mohammed V — Rabat", labelEn: "Mohammed V University — Rabat" },
  { slug: "uh2", labelAr: "جامعة الحسن الثاني — الدار البيضاء (FSJES)", labelFr: "Université Hassan II — Casablanca", labelEn: "Hassan II University — Casablanca" },
  { slug: "uqa", labelAr: "جامعة القاضي عياض — مراكش (FSJES)", labelFr: "Université Cadi Ayyad — Marrakech", labelEn: "Cadi Ayyad University — Marrakech" },
  { slug: "umo", labelAr: "جامعة محمد الأول — وجدة (FSJES)", labelFr: "Université Mohammed I — Oujda", labelEn: "Mohammed I University — Oujda" },
  { slug: "usa", labelAr: "جامعة ابن طفيل — القنيطرة (FSJES)", labelFr: "Université Ibn Tofail — Kénitra", labelEn: "Ibn Tofail University — Kenitra" },
  { slug: "uab", labelAr: "جامعة عبد المالك السعدي — تطوان/طنجة", labelFr: "Université Abdelmalek Essaâdi — Tétouan/Tanger", labelEn: "Abdelmalek Essaâdi University — Tetouan/Tangier" },
  { slug: "usm", labelAr: "جامعة سيدي محمد بن عبد الله — فاس (FSJES)", labelFr: "Université Sidi Mohamed ben Abdellah — Fès", labelEn: "Sidi Mohamed ben Abdellah University — Fez" },
  { slug: "uiz", labelAr: "جامعة ابن زهر — أكادير (FSJES)", labelFr: "Université Ibn Zohr — Agadir", labelEn: "Ibn Zohr University — Agadir" },
];

// Academic Semesters & Levels
const SEMESTERS = [
  { slug: "all", labelAr: "كل الفصول", labelFr: "Tous les semestres", labelEn: "All Semesters" },
  { slug: "s1", labelAr: "الفصل الأول S1", labelFr: "Semestre 1 (S1)", labelEn: "Semester 1 (S1)" },
  { slug: "s2", labelAr: "الفصل الثاني S2", labelFr: "Semestre 2 (S2)", labelEn: "Semester 2 (S2)" },
  { slug: "s3", labelAr: "الفصل الثالث S3", labelFr: "Semestre 3 (S3)", labelEn: "Semester 3 (S3)" },
  { slug: "s4", labelAr: "الفصل الرابع S4", labelFr: "Semestre 4 (S4)", labelEn: "Semester 4 (S4)" },
  { slug: "s5", labelAr: "الفصل الخامس S5", labelFr: "Semestre 5 (S5)", labelEn: "Semester 5 (S5)" },
  { slug: "s6", labelAr: "الفصل السادس S6", labelFr: "Semestre 6 (S6)", labelEn: "Semester 6 (S6)" },
  { slug: "master", labelAr: "سلك ماستر / دكتوراه", labelFr: "Master / Doctorat", labelEn: "Master / PhD" },
];

const MOCK: Article[] = [
  { id: "1", title: "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026", slug: "family-law-s1-2026", excerpt: "نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة.", category: "قانون الأسرة", university: "محمد الخامس — الرباط", semester: "s1", year: 2026, views: 4200, is_featured: true, created_at: "2026-07-13T10:00:00Z", updated_at: "2026-07-13T10:00:00Z", pdf_url: "#" },
  { id: "2", title: "امتحان القانون التجاري S3 — جامعة الحسن الثاني 2026", slug: "commercial-s3-uh2-2026", excerpt: "أسئلة وإجابات نموذجية لامتحان القانون التجاري — الفصل الثالث.", category: "القانون التجاري", university: "الحسن الثاني — الدار البيضاء", semester: "s3", year: 2026, views: 2100, is_featured: false, created_at: "2026-07-11T10:00:00Z", updated_at: "2026-07-11T10:00:00Z", pdf_url: "#" },
  { id: "3", title: "ملخص القانون الدستوري S2 — جامعة القاضي عياض 2025", slug: "constitutional-s2-uqa-2025", excerpt: "ملخص شامل لمقرر القانون الدستوري — الفصل الثاني، جامعة مراكش.", category: "القانون الدستوري", university: "القاضي عياض — مراكش", semester: "s2", year: 2025, views: 1800, is_featured: false, created_at: "2026-07-09T10:00:00Z", updated_at: "2026-07-09T10:00:00Z" },
  { id: "4", title: "أسئلة القانون الجنائي S4 — جامعة محمد الأول 2025", slug: "criminal-s4-umo-2025", excerpt: "نماذج امتحانات القانون الجنائي العام والخاص — الفصل الرابع.", category: "القانون الجنائي", university: "محمد الأول — وجدة", semester: "s4", year: 2025, views: 1400, is_featured: false, created_at: "2026-07-07T10:00:00Z", updated_at: "2026-07-07T10:00:00Z", pdf_url: "#" },
  { id: "5", title: "ملخص التنظيم القضائي S4 — جامعة ابن طفيل 2026", slug: "judicial-organization-s4-usa-2026", excerpt: "ملخص مركز لقواعد الاختصاص والمحاكم الابتدائية والاستئناف وفق تعديلات 2026.", category: "التنظيم القضائي", university: "ابن طفيل — القنيطرة", semester: "s4", year: 2026, views: 3100, is_featured: false, created_at: "2026-07-05T10:00:00Z", updated_at: "2026-07-05T10:00:00Z", pdf_url: "#" },
];

function SecuredAdCard({ lang }: { lang: Lang }) {
  const localizedPath = useLocalizedPath();

  return (
    <aside
      aria-label="Advertisement"
      className="col-span-full my-3 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/40 text-center relative overflow-hidden shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-200/50 dark:border-amber-800/30 text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">
        <span className="flex items-center gap-1">
          <Sparkles size={12} aria-hidden="true" />
          {lang === "ar" ? "إعلان موجه للطلبة" : "Student Announcement"}
        </span>
        <span className="flex items-center gap-1 opacity-80">
          <ShieldCheck size={11} aria-hidden="true" />
          {lang === "ar" ? "منصة ميزان" : "Mizan Network"}
        </span>
      </div>

      <div className="space-y-1.5 my-2">
        <p className="font-bold text-slate-900 dark:text-amber-100 text-sm md:text-base leading-snug">
          {lang === "ar"
            ? "انضم إلى أكثر من 50,000 طالب وطالبة قانون في المغرب!"
            : "Join thousands of legal students across Moroccan universities!"}
        </p>
        <p className="text-slate-600 dark:text-amber-200/80 text-xs">
          {lang === "ar"
            ? "أنشئ حسابك المجاني لحفظ المقالات، تحميل ملخصات PDF، والمشاركة في المناقشات."
            : "Create your free account to save articles, download PDF summaries, and participate."}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <Link
          to={localizedPath("/register")}
          onClick={() => trackEvent("ad_click", { slot: "archive_grid", ad_id: "register_banner" })}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition-colors shadow-sm min-h-[38px]"
        >
          <UserPlus size={14} aria-hidden="true" />
          <span>{lang === "ar" ? "إنشاء حساب مجاني" : "Register Free"}</span>
        </Link>
      </div>
    </aside>
  );
}

export default function Archive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const localizedPath = useLocalizedPath();
  const { lang, dir } = useI18n();
  const { isStaff } = useRole();

  const [articles, setArticles] = useState<Article[]>(MOCK);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const university = searchParams.get("university") || "all";
  const semester = searchParams.get("semester") || "all";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  useEffect(() => {
    setLoading(true);
    getArticles({
      university: university !== "all" ? university : undefined,
      semester: semester !== "all" ? semester : undefined,
      limit: 30,
    })
      .then((data) => {
        if (data?.length) setArticles(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [university, semester]);

  // Dynamic client-side filtering by query, university, and semester
  const filtered = useMemo(() => {
    return articles.filter((a) => {
      const univObj = UNIVERSITIES.find((u) => u.slug === university);
      const univKeyword = univObj ? univObj.labelAr.split("—")[0].replace("جامعة", "").trim() : "";

      const matchesUniv = university === "all" || (a.university && a.university.includes(univKeyword));
      const matchesSem = semester === "all" || a.semester === semester;
      const matchesQuery =
        !searchQuery.trim() ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesUniv && matchesSem && matchesQuery;
    });
  }, [articles, university, semester, searchQuery]);

  const arrowFlip = dir === "rtl" ? "rotate-180" : "";

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" dir={dir}>
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
          <GraduationCap size={24} className="text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>
            {lang === "ar" ? "الأرشيف والأعمال الجامعية" : lang === "fr" ? "Archives Académiques" : "Academic Archive"}
          </h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5" style={{ fontFamily: sansFont(lang) }}>
            {lang === "ar"
              ? "فهرس شامل للملخصات والامتحانات والوحدات الدراسية بكليات الحقوق المغربية (FSJES)"
              : "Comprehensive archive of exams, study modules, and legal summaries across Moroccan FSJES faculties"}
          </p>
        </div>
      </div>

      {/* Main Filter & Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-8 shadow-sm space-y-4">
        {/* Search Query Input */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === "ar"
                ? "ابحث باسم المادة، الفصل، أو الجامعة..."
                : "Search by module name, semester, or university..."
            }
            className={`w-full py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
              dir === "rtl" ? "pr-4 pl-10" : "pl-10 pr-4"
            }`}
            style={{ fontFamily: sansFont(lang) }}
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-col md:flex-row gap-4 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={16} className="text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider" style={{ fontFamily: sansFont(lang) }}>
              {lang === "ar" ? "تصفية الكليات:" : "Filter:"}
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-3 flex-1">
            <div className="flex-1">
              <label htmlFor="university-filter" className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block" style={{ fontFamily: sansFont(lang) }}>
                {lang === "ar" ? "الجامعة / الكلية" : "University"}
              </label>
              <select
                id="university-filter"
                value={university}
                onChange={(e) => setFilter("university", e.target.value)}
                className="w-full px-3 py-2 text-xs md:text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px]"
                style={{ fontFamily: sansFont(lang) }}
                aria-label="Select University"
              >
                {UNIVERSITIES.map((u) => (
                  <option key={u.slug} value={u.slug}>
                    {lang === "ar" ? u.labelAr : lang === "fr" ? u.labelFr : u.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="semester-filter" className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block" style={{ fontFamily: sansFont(lang) }}>
                {lang === "ar" ? "الفصل الدراسي (السداسي)" : "Semester"}
              </label>
              <select
                id="semester-filter"
                value={semester}
                onChange={(e) => setFilter("semester", e.target.value)}
                className="w-full px-3 py-2 text-xs md:text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px]"
                style={{ fontFamily: sansFont(lang) }}
                aria-label="Select Semester"
              >
                {SEMESTERS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {lang === "ar" ? s.labelAr : lang === "fr" ? s.labelFr : s.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Semester Quick Filter Tabs */}
      <nav aria-label="Semester Filter Tabs" className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {SEMESTERS.map((s) => (
          <button
            key={s.slug}
            onClick={() => setFilter("semester", s.slug)}
            className={`px-4 py-2 text-xs md:text-sm rounded-full border whitespace-nowrap transition-colors min-h-[38px] ${
              semester === s.slug
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                : "border-border text-slate-600 dark:text-slate-300 hover:border-primary/50 hover:text-primary bg-card"
            }`}
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" ? s.labelAr : lang === "fr" ? s.labelFr : s.labelEn}
          </button>
        ))}
      </nav>

      {/* Archive Results List */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl p-8 shadow-sm" style={{ fontFamily: sansFont(lang) }}>
          <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-3" aria-hidden="true" />
          <p className="text-base font-bold text-foreground mb-1">
            {lang === "ar" ? "لم نجد نتائج تطابق معايير تصفيتك" : "No results found for this filter"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === "ar" ? "جرّب اختيار جامعة أخرى، أو البحث بدون تحديد سداسي معين." : "Try resetting your search parameters or browsing all semesters."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((a, idx) => {
            const showAdHere = !isStaff && idx === 2;

            return (
              <div key={a.id} className="contents">
                {showAdHere && <SecuredAdCard lang={lang} />}
                <article
                  className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col justify-between"
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
                      <h2 className="text-base font-bold text-foreground hover:text-primary transition-colors mb-2 leading-snug" style={{ fontFamily: serifFont(lang) }}>
                        {a.title}
                      </h2>
                    </Link>

                    {a.university && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5" style={{ fontFamily: sansFont(lang) }}>
                        <GraduationCap size={13} className="shrink-0 text-primary" aria-hidden="true" />
                        <span>{a.university}</span>
                      </p>
                    )}

                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed" style={{ fontFamily: sansFont(lang) }}>
                      {a.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                    <Link
                      to={localizedPath(`/article/${a.slug}`)}
                      className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1.5 min-h-[36px]"
                      style={{ fontFamily: sansFont(lang) }}
                    >
                      <span>{lang === "ar" ? "تصفح المقال" : "Read Module"}</span>
                      <ArrowRight size={12} className={arrowFlip} aria-hidden="true" />
                    </Link>
                    {a.pdf_url && (
                      <a
                        href={a.pdf_url}
                        className="px-3.5 py-2 border border-border text-xs text-slate-700 dark:text-slate-200 rounded-xl hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 min-h-[36px]"
                        style={{ fontFamily: sansFont(lang) }}
                      >
                        <Download size={12} aria-hidden="true" />
                        <span>{lang === "ar" ? "تحميل PDF" : "PDF"}</span>
                      </a>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}