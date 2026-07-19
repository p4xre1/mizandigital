import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, TrendingUp, Clock, Star, FileText, GraduationCap, Gavel, Users } from "lucide-react";
import { getArticles, type Article } from "../lib/supabase";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useI18n, useLocalizedPath, serifFont, sansFont, type Lang } from "../lib/i18n";
import { useSeo } from "../lib/seo";
import { setWebSiteSchema, clearSchema } from "../lib/jsonld";

const HERO_IMG = "https://images.unsplash.com/photo-1759732419233-5b84c4cb5a9c?crop=entropy&cs=tinysrgb&fit=max&fm=webp&q=70&w=1440";

type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({ ar, fr, en, es });

// Articles carry multilingual title/excerpt/category for display fallback
interface LocalArticle extends Article {
  titleL?: L; excerptL?: L; categoryL?: L;
}

const MOCK_ARTICLES: LocalArticle[] = [
  {
    id: "1", slug: "family-law-s1-2026", views: 4200, is_featured: true,
    created_at: "2026-07-13T10:00:00Z", updated_at: "2026-07-13T10:00:00Z", tags: ["S1", "2026"],
    title: "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026", excerpt: "", category: "قانون الأسرة",
    titleL: t4("أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026", "Examen de droit de la famille S1 — Maroc 2026", "Family Law Exam S1 — Morocco 2026", "Examen de derecho de familia S1 — Marruecos 2026"),
    excerptL: t4("نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة.", "Corrigés complets couvrant le Code de la famille : mariage, divorce, filiation et garde.", "Comprehensive answer keys covering the Family Code: marriage, divorce, filiation and custody.", "Respuestas completas sobre el Código de Familia: matrimonio, divorcio, filiación y custodia."),
    categoryL: t4("قانون الأسرة", "Droit de la famille", "Family Law", "Derecho de familia"),
  },
  {
    id: "2", slug: "criminal-procedure-2025", views: 2800, is_featured: false,
    created_at: "2026-07-12T10:00:00Z", updated_at: "2026-07-12T10:00:00Z",
    title: "مستجدات قانون المسطرة الجنائية — تعديلات 2025", excerpt: "", category: "القانون الجنائي",
    titleL: t4("مستجدات قانون المسطرة الجنائية — تعديلات 2025", "Nouveautés du Code de procédure pénale — 2025", "Criminal Procedure Code Updates — 2025", "Novedades del Código de Procedimiento Penal — 2025"),
    excerptL: t4("تحليل معمّق للتعديلات الأخيرة على قانون المسطرة الجنائية المغربي.", "Analyse approfondie des dernières modifications du Code de procédure pénale marocain.", "In-depth analysis of the latest amendments to the Moroccan Criminal Procedure Code.", "Análisis profundo de las últimas reformas del Código de Procedimiento Penal marroquí."),
    categoryL: t4("القانون الجنائي", "Droit pénal", "Criminal Law", "Derecho penal"),
  },
  {
    id: "3", slug: "company-contract-cassation", views: 1500, is_featured: false,
    created_at: "2026-07-10T10:00:00Z", updated_at: "2026-07-10T10:00:00Z",
    title: "عقد الشركة وإشكالاته القانونية في ضوء أحكام محكمة النقض", excerpt: "", category: "القانون التجاري",
    titleL: t4("عقد الشركة وإشكالاته القانونية في ضوء أحكام محكمة النقض", "Le contrat de société à la lumière de la Cour de cassation", "Company Contracts in Light of Cassation Rulings", "El contrato de sociedad según el Tribunal de Casación"),
    excerptL: t4("دراسة مقارنة بين القانون المغربي والفرنسي في مجال عقود الشركات.", "Étude comparée du droit marocain et français en matière de contrats de société.", "Comparative study of Moroccan and French law on company contracts.", "Estudio comparado del derecho marroquí y francés sobre contratos de sociedad."),
    categoryL: t4("القانون التجاري", "Droit commercial", "Commercial Law", "Derecho mercantil"),
  },
  {
    id: "4", slug: "legality-administrative-law", views: 980, is_featured: false,
    created_at: "2026-07-08T10:00:00Z", updated_at: "2026-07-08T10:00:00Z",
    title: "مبدأ المشروعية في القانون الإداري المغربي — دراسة تحليلية", excerpt: "", category: "القانون الإداري",
    titleL: t4("مبدأ المشروعية في القانون الإداري المغربي — دراسة تحليلية", "Le principe de légalité en droit administratif marocain", "The Principle of Legality in Moroccan Administrative Law", "El principio de legalidad en el derecho administrativo marroquí"),
    excerptL: t4("رصد لأحدث اجتهادات المحكمة الإدارية العليا حول مبدأ المشروعية.", "Panorama de la jurisprudence de la Cour administrative suprême sur la légalité.", "A review of the latest Supreme Administrative Court case law on legality.", "Repaso de la jurisprudencia del Tribunal Administrativo Supremo sobre la legalidad."),
    categoryL: t4("القانون الإداري", "Droit administratif", "Administrative Law", "Derecho administrativo"),
  },
];

