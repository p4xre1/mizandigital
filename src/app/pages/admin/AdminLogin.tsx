import { useState } from "react";
import { Scale, Lock, User, AlertCircle } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { adminLogin } from "../../lib/adminAuth";
import { throttle } from "../../lib/security";

export default function AdminLogin() {
  const { lang, dir, t } = useI18n();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const wait = throttle("admin_login", 4000);
    if (wait) { setError(`⏳ ${wait}s`); return; }
    if (!adminLogin(user, pass)) {
      setError(lang === "ar" ? "اسم المستخدم أو كلمة المرور غير صحيحة." :
        lang === "fr" ? "Identifiant ou mot de passe incorrect." :
        lang === "es" ? "Usuario o contraseña incorrectos." :
        "Invalid username or password.");
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-3"><Scale size={22} className="text-primary-foreground" /></div>
          <h1 className="font-bold text-foreground text-lg" style={{ fontFamily: serifFont(lang) }}>{t("admin_panel")}</h1>
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: sansFont(lang) }}>MIZAN LEGAL ARCHIVE</p>
        </div>

        <form onSubmit={submit} className="space-y-3" style={{ fontFamily: sansFont(lang) }}>
          <div className="relative">
            <User size={15} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${dir === "rtl" ? "right-3" : "left-3"}`} />
            <input value={user} onChange={e => setUser(e.target.value)} placeholder="Username" autoComplete="username" maxLength={64}
              className={`w-full py-2.5 text-sm border border-border rounded-lg bg-input-background outline-none focus:border-primary ${dir === "rtl" ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"}`} />
          </div>
          <div className="relative">
            <Lock size={15} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${dir === "rtl" ? "right-3" : "left-3"}`} />
            <input value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="Password" autoComplete="current-password" maxLength={128}
              className={`w-full py-2.5 text-sm border border-border rounded-lg bg-input-background outline-none focus:border-primary ${dir === "rtl" ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"}`} />
          </div>
          {error && <p className="text-xs text-destructive flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
          <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            {t("login")}
          </button>
        </form>
      </div>
    </div>
  );
}
