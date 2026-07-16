import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { GraduationCap, Filter, ArrowRight, FileText, Download } from "lucide-react";
import { getArticles, type Article } from "../lib/supabase";

const UNIVERSITIES = [
  { slug: "all", label: "كل الجامعات" },
  { slug: "um5", label: "محمد الخامس — الرباط" },
  { slug: "uh2", label: "الحسن الثاني — الدار البيضاء" },
  { slug: "uqa", label: "القاضي عياض — مراكش" },
  { slug: "umo", label: "محمد الأول — وجدة" },
  { slug: "usa", label: "ابن طفيل — القنيطرة" },
  { slug: "uab", label: "عبد المالك السعدي — تطوان" },
];

const SEMESTERS = [
  { slug: "all", label: "كل الفصول" },
  { slug: "s1", label: "الفصل الأول S1" },
  { slug: "s2", label: "الفصل الثاني S2" },
  { slug: "s3", label: "الفصل الثالث S3" },
  { slug: "s4", label: "الفصل الرابع S4" },
  { slug: "s5", label: "الفصل الخامس S5" },
  { slug: "s6", label: "الفصل السادس S6" },
];

const MOCK: Article[] = [
  { id: "1", title: "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026", slug: "family-law-s1-2026", excerpt: "نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة.", category: "قانون الأسرة", university: "محمد الخامس — الرباط", semester: "s1", year: 2026, views: 4200, is_featured: true, created_at: "2026-07-13T10:00:00Z", updated_at: "2026-07-13T10:00:00Z", pdf_url: "#" },
  { id: "2", title: "امتحان القانون التجاري S3 — جامعة الحسن الثاني 2026", slug: "commercial-s3-uh2-2026", excerpt: "أسئلة وإجابات نموذجية لامتحان القانون التجاري — الفصل الثالث.", category: "القانون التجاري", university: "الحسن الثاني — الدار البيضاء", semester: "s3", year: 2026, views: 2100, is_featured: false, created_at: "2026-07-11T10:00:00Z", updated_at: "2026-07-11T10:00:00Z", pdf_url: "#" },
  { id: "3", title: "ملخص القانون الدستوري S2 — جامعة القاضي عياض 2025", slug: "constitutional-s2-uqa-2025", excerpt: "ملخص شامل لمقرر القانون الدستوري — الفصل الثاني، جامعة مراكش.", category: "القانون الدستوري", university: "القاضي عياض — مراكش", semester: "s2", year: 2025, views: 1800, is_featured: false, created_at: "2026-07-09T10:00:00Z", updated_at: "2026-07-09T10:00:00Z" },
  { id: "4", title: "أسئلة القانون الجنائي S4 — جامعة محمد الأول 2025", slug: "criminal-s4-umo-2025", excerpt: "نماذج امتحانات القانون الجنائي العام والخاص — الفصل الرابع.", category: "القانون الجنائي", university: "محمد الأول — وجدة", semester: "s4", year: 2025, views: 1400, is_featured: false, created_at: "2026-07-07T10:00:00Z", updated_at: "2026-07-07T10:00:00Z", pdf_url: "#" },
];

export default function Archive() {
  const [searchParams, setSearchParams] = useSearchParams();
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

  const filtered = articles.filter(a =>
    (university === "all" || a.university?.includes(UNIVERSITIES.find(u => u.slug === university)?.label?.split("—")[0].trim() || "")) &&
    (semester === "all" || a.semester === semester)
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3" dir="rtl">
        <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
          <GraduationCap size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>الأرشيف الجامعي</h1>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>نماذج امتحانات، ملخصات، وأطروحات من جامعات مغربية</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-border rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4" dir="rtl">
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>تصفية:</span>
        </div>
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>الجامعة</label>
            <select value={university} onChange={e => setFilter("university", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-gray-50 focus:outline-none focus:border-primary"
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
              {UNIVERSITIES.map(u => <option key={u.slug} value={u.slug}>{u.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>الفصل الدراسي</label>
            <select value={semester} onChange={e => setFilter("semester", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-gray-50 focus:outline-none focus:border-primary"
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
              {SEMESTERS.map(s => <option key={s.slug} value={s.slug}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Semester quick-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6" dir="rtl">
        {SEMESTERS.map(s => (
          <button key={s.slug} onClick={() => setFilter("semester", s.slug)}
            className={`px-4 py-1.5 text-sm rounded-full border whitespace-nowrap transition-colors ${semester === s.slug ? "bg-primary text-white border-primary" : "border-border text-gray-600 hover:border-primary/40 hover:text-primary"}`}
            style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{s.label}</button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
          لا توجد نتائج لهذه الفلترة
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(a => (
            <article key={a.id} className="bg-white border border-border rounded-xl p-5 hover:shadow-sm hover:border-blue-200 transition-all" dir="rtl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary border border-blue-100">{a.category}</span>
                {a.semester && <span className="text-[11px] font-mono text-muted-foreground border border-border px-2 py-0.5 rounded-full">{a.semester?.toUpperCase()}</span>}
                {a.year && <span className="text-[11px] font-mono text-muted-foreground">{a.year}</span>}
              </div>
              <Link to={`/article/${a.slug}`}>
                <h3 className="text-base font-bold hover:text-primary transition-colors mb-1" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>{a.title}</h3>
              </Link>
              {a.university && <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><GraduationCap size={11} />{a.university}</p>}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{a.excerpt}</p>
              <div className="flex gap-2">
                <Link to={`/article/${a.slug}`}
                  className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                  اقرأ <ArrowRight size={11} />
                </Link>
                {a.pdf_url && (
                  <a href={a.pdf_url} className="px-3 py-1.5 border border-border text-xs text-gray-600 rounded-lg hover:border-primary hover:text-primary flex items-center gap-1"
                    style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                    <Download size={11} /> تحميل PDF
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