const statsData: { key: string; value: string; icon: React.ReactNode }[] = [
  { key: "stat_documents", value: "12,400+", icon: <FileText size={20} /> },
  { key: "stat_universities", value: "18", icon: <GraduationCap size={20} /> },
  { key: "stat_rulings", value: "3,200+", icon: <Gavel size={20} /> },
  { key: "stat_researchers", value: "28k", icon: <Users size={20} /> },
];

const trendingTopics: L[] = [
  t4("إصلاح مدوّنة الأسرة 2024", "Réforme du Code de la famille 2024", "Family Code Reform 2024", "Reforma del Código de Familia 2024"),
  t4("امتحانات S1 2026", "Examens S1 2026", "S1 Exams 2026", "Exámenes S1 2026"),
  t4("قانون رقم 103.13", "Loi n° 103.13", "Law No. 103.13", "Ley n.º 103.13"),
  t4("الطلاق للشقاق", "Divorce pour discorde", "Divorce for Discord", "Divorcio por desavenencia"),
  t4("الحضانة المشتركة", "Garde partagée", "Joint Custody", "Custodia compartida"),
  t4("العقد الإلكتروني", "Contrat électronique", "Electronic Contracts", "Contrato electrónico"),
];

function ArticleCard({ article, featured = false }: { article: LocalArticle; featured?: boolean }) {
  const { lang, dir, t } = useI18n();

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 24) return t("time_hours_ago").replace("{n}", String(h));
    const days = Math.floor(h / 24);
    return t("time_days_ago").replace("{n}", String(days));
  };

  const title = article.titleL?.[lang] ?? article.title;
  const excerpt = article.excerptL?.[lang] ?? article.excerpt;
  const category = article.categoryL?.[lang] ?? article.category;

  return (
    <Link to={`/article/${article.slug}`}
      className={`group bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all block ${featured ? "md:col-span-2" : ""}`}
      dir={dir}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${article.is_featured ? "bg-red-50 text-red-600 border-red-200" : "bg-accent text-primary border-primary/20"}`}>
          {category}
        </span>
        {article.is_featured && <span className="text-[11px] text-red-500 font-semibold flex items-center gap-1"><TrendingUp size={11} /> {t("trending_badge")}</span>}
      </div>
      <h3 className={`font-bold text-foreground leading-snug group-hover:text-primary transition-colors mb-2 ${featured ? "text-lg" : "text-base"}`} style={{ fontFamily: serifFont(lang) }}>
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2" style={{ fontFamily: sansFont(lang) }}>{excerpt}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(article.created_at)}</span>
          <span className="flex items-center gap-1"><Star size={11} />{article.views.toLocaleString()} {t("reads")}</span>
        </div>
        <span className="text-primary flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          {t("read_more")} <ArrowRight size={11} className={dir === "rtl" ? "" : "rotate-180"} />
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const { lang, dir, theme, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const [articles, setArticles] = useState<LocalArticle[]>(MOCK_ARTICLES);
  const [loading, setLoading] = useState(false);

  useSeo({
    title: t("hero_title"),
    description: t("hero_subtitle"),
    path: "/",
    keywords: ["القانون المغربي", "Moroccan law", "droit marocain", "أرشيف قانوني", "legal archive", "jurisprudence", "مدونة الأسرة"],
    lang,
  }, [lang]);

  useEffect(() => {
    setWebSiteSchema();
    return () => clearSchema("ld-webpage");
  }, [lang]);

  useEffect(() => {
    getArticles({ limit: 8, featured: false })
      .then(data => { if (data?.length) setArticles(data as LocalArticle[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const arrowFlip = dir === "rtl" ? "" : "rotate-180";

  return (
    <div>
      {/* Hero — prestigious law library photograph with theme-aware radial overlay */}
      <section className="relative isolate overflow-hidden text-white" dir={dir}>
        <ImageWithFallback
          src={HERO_IMG}
          alt={t("hero_title")}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: theme === "dark"
              ? "radial-gradient(120% 100% at 75% 30%, rgba(10,15,26,0.55) 0%, rgba(10,15,26,0.86) 55%, rgba(6,10,20,0.96) 100%)"
              : "radial-gradient(120% 100% at 75% 30%, rgba(120,90,20,0.60) 0%, rgba(30,58,138,0.82) 55%, rgba(17,29,58,0.94) 100%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-mono bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full tracking-widest uppercase mb-5">
              {t("hero_badge")}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4 drop-shadow-sm" style={{ fontFamily: serifFont(lang) }}>
              {t("hero_title")}
            </h1>
            <p className="text-white/90 text-base md:text-lg max-w-lg mb-8 leading-relaxed" style={{ fontFamily: sansFont(lang) }}>
              {t("hero_subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={localizedPath("/library")} className="px-6 py-3 bg-white text-primary font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-lg" style={{ fontFamily: sansFont(lang) }}>
                {t("hero_cta_library")}
              </Link>
              <Link to={localizedPath("/archive")} className="px-6 py-3 border border-white/50 text-white font-medium rounded-xl hover:bg-white/10 backdrop-blur-sm transition-colors text-sm" style={{ fontFamily: sansFont(lang) }}>
                {t("hero_cta_archive")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" dir={dir}>
            {statsData.map((s) => (
              <div key={s.key} className="text-center p-4">
                <div className="text-primary flex justify-center mb-2">{s.icon}</div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1" style={{ fontFamily: sansFont(lang) }}>{t(s.key)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          <div>
            <div className="flex items-center justify-between mb-6" dir={dir}>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>{t("latest_articles")}</h2>
              <Link to={localizedPath("/library")} className="text-sm text-primary flex items-center gap-1 hover:underline" style={{ fontFamily: sansFont(lang) }}>
                {t("view_all")} <ArrowRight size={13} className={arrowFlip} />
              </Link>
            </div>
            {loading ? (
              <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {articles.map((a, i) => <ArticleCard key={a.id} article={a} featured={i === 0} />)}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6" dir={dir}>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-bold mb-4 pb-3 border-b border-border" style={{ fontFamily: serifFont(lang) }}>{t("trending_topics")}</h3>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic) => (
                  <Link key={topic.en} to={localizedPath(`/search?q=${encodeURIComponent(topic[lang])}`)}
                    className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-primary hover:border-primary/30 transition-colors"
                    style={{ fontFamily: sansFont(lang) }}>{topic[lang]}</Link>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-bold mb-3 pb-3 border-b border-border" style={{ fontFamily: serifFont(lang) }}>{t("browse_by_semester")}</h3>
              <div className="space-y-2">
                {["S1", "S2", "S3", "S4", "S5", "S6"].map(s => (
                  <Link key={s} to={`/archive?semester=${s.toLowerCase()}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent hover:border-primary/30 transition-colors group"
                    style={{ fontFamily: sansFont(lang) }}>
                    <span className="text-sm text-foreground/80">{t("semester_label")} {s}</span>
                    <ArrowRight size={13} className={`text-muted-foreground group-hover:text-primary ${arrowFlip}`} />
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-accent border border-primary/20 rounded-xl p-5">
              <h3 className="text-sm font-bold text-primary mb-1" style={{ fontFamily: serifFont(lang) }}>{t("newsletter_title")}</h3>
              <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: sansFont(lang) }}>{t("newsletter_sub")}</p>
              <input type="email" placeholder={t("newsletter_email")} maxLength={254}
                className={`w-full text-sm px-3 py-2 rounded-lg border border-border bg-card mb-2 outline-none focus:border-primary ${dir === "rtl" ? "text-right" : "text-left"}`}
                style={{ fontFamily: sansFont(lang) }} />
              <button className="w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                style={{ fontFamily: sansFont(lang) }}>{t("newsletter_cta")}</button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
