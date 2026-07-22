import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Lock, Fingerprint, KeyRound } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms, type SecurityEvent } from "../../lib/adminStore";

const SEV: Record<SecurityEvent["severity"], { icon: typeof ShieldCheck; cls: string }> = {
  info: { icon: ShieldCheck, cls: "text-green-600 bg-green-50" },
  warning: { icon: ShieldAlert, cls: "text-amber-600 bg-amber-50" },
  critical: { icon: ShieldX, cls: "text-red-600 bg-red-50" },
};

export default function AdminSecurity() {
  const { lang, dir, t } = useI18n();
  const cms = useCms();
  const [toggles, setToggles] = useState({ mfa: true, rateLimit: true, honeypot: true, rls: true });

  const controls = [
    { key: "mfa" as const, icon: Fingerprint, label: { ar: "المصادقة الثنائية (2FA)", fr: "Authentification 2FA", en: "Two-Factor Auth (2FA)", es: "Autenticación 2FA" } },
    { key: "rateLimit" as const, icon: Lock, label: { ar: "تحديد معدل الطلبات", fr: "Limitation de débit", en: "Request Rate Limiting", es: "Límite de solicitudes" } },
    { key: "honeypot" as const, icon: KeyRound, label: { ar: "حماية النماذج من الرسائل المزعجة", fr: "Anti-spam (honeypot)", en: "Form Anti-Spam (honeypot)", es: "Anti-spam de formularios" } },
    { key: "rls" as const, icon: ShieldCheck, label: { ar: "أمان مستوى الصف (RLS)", fr: "Sécurité niveau ligne (RLS)", en: "Row-Level Security (RLS)", es: "Seguridad a nivel de fila (RLS)" } },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: serifFont(lang) }}>{t("admin_security")}</h1>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {controls.map(c => (
          <div key={c.key} className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-primary"><c.icon size={18} /></div>
              <span className="text-sm font-semibold text-foreground" style={{ fontFamily: sansFont(lang) }}>{c.label[lang]}</span>
            </div>
            <button onClick={() => setToggles(prev => ({ ...prev, [c.key]: !prev[c.key] }))}
              className={`w-11 h-6 rounded-full transition-colors relative ${toggles[c.key] ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                toggles[c.key] ? (dir === "rtl" ? "left-0.5" : "right-0.5") : (dir === "rtl" ? "right-0.5" : "left-0.5")
              }`} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-bold text-foreground mb-4" style={{ fontFamily: serifFont(lang) }}>Security log</h2>
        <div className="space-y-3">
          {cms.security.map(e => {
            const s = SEV[e.severity];
            return (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.cls}`}><s.icon size={15} /></div>
                <div className="min-w-0">
                  <div className="text-sm text-foreground" style={{ fontFamily: sansFont(lang) }}>{e.detail}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">{e.type} · {e.at}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
