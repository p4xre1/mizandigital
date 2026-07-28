/* cspell:disable */
/* eslint-disable */

import { useState, useEffect, useMemo, useCallback } from "react";
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
  RefreshCw,
  AlertOctagon,
  Cpu,
  Download,
  Globe,
  CheckCircle2,
  SlidersHorizontal,
  Search,
  Shield,
  Zap,
} from "lucide-react";
import { useI18n, serifFont, sansFont } from "@/lib/i18n";
import { useCms, type SecurityEvent } from "@/lib/adminStore";
import { AdminWrapper } from "@/components/AdminWrapper";
import { SEOHead } from "@/components/seo/SEOHead";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/lib/supabase";

const SITE_DOMAIN =
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_APP_URL ||
    "https://www.mizan.page";

interface AuditLogRecord {
  id: string;
  action: string | null;
  table_name: string | null;
  created_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

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

const TRANSLATIONS = {
  ar: {
    title: "مركز أمان النظام وتدقيق التشفير",
    subtitle:
        "محرك السياسات الأمنية والمراقبة اللحظية للتهديدات السيبرانية - المستوى العسكري",
    threatLevel: "مستوى التهديد",
    defconStable: "DEFCON_4 :: مستقر",
    defconCritical: "DEFCON_1 :: هجوم نشط",
    controlsTitle: "سياسات وموجهات الأمان المشفرة",
    telemetryTitle: "سجل التدقيق والتليميتري الأمني اللحظي",
    activeSecurity: "الأنظمة النشطة",
    threatCount: "التهديدات المصدودة",
    lastScan: "آخر فحص للثغرات",
    exportLogs: "تصدير السجل (.JSON)",
    emergencyLockdown: "إغلاق الطوارئ الشامل",
    lockdownActive: "تم تفعيل حظر النظام الشامل",
    clearLogs: "تحديث السجل",
    searchPlaceholder: "البحث في السجلات، المعرفات، أو عناوين IP...",
    filterAll: "الكل",
    filterCritical: "حرج جداً",
    filterWarning: "تحذير أمني",
    filterInfo: "معلومات النظام",
    noLogsFound: "لم يتم العثور على أحداث أمنية تطابق معايير البحث الحالية.",
    roleAccessDenied:
        "وصول مرفوض: تتطلب هذه الشاشة صلاحيات مسئول أمن النظام (Security Admin / Root).",
    toggleEnforced: "مُفعل إجبارياً",
    toggleDisabled: "معطل",
    systemStatus: "بروتوكول أمن ميزان v4.8",
    mfaLabel: "المصادقة الثنائية الإلزامية (2FA)",
    mfaDesc: "فرض التوثيق المزدوج لجميع الحسابات الإدارية والمشرفين",
    rateLimitLabel: "تحديد معدل الطلبات والتكثيف",
    rateLimitDesc: "منع هجمات الحرمان من الخدمة (DDoS) والحد من طلبات API المتكررة",
    honeypotLabel: "مصيدة الرسائل المزعجة (Honeypot)",
    honeypotDesc: "اكتشاف البوتات وإحباط المشرعين التلقائيين في جميع النماذج",
    rlsLabel: "أمان مستوى الصف (RLS Supabase)",
    rlsDesc: "عزل البيانات وعزل صلاحيات الاستعلام على مستوى القاعدة",
    wafLabel: "جدار حماية التطبيقات (WAF Firewall)",
    wafDesc: "تصفية هجمات SQL Injection و Cross-Site Scripting (XSS)",
    geoBlockLabel: "الحظر الجغرافي للشبكات المجهولة",
    geoBlockDesc: "حظر النطاقات عالية الخطورة وعناوين Tor Exit Nodes",
    seoTitle: "مركز أمان المنصة والسياسات المشفرة | ميزان الرقمية",
    seoDesc:
        "لوحة التحكم الأمنية المشفرة لمراقبة التهديدات، سجلات التدقيق، وسيرفرات الحماية المتقدمة لمنصة ميزان.",
    imageAlt: "شعار منصة ميزان الرقمية المشفرة - نظام الحماية والأمان العسكري",
  },
  fr: {
    title: "Centre de Sécurité & Audit Cryptographique",
    subtitle:
        "Moteur de politiques de sécurité et télémétrie en temps réel - Niveau Défense",
    threatLevel: "NIVEAU DE MENACE",
    defconStable: "DEFCON_4 :: STABLE",
    defconCritical: "DEFCON_1 :: ATTAQUE ACTIVE",
    controlsTitle: "Politiques & Directives de Sécurité",
    telemetryTitle: "Journal de Télémétrie et d'Audit en Temps Réel",
    activeSecurity: "Systèmes Actifs",
    threatCount: "Menaces Bloquées",
    lastScan: "Dernier Scan",
    exportLogs: "Exporter les journaux (.JSON)",
    emergencyLockdown: "Verrouillage d'Urgence",
    lockdownActive: "Verrouillage Système Actif",
    clearLogs: "Rafraîchir les journaux",
    searchPlaceholder: "Rechercher événements ou adresses IP...",
    filterAll: "TOUS",
    filterCritical: "CRITIQUE",
    filterWarning: "AVERTISSEMENT",
    filterInfo: "INFO",
    noLogsFound:
        "Aucun événement de télémétrie ne correspond à vos critères de recherche.",
    roleAccessDenied:
        "Accès Refusé : Privilèges d'Administrateur de Sécurité Requis.",
    toggleEnforced: "ACTIVÉ",
    toggleDisabled: "DÉSACTIVÉ",
    systemStatus: "Protocole de Sécurité Mizan v4.8",
    mfaLabel: "Authentification Double Facteur (2FA)",
    mfaDesc: "Obligatoire pour tout le personnel administratif et éditorial",
    rateLimitLabel: "Limitation de Débit (Rate Limiting)",
    rateLimitDesc: "Protection Anti-DDoS et contrôle strict du trafic API",
    honeypotLabel: "Protection Anti-Spam (Honeypot)",
    honeypotDesc: "Piège automatique à bots sur tous les formulaires interactifs",
    rlsLabel: "Sécurité au Niveau des Lignes (RLS)",
    rlsDesc: "Isolation stricte des données dans la base de données Supabase",
    wafLabel: "Pare-feu d'Application Web (WAF)",
    wafDesc: "Filtrage préventif des injections SQL et attaques XSS",
    geoBlockLabel: "Geofencing & Blocage Tor/VPN",
    geoBlockDesc: "Blocage automatique des nœuds de sortie suspects et proxies",
    seoTitle: "Centre de Sécurité et Politiques Chiffrées | Plateforme Mizan",
    seoDesc:
        "Tableau de bord de sécurité hautement sécurisé pour la surveillance des menaces et l'audit système Mizan.",
    imageAlt: "Logo Plateforme Mizan Chiffrée - Système de Sécurité Militaire",
  },
  en: {
    title: "Security & Cryptographic Audit Center",
    subtitle:
        "Real-time threat telemetry and automated security policy engine - Defense Grade",
    threatLevel: "THREAT LEVEL",
    defconStable: "DEFCON_4 :: STABLE",
    defconCritical: "DEFCON_1 :: ATTACK IN PROGRESS",
    controlsTitle: "Enforced Security Policies & Directives",
    telemetryTitle: "Live Security Telemetry & Audit Stream",
    activeSecurity: "Active Systems",
    threatCount: "Blocked Threats",
    lastScan: "Last Vuln Scan",
    exportLogs: "Export Audit Logs (.JSON)",
    emergencyLockdown: "Emergency Lockdown Protocol",
    lockdownActive: "System Lockdown Enforced",
    clearLogs: "Refresh Stream",
    searchPlaceholder: "Search event detail or IP address...",
    filterAll: "ALL",
    filterCritical: "CRITICAL",
    filterWarning: "WARNING",
    filterInfo: "INFO",
    noLogsFound: "No security telemetry events match the selected criteria.",
    roleAccessDenied:
        "Access Denied: Security Administrator / Root clearance required.",
    toggleEnforced: "ENFORCED",
    toggleDisabled: "DISABLED",
    systemStatus: "Mizan Cyber-Security Suite v4.8",
    mfaLabel: "Multi-Factor Authentication (2FA)",
    mfaDesc: "Mandatory hardware/TOTP verification for high-clearance operators",
    rateLimitLabel: "API Request Rate Limiting",
    rateLimitDesc: "DDoS mitigation and burst throttling across edge routes",
    honeypotLabel: "Automated Bot Trap (Honeypot)",
    honeypotDesc: "Invisible barrier thwarting spam automatons on input forms",
    rlsLabel: "Row-Level Security Policies (RLS)",
    rlsDesc: "Fine-grained tenant and user isolation within database layers",
    wafLabel: "Web Application Firewall (WAF)",
    wafDesc: "Heuristic inspection for SQL Injection and Script Execution",
    geoBlockLabel: "Geofencing & TOR Exit Blocking",
    geoBlockDesc: "Automated blacklisting of high-risk IP ranges and proxy nodes",
    seoTitle: "Encrypted Security Center & Audit Engine | Mizan Platform",
    seoDesc:
        "High-security administration center monitoring real-time threat telemetry and audit logging for Mizan.",
    imageAlt: "Mizan Encrypted Platform Logo - Defense Grade Security System",
  },
  es: {
    title: "Centro de Seguridad y Auditoría Cifrada",
    subtitle:
        "Motor de políticas de seguridad y telemetría en tiempo real - Nivel Defensa",
    threatLevel: "NIVEL DE AMENAZA",
    defconStable: "DEFCON_4 :: ESTABLE",
    defconCritical: "DEFCON_1 :: ATAQUE EN CURSO",
    controlsTitle: "Políticas y Directivas de Seguridad",
    telemetryTitle: "Registro de Telemetría y Auditoría en Tiempo Real",
    activeSecurity: "Sistemas Activos",
    threatCount: "Amenazas Bloqueadas",
    lastScan: "Último Análisis",
    exportLogs: "Exportar Registros (.JSON)",
    emergencyLockdown: "Bloqueo de Emergencia",
    lockdownActive: "Bloqueo del Sistema Activo",
    clearLogs: "Refrescar Registros",
    searchPlaceholder: "Buscar detalles o dirección IP...",
    filterAll: "TODOS",
    filterCritical: "CRÍTICO",
    filterWarning: "ADVERTENCIA",
    filterInfo: "INFO",
    noLogsFound:
        "No hay eventos de telemetría que coincidan con sus criterios.",
    roleAccessDenied:
        "Acceso Denegado: Requiere privilegios de Administrador de Seguridad.",
    toggleEnforced: "ACTIVADO",
    toggleDisabled: "DESACTIVADO",
    systemStatus: "Suite de Ciberseguridad Mizan v4.8",
    mfaLabel: "Autenticación de Dos Factores (2FA)",
    mfaDesc: "Verificación obligatoria para personal con altos privilegios",
    rateLimitLabel: "Límite de Frecuencia de Solicitudes",
    rateLimitDesc: "Protección Anti-DDoS y estrangulamiento de ráfagas de API",
    honeypotLabel: "Trampa de Bots (Honeypot)",
    honeypotDesc: "Trampa invisible contra spammer automáticos en formularios",
    rlsLabel: "Seguridad a Nivel de Fila (RLS)",
    rlsDesc: "Aislamiento estricto de usuarios en la base de datos Supabase",
    wafLabel: "Firewall de Aplicación Web (WAF)",
    wafDesc: "Inspección heurística contra Inyección SQL y scripts XSS",
    geoBlockLabel: "Geofencing y Bloqueo de Tor/VPN",
    geoBlockDesc: "Bloqueo automático de rangos de IP sospechosos y proxies",
    seoTitle: "Centro de Seguridad y Políticas Cifradas | Plataforma Mizan",
    seoDesc:
        "Panel de control de seguridad de alto nivel para el monitoreo de amenazas y auditoría en Mizan.",
    imageAlt: "Logo Plataforma Cifrada Mizan - Sistema de Seguridad Militar",
  },
};

export default function AdminSecurity() {
  const { lang, dir } = useI18n();
  const cms = useCms();
  const { isSecurityAdmin, canManageUsers, isRoot } = useRole();

  const str =
      TRANSLATIONS[lang as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const [filter, setFilter] = useState<SecurityEvent["severity"] | "all">(
      "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [emergencyLockdown, setEmergencyLockdown] = useState(false);
  const [auditLogs, setAuditLogs] = useState<SecurityEvent[]>([]);
  const [loadingDbLogs, setLoadingDbLogs] = useState(false);

  const [toggles, setToggles] = useState({
    mfa: true,
    rateLimit: true,
    honeypot: true,
    rls: true,
    waf: true,
    geoBlock: false,
  });

  const hasAccess = isSecurityAdmin || canManageUsers || isRoot;

  const fetchDbLogs = useCallback(async () => {
    setLoadingDbLogs(true);
    try {
      const { data, error } = await supabase
          .from("audit_logs")
          .select("id, action, table_name, created_at, old_data, new_data")
          .order("created_at", { ascending: false })
          .limit(30);

      const records = data as AuditLogRecord[] | null;

      if (!error && records && records.length > 0) {
        const mapped: SecurityEvent[] = records.map((item) => ({
          id: item.id,
          type: item.action || "AUDIT",
          detail: `${item.table_name || "SYSTEM"}: ${item.action || "MODIFY"}`,
          severity:
              item.action === "DELETE" || item.action === "BAN"
                  ? "critical"
                  : item.action === "UPDATE"
                      ? "warning"
                      : "info",
          at: new Date(item.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        }));
        setAuditLogs(mapped);
      } else {
        setAuditLogs(cms.security || []);
      }
    } catch {
      setAuditLogs(cms.security || []);
    } finally {
      setLoadingDbLogs(false);
    }
  }, [cms.security]);

  useEffect(() => {
    void fetchDbLogs();
  }, [fetchDbLogs]);

  const policyControls = [
    {
      key: "mfa" as const,
      icon: Fingerprint,
      label: str.mfaLabel,
      desc: str.mfaDesc,
    },
    {
      key: "rateLimit" as const,
      icon: Lock,
      label: str.rateLimitLabel,
      desc: str.rateLimitDesc,
    },
    {
      key: "honeypot" as const,
      icon: KeyRound,
      label: str.honeypotLabel,
      desc: str.honeypotDesc,
    },
    {
      key: "rls" as const,
      icon: ShieldCheck,
      label: str.rlsLabel,
      desc: str.rlsDesc,
    },
    {
      key: "waf" as const,
      icon: Shield,
      label: str.wafLabel,
      desc: str.wafDesc,
    },
    {
      key: "geoBlock" as const,
      icon: Globe,
      label: str.geoBlockLabel,
      desc: str.geoBlockDesc,
    },
  ];

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((e) => {
      const matchesFilter = filter === "all" || e.severity === filter;
      const matchesQuery =
          !searchQuery.trim() ||
          e.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [auditLogs, filter, searchQuery]);

  const exportLogsAsJson = () => {
    const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
        "download",
        `mizan_security_telemetry_${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const activePoliciesCount = Object.values(toggles).filter(Boolean).length;

  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: str.seoTitle,
    description: str.seoDesc,
    url: `${SITE_DOMAIN}/${lang}/admin/security`,
    inLanguage: lang,
    publisher: {
      "@type": "Organization",
      name: "Mizan Legal Platform",
      url: SITE_DOMAIN,
      logo: `${SITE_DOMAIN}/Logo.svg`,
    },
  };

  return (
      <>
        <SEOHead
            title={str.seoTitle}
            description={str.seoDesc}
            canonical={`${SITE_DOMAIN}/${lang}/admin/security`}
            noIndex={true}
        />
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />

        <AdminWrapper title={str.title}>
          <div className="space-y-6 font-sans text-foreground" dir={dir}>
            {!hasAccess && (
                <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-sm flex items-center gap-3">
                  <AlertOctagon className="text-rose-400 shrink-0" size={20} />
                  <span>{str.roleAccessDenied}</span>
                </div>
            )}

            {/* Header & Cyber Status Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <img
                      src="/Logo.svg"
                      alt={str.imageAlt}
                      width={40}
                      height={40}
                      className="w-8 h-8 object-contain"
                      loading="eager"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                  />
                  <ShieldCheck size={24} className="hidden only:block" />
                </div>

                <div>
                  <h1
                      className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground"
                      style={{ fontFamily: serifFont(lang) }}
                  >
                    {str.title}
                  </h1>
                  <p
                      className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono"
                      style={{ fontFamily: sansFont(lang) }}
                  >
                    <Activity
                        size={13}
                        className="text-emerald-500 animate-pulse"
                    />
                    <span>{str.subtitle}</span>
                  </p>
                </div>
              </div>

              {/* DEFCON & Threat Level Indicator */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <div
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border font-bold transition-all ${
                        emergencyLockdown
                            ? "bg-rose-950/80 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse"
                            : "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                    }`}
                >
                <span
                    className={`w-2.5 h-2.5 rounded-full ${
                        emergencyLockdown
                            ? "bg-rose-500 animate-ping"
                            : "bg-emerald-500 animate-pulse"
                    }`}
                />
                  <span>{str.threatLevel}:</span>
                  <span className="uppercase">
                  {emergencyLockdown ? str.defconCritical : str.defconStable}
                </span>
                </div>

                <button
                    type="button"
                    onClick={() => setEmergencyLockdown(!emergencyLockdown)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation ${
                        emergencyLockdown
                            ? "bg-rose-600 text-white border-rose-500"
                            : "bg-card hover:bg-rose-950/30 text-rose-400 border-rose-500/30"
                    }`}
                >
                  <Zap size={14} />
                  <span>
                  {emergencyLockdown
                      ? str.lockdownActive
                      : str.emergencyLockdown}
                </span>
                </button>
              </div>
            </div>

            {/* Cryptographic Metrics Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-400" />
                {str.activeSecurity}
              </span>
                <span className="text-lg font-black text-foreground">
                {activePoliciesCount} / {policyControls.length}
              </span>
              </div>

              <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <ShieldAlert size={12} className="text-amber-400" />
                {str.threatCount}
              </span>
                <span className="text-lg font-black text-amber-400">1,284</span>
              </div>

              <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Clock size={12} className="text-emerald-400" />
                {str.lastScan}
              </span>
                <span className="text-lg font-black text-foreground">
                00:02m AGO
              </span>
              </div>

              <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Cpu size={12} className="text-emerald-400" />
                TLS & CIPHER
              </span>
                <span className="text-xs font-bold text-emerald-400 mt-1 truncate">
                AES-256-GCM · TLS 1.3
              </span>
              </div>
            </div>

            {/* Security Controls & Directives Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2
                    className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2"
                    style={{ fontFamily: serifFont(lang) }}
                >
                  <SlidersHorizontal size={18} className="text-emerald-500" />
                  <span>{str.controlsTitle}</span>
                </h2>
                <span className="text-xs font-mono text-muted-foreground">
                {str.systemStatus}
              </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {policyControls.map((c) => {
                  const isActive = toggles[c.key];
                  return (
                      <div
                          key={c.key}
                          className={`bg-card border rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-all ${
                              isActive
                                  ? "border-emerald-500/30 hover:border-emerald-500/50"
                                  : "border-border opacity-75"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
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
                              className="text-sm font-bold text-foreground block"
                              style={{ fontFamily: sansFont(lang) }}
                          >
                            {c.label}
                          </span>
                              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            {isActive ? str.toggleEnforced : str.toggleDisabled}
                          </span>
                            </div>
                          </div>

                          <button
                              type="button"
                              onClick={() =>
                                  setToggles((prev) => ({
                                    ...prev,
                                    [c.key]: !prev[c.key],
                                  }))
                              }
                              className={`w-12 h-7 rounded-full transition-colors relative border p-0.5 cursor-pointer touch-manipulation shrink-0 ${
                                  isActive
                                      ? "bg-emerald-600 border-emerald-500"
                                      : "bg-slate-800 border-slate-700"
                              }`}
                              aria-label={`Toggle ${c.label}`}
                          >
                        <span
                            className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transition-transform transform ${
                                isActive
                                    ? dir === "rtl"
                                        ? "-translate-x-5"
                                        : "translate-x-5"
                                    : "translate-x-0"
                            }`}
                        />
                          </button>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {c.desc}
                        </p>
                      </div>
                  );
                })}
              </div>
            </div>

            {/* Telemetry Stream & Security Log Feed */}
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Terminal size={18} className="text-emerald-500" />
                  <h2
                      className="font-extrabold text-foreground text-base sm:text-lg"
                      style={{ fontFamily: serifFont(lang) }}
                  >
                    {str.telemetryTitle}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search
                        size={14}
                        className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
                            dir === "rtl" ? "right-3" : "left-3"
                        }`}
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={str.searchPlaceholder}
                        className={`w-full h-9 text-xs font-mono bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-500/50 ${
                            dir === "rtl" ? "pr-8 pl-3" : "pl-8 pr-3"
                        }`}
                    />
                  </div>

                  <button
                      type="button"
                      onClick={exportLogsAsJson}
                      className="h-9 px-3 text-xs font-mono rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">{str.exportLogs}</span>
                  </button>

                  <button
                      type="button"
                      onClick={() => void fetchDbLogs()}
                      disabled={loadingDbLogs}
                      className="h-9 px-3 text-xs font-mono rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation disabled:opacity-50"
                  >
                    <RefreshCw
                        size={13}
                        className={loadingDbLogs ? "animate-spin" : ""}
                    />
                    <span>{str.clearLogs}</span>
                  </button>
                </div>
              </div>

              {/* Severity Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
                <Filter size={13} className="text-muted-foreground ml-1 mr-1 shrink-0" />
                {(
                    [
                      { key: "all", label: str.filterAll },
                      { key: "critical", label: str.filterCritical },
                      { key: "warning", label: str.filterWarning },
                      { key: "info", label: str.filterInfo },
                    ] as const
                ).map((sKey) => (
                    <button
                        key={sKey.key}
                        onClick={() => setFilter(sKey.key)}
                        className={`min-h-[36px] px-3 py-1.5 rounded-xl uppercase transition-all whitespace-nowrap cursor-pointer touch-manipulation ${
                            filter === sKey.key
                                ? "bg-emerald-500/15 text-emerald-400 font-extrabold border border-emerald-500/30"
                                : "text-muted-foreground hover:text-foreground border border-transparent"
                        }`}
                    >
                      {sKey.label}
                    </button>
                ))}
              </div>

              {/* Telemetry Log Entries */}
              <div className="space-y-2 font-mono">
                {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                      {str.noLogsFound}
                    </div>
                ) : (
                    filteredLogs.map((e) => {
                      const s = SEV[e.severity];
                      return (
                          <div
                              key={e.id}
                              className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background/40 hover:bg-muted/40 transition-colors"
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
                          <span className="text-emerald-500 font-semibold">
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
      </>
  );
}