import { useState, useEffect, useCallback } from "react";
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
import { useI18n, serifFont, sansFont, useLocalizedPath } from "../../lib/i18n";
import { useCms } from "../../lib/adminStore";
import { AdminWrapper } from "../../components/AdminWrapper";
import { supabase } from "@/lib/supabase";

const traffic = [
  { d: "Mon", v: 1200 },
  { d: "Tue", v: 2100 },
  { d: "Wed", v: 1800 },
  { d: "Thu", v: 2600 },
  { d: "Fri", v: 3200 },
  { d: "Sat", v: 2400 },
  { d: "Sun", v: 2900 },
];

const byCategory = [
  { c: "Family", v: 4200 },
  { c: "Criminal", v: 2800 },
  { c: "Commercial", v: 1500 },
  { c: "Admin", v: 980 },
  { c: "Constit.", v: 760 },
];

export default function Dashboard() {
  const { lang, t } = useI18n();
  const getLocalizedPath = useLocalizedPath();
  const cms = useCms();

  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      // 1. Fetch Users Count
      const { count: uCount, data: uData } = await supabase
        .from("profiles")
        .select("is_frozen", { count: "exact" });

      const banned = uData ? uData.filter((u) => u.is_frozen).length : 0;

      // 2. Fetch Articles Count & Views
      const { count: aCount, data: aData } = await supabase
        .from("articles")
        .select("status, views", { count: "exact" });

      const published = aData ? aData.filter((a) => a.status === "published").length : 0;
      const viewsSum = aData ? aData.reduce((acc, curr) => acc + (curr.views || 0), 0) : 0;

      // 3. Fetch Security Logs (Warning / Critical)
      const { count: secCount } = await supabase
        .from("security_logs")
        .select("*", { count: "exact", head: true })
        .neq("severity", "info");

      setMetrics({
        userCount: uCount ?? cms.users.length,
        bannedCount: banned || cms.users.filter((u) => u.status === "banned").length,
        articleCount: aCount ?? cms.articles.length,
        publishedCount: published || cms.articles.filter((a) => a.status === "published").length,
        totalViews: viewsSum || cms.articles.reduce((s, a) => s + a.views, 0),
        securityAlerts: secCount ?? cms.security.filter((s) => s.severity !== "info").length,
      });
    } catch (err) {
      console.error("Error fetching live dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [cms]);

  useEffect(() => {
    fetchDbMetrics();
  }, [fetchDbMetrics]);

  const kpis = [
    {
      icon: Users,
      label: t("admin_users"),
      value: metrics.userCount,
      sub: `${metrics.bannedCount} ${t("admin_banned")}`,
      link: getLocalizedPath("/admin/users"),
    },
    {
      icon: FileText,
      label: t("admin_articles"),
      value: metrics.articleCount,
      sub: `${metrics.publishedCount} ${t("admin_published")}`,
      link: getLocalizedPath("/admin/articles"),
    },
    {
      icon: Eye,
      label: t("reads"),
      value: metrics.totalViews.toLocaleString(),
      sub: "+12.4%",
      link: getLocalizedPath("/admin/analytics"),
    },
    {
      icon: ShieldAlert,
      label: t("admin_security"),
      value: metrics.securityAlerts,
      sub: "24h",
      link: getLocalizedPath("/admin/security"),
    },
  ];

  return (
    <AdminWrapper title={t("admin_overview")}>
      <div>
        {/* Header Title with Sync Button */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: serifFont(lang) }}
          >
            {t("admin_overview")}
          </h1>
          <button
            onClick={() => fetchDbMetrics()}
            className="p-2 text-muted-foreground hover:text-emerald-500 rounded-lg border border-border bg-card transition-all"
            title="Refresh Metrics"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((k) => (
            <a
              key={k.label}
              href={k.link}
              className="bg-card border border-border rounded-2xl p-5 transition-all hover:border-emerald-500/50 hover:shadow-sm block"
            >
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-emerald-500 mb-3">
                <k.icon size={18} />
              </div>
              <div className="text-2xl font-bold text-foreground">{k.value}</div>
              <div
                className="text-xs text-muted-foreground mt-1"
                style={{ fontFamily: sansFont(lang) }}
              >
                {k.label}
              </div>
              <div className="text-[11px] text-emerald-500 font-semibold mt-1 flex items-center gap-1">
                <TrendingUp size={11} />
                {k.sub}
              </div>
            </a>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Traffic / Analytics Chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2
              className="font-bold text-foreground mb-4"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t("admin_analytics")}
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={traffic}>
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

          {/* Article Category Distribution */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2
              className="font-bold text-foreground mb-4"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t("admin_articles")}
            </h2>
            <ResponsiveContainer width="100%" height={240}>
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
    </AdminWrapper>
  );
}