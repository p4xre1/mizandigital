import { useState, useEffect, useCallback, useRef } from "react";
import { Users, FileText, Eye, ShieldAlert, TrendingUp, RefreshCw } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useI18n, serifFont, sansFont, useLocalizedPath } from "@/lib/i18n";
import { useCms } from "@/lib/adminStore";
import { AdminWrapper } from "@/components/AdminWrapper";
import { supabase } from "@/lib/supabase";

// Site Domain Constants
const SITE_URL = import.meta.env.VITE_SITE_URL || import.meta.env.VITE_APP_URL || "https://www.mizan.page";

// Explicit Supabase Query Row Interfaces
interface ProfileMetricsRow {
  is_frozen: boolean | null;
}

interface ArticleMetricsRow {
  status: string | null;
  views: number | null;
}

// Multilingual Dictionary (AR, FR, EN, ES)
// noinspection SpellCheckingInspection
/* cspell:disable */
const I18N_DICT = {
  ar: {
    title: "لوحة التحكم الإدارية",
    subtitle: "مراقبة مستجدات المنصة والأداء بصفة مباشرة",
    refresh: "تحديث البيانات",
    users: "المستخدمون",
    articles: "المقالات القانونية",
    reads: "القراءات والزيارات",
    security: "تنبيهات الأمان",
    banned: "محظور",
    published: "منشور",
    analytics: "حركة المرور والتحليلات",
    categoryDist: "توزيع المقالات حسب التخصص القانوني",
    family: "الأسرة",
    criminal: "الجنائي",
    commercial: "التجاري",
    admin: "الإداري",
    constit: "الدستوري",
  },
  fr: {
    title: "Tableau de Bord Administratif",
    subtitle: "Suivi en temps réel des performances de la plateforme",
    refresh: "Actualiser les métriques",
    users: "Utilisateurs",
    articles: "Articles Juridiques",
    reads: "Lectures et Vues",
    security: "Alertes Sécurité",
    banned: "suspendu(s)",
    published: "publié(s)",
    analytics: "Trafic & Analyses",
    categoryDist: "Distribution par Domaine Juridique",
    family: "Famille",
    criminal: "Pénal",
    commercial: "Commercial",
    admin: "Administratif",
    constit: "Constitutionnel",
  },
  en: {
    title: "Admin Dashboard Overview",
    subtitle: "Real-time key performance metrics & security oversight",
    refresh: "Refresh metrics",
    users: "Registered Users",
    articles: "Legal Articles",
    reads: "Reads & Views",
    security: "Security Alerts",
    banned: "banned",
    published: "published",
    analytics: "Traffic & Analytics",
    categoryDist: "Articles by Legal Field",
    family: "Family",
    criminal: "Criminal",
    commercial: "Commercial",
    admin: "Admin",
    constit: "Constitutional",
  },
  es: {
    title: "Panel de Control Administrativo",
    subtitle: "Supervisión en tiempo real del rendimiento de la plataforma",
    refresh: "Actualizar métricas",
    users: "Usuarios Registrados",
    articles: "Artículos Jurídicos",
    reads: "Lecturas y Visitas",
    security: "Alertas de Seguridad",
    banned: "suspendidos",
    published: "publicados",
    analytics: "Tráfico y Analítica",
    categoryDist: "Artículos por Campo Jurídico",
    family: "Familia",
    criminal: "Penal",
    commercial: "Mercantil",
    admin: "Administrativo",
    constit: "Constitucional",
  },
};
/* cspell:enable */

// Mock Traffic Chart Data
const trafficData = [
  { d: "Mon", v: 1200 },
  { d: "Tue", v: 2100 },
  { d: "Wed", v: 1800 },
  { d: "Thu", v: 2600 },
  { d: "Fri", v: 3200 },
  { d: "Sat", v: 2400 },
  { d: "Sun", v: 2900 },
];

// noinspection SpellCheckingInspection
export default function Dashboard() {
  const { lang } = useI18n();
  const getLocalizedPath = useLocalizedPath();
  const cms = useCms();

  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  // Active language dictionary with fallback
  const dict = I18N_DICT[lang as keyof typeof I18N_DICT] || I18N_DICT.en;

  const [metrics, setMetrics] = useState({
    userCount: cms.users.length,
    bannedCount: cms.users.filter((u) => u.status === "banned").length,
    articleCount: cms.articles.length,
    publishedCount: cms.articles.filter((a) => a.status === "published").length,
    totalViews: cms.articles.reduce((s, a) => s + a.views, 0),
    securityAlerts: cms.security.filter((s) => s.severity !== "info").length,
  });

  // Fetch real-time KPI metrics from Supabase DB
  const fetchDbMetrics = useCallback(async () => {
    if (isMounted.current) setLoading(true);
    try {
      // 1. Fetch Users Count & Frozen Profiles
      const { count: uCount, data: uData } = await supabase
          .from("profiles")
          .select("is_frozen", { count: "exact" });

      const typedUsers = (uData as ProfileMetricsRow[]) || [];
      const banned = typedUsers.filter((u) => Boolean(u.is_frozen)).length;

      // 2. Fetch Articles Count & Views
      const { count: aCount, data: aData } = await supabase
          .from("articles")
          .select("status, views", { count: "exact" });

      const typedArticles = (aData as ArticleMetricsRow[]) || [];
      const published = typedArticles.filter((a) => a.status === "published").length;
      const viewsSum = typedArticles.reduce((acc, curr) => acc + (curr.views || 0), 0);

      // 3. Fetch Security Logs (Warning / Critical)
      const { count: secCount } = await supabase
          .from("security_logs")
          .select("*", { count: "exact", head: true })
          .neq("severity", "info");

      if (isMounted.current) {
        setMetrics({
          userCount: uCount ?? cms.users.length,
          bannedCount: banned || cms.users.filter((u) => u.status === "banned").length,
          articleCount: aCount ?? cms.articles.length,
          publishedCount: published || cms.articles.filter((a) => a.status === "published").length,
          totalViews: viewsSum || cms.articles.reduce((s, a) => s + a.views, 0),
          securityAlerts: secCount ?? cms.security.filter((s) => s.severity !== "info").length,
        });
      }
    } catch (err) {
      console.error("Error fetching live dashboard metrics:", err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [cms]);

  useEffect(() => {
    isMounted.current = true;
    void fetchDbMetrics();

    return () => {
      isMounted.current = false;
    };
  }, [fetchDbMetrics]);

  // Localized Legal Category Chart Data
  const byCategory = [
    { c: dict.family, v: 4200 },
    { c: dict.criminal, v: 2800 },
    { c: dict.commercial, v: 1500 },
    { c: dict.admin, v: 980 },
    { c: dict.constit, v: 760 },
  ];

  const kpis = [
    {
      icon: Users,
      label: dict.users,
      value: metrics.userCount,
      sub: `${metrics.bannedCount} ${dict.banned}`,
      link: getLocalizedPath("/admin/users"),
    },
    {
      icon: FileText,
      label: dict.articles,
      value: metrics.articleCount,
      sub: `${metrics.publishedCount} ${dict.published}`,
      link: getLocalizedPath("/admin/articles"),
    },
    {
      icon: Eye,
      label: dict.reads,
      value: metrics.totalViews.toLocaleString(),
      sub: "+12.4%",
      link: getLocalizedPath("/admin/analytics"),
    },
    {
      icon: ShieldAlert,
      label: dict.security,
      value: metrics.securityAlerts,
      sub: "24h",
      link: getLocalizedPath("/admin/security"),
    },
  ];

  return (
      <AdminWrapper title={dict.title}>
        <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
          {/* Header Title with Sync Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1
                  className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"
                  style={{ fontFamily: serifFont(lang) }}
              >
                <span>{dict.title}</span>
              </h1>
              <p
                  className="text-xs text-muted-foreground mt-0.5"
                  style={{ fontFamily: sansFont(lang) }}
              >
                {dict.subtitle}
              </p>
            </div>

            <button
                onClick={() => {
                  void fetchDbMetrics();
                }}
                className="self-start sm:self-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-2 text-muted-foreground hover:text-emerald-500 rounded-xl border border-border bg-card transition-all flex items-center justify-center gap-2 text-xs font-semibold"
                title={dict.refresh}
                aria-label={dict.refresh}
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-emerald-500" : ""} />
              <span className="sm:hidden">{dict.refresh}</span>
            </button>
          </div>

          {/* KPI Grid (Mobile First Stack) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map((k) => (
                <a
                    key={k.label}
                    href={k.link}
                    className="bg-card border border-border rounded-2xl p-4 sm:p-5 transition-all hover:border-emerald-500/50 hover:shadow-sm block active:scale-[0.99]"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3">
                    <k.icon size={18} />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground font-mono">{k.value}</div>
                  <div
                      className="text-xs text-muted-foreground mt-1"
                      style={{ fontFamily: sansFont(lang) }}
                  >
                    {k.label}
                  </div>
                  <div className="text-[11px] text-emerald-500 font-semibold mt-1 flex items-center gap-1 font-mono">
                    <TrendingUp size={11} />
                    {k.sub}
                  </div>
                </a>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Traffic / Analytics Chart */}
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
              <h2
                  className="font-bold text-foreground mb-4 text-sm sm:text-base"
                  style={{ fontFamily: serifFont(lang) }}
              >
                {dict.analytics}
              </h2>
              <div className="w-full h-56 sm:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="v"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#g)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Article Category Distribution */}
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
              <h2
                  className="font-bold text-foreground mb-4 text-sm sm:text-base"
                  style={{ fontFamily: serifFont(lang) }}
              >
                {dict.categoryDist}
              </h2>
              <div className="w-full h-56 sm:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="c" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                    />
                    <Bar dataKey="v" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* SEO / Platform Branding Metadata Context */}
          <div className="hidden">
            <img
                src={`${SITE_URL}/Logo.svg`}
                alt="Mizan Digital Legal Portal - Dashboard Management Analytics"
                width={120}
                height={40}
                loading="lazy"
            />
          </div>
        </div>
      </AdminWrapper>
  );
}