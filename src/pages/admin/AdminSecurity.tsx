import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Fingerprint,
  KeyRound,
  Activity,
  Filter,
  Clock,
  Terminal,
} from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms, type SecurityEvent } from "../../lib/adminStore";
import { AdminWrapper } from "../../components/AdminWrapper";

const SEV: Record<
  SecurityEvent["severity"],
  { icon: typeof ShieldCheck; cls: string; badgeCls: string }
> = {
  info: {
    icon: ShieldCheck,
    cls: "text-emerald-400 bg-emerald-950/40 border-emerald-500/30",
    badgeCls: "bg-emerald-950/60 text-emerald-400 border-emerald-500/30",
  },
  warning: {
    icon: ShieldAlert,
    cls: "text-amber-400 bg-amber-950/40 border-amber-500/30",
    badgeCls: "bg-amber-950/60 text-amber-400 border-amber-500/30",
  },
  critical: {
    icon: ShieldX,
    cls: "text-rose-400 bg-rose-950/40 border-rose-500/30",
    badgeCls: "bg-rose-950/60 text-rose-400 border-rose-500/30",
  },
};

export default function AdminSecurity() {
  const { lang, dir, t } = useI18n();
  const cms = useCms();

  const [filter, setFilter] = useState<SecurityEvent["severity"] | "all">("all");
  const [toggles, setToggles] = useState({
    mfa: true,
    rateLimit: true,
    honeypot: true,
    rls: true,
  });

  const controls = [
    {
      key: "mfa" as const,
      icon: Fingerprint,
      label: {
        ar: "المصادقة الثنائية (2FA)",
        fr: "Authentification 2FA",
        en: "Two-Factor Auth (2FA)",
        es: "Autenticación 2FA",
      },
    },
    {
      key: "rateLimit" as const,
      icon: Lock,
      label: {
        ar: "تحديد معدل الطلبات",
        fr: "Limitation de débit",
        en: "Request Rate Limiting",
        es: "Límite de solicitudes",
      },
    },
    {
      key: "honeypot" as const,
      icon: KeyRound,
      label: {
        ar: "حماية النماذج من الرسائل المزعجة",
        fr: "Anti-spam (honeypot)",
        en: "Form Anti-Spam (honeypot)",
        es: "Anti-spam de formularios",
      },
    },
    {
      key: "rls" as const,
      icon: ShieldCheck,
      label: {
        ar: "أمان مستوى الصف (RLS)",
        fr: "Sécurité niveau ligne (RLS)",
        en: "Row-Level Security (RLS)",
        es: "Seguridad a nivel de fila (RLS)",
      },
    },
  ];

  const filteredLogs = cms.security.filter(
    (e) => filter === "all" || e.severity === filter
  );

  return (
    <AdminWrapper title={t("admin_security")}>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t("admin_security")}
            </h1>
            <p
              className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 font-mono"
              style={{ fontFamily: sansFont(lang) }}
            >
              <Activity size={13} className="text-emerald-500 animate-pulse" />
              <span>SYSTEM AUDIT & POLICY ENGINE</span>
            </p>
          </div>

          {/* System Threat Level Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-muted-foreground">THREAT_LEVEL:</span>
            <span className="font-bold text-emerald-400">DEFCON_4</span>
          </div>
        </div>

        {/* Security Policies / Toggles Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {controls.map((c) => {
            const isActive = toggles[c.key];
            return (
              <div
                key={c.key}
                className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm transition-all hover:border-emerald-500/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      isActive
                        ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <c.icon size={18} />
                  </div>
                  <div>
                    <span
                      className="text-sm font-semibold text-foreground block"
                      style={{ fontFamily: sansFont(lang) }}
                    >
                      {c.label[lang] || c.label.en}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      STATUS: {isActive ? "ENFORCED" : "DISABLED"}
                    </span>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() =>
                    setToggles((prev) => ({ ...prev, [c.key]: !prev[c.key] }))
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative border p-0.5 ${
                    isActive
                      ? "bg-emerald-600 border-emerald-500"
                      : "bg-slate-800 border-slate-700"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-slate-950 shadow-md transition-transform transform ${
                      isActive
                        ? dir === "rtl"
                          ? "-translate-x-6 bg-slate-100"
                          : "translate-x-6 bg-slate-100"
                        : "translate-x-0 bg-slate-400"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Audit Log / Event Feed */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-emerald-500" />
              <h2
                className="font-bold text-foreground text-lg"
                style={{ fontFamily: serifFont(lang) }}
              >
                {lang === "ar"
                  ? "سجل الأمان والتدقيق"
                  : lang === "fr"
                  ? "Journal de sécurité"
                  : "Security Telemetry Log"}
              </h2>
            </div>

            {/* Severity Filters */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border text-xs font-mono">
              <Filter size={13} className="text-muted-foreground ml-1 mr-1" />
              {(["all", "critical", "warning", "info"] as const).map((sevKey) => (
                <button
                  key={sevKey}
                  onClick={() => setFilter(sevKey)}
                  className={`px-2.5 py-1 rounded-lg uppercase transition-all ${
                    filter === sevKey
                      ? "bg-card text-foreground font-bold border border-border shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sevKey}
                </button>
              ))}
            </div>
          </div>

          {/* Security Logs List */}
          <div className="space-y-2.5 font-mono">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                NO TELEMETRY EVENTS MATCHING ACTIVE FILTER.
              </div>
            ) : (
              filteredLogs.map((e) => {
                const s = SEV[e.severity];
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/40 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${s.cls}`}
                    >
                      <s.icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-foreground truncate">
                          {e.detail}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${s.badgeCls}`}
                        >
                          {e.severity}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                        <span className="text-emerald-500/80 font-mono">
                          [{e.type}]
                        </span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <Clock size={11} /> {e.at}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminWrapper>
  );
}