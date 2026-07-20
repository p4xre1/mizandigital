import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Lock, Mail, User, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

export type Lang = "ar" | "fr" | "en" | "es";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  dir: "rtl" | "ltr";
}

const LABELS = {
  titleRegister: {
    ar: "إنشاء حساب أكاديمي جديد",
    fr: "Créer un compte académique",
    en: "Create Academic Account",
    es: "Crear una cuenta académica",
  },
  titleLogin: {
    ar: "تسجيل الدخول للمنصة",
    fr: "Connexion à la plateforme",
    en: "Sign In to Mizan",
    es: "Iniciar sesión en Mizan",
  },
  subtitle: {
    ar: "الوصول المباشر للأرشيف القانوني والأبحاث الأكاديمية",
    fr: "Accès direct aux archives juridiques et travaux académiques",
    en: "Access independent legal archives & judicial precedents",
    es: "Acceso directo a archivos jurídicos e investigaciones académicas",
  },
  nameLabel: {
    ar: "اسم المستخدم / الصفة الأكاديمية",
    fr: "Nom complet / Titre académique",
    en: "Full Name / Title",
    es: "Nombre completo / Título",
  },
  namePlaceholder: {
    ar: "الاسم الكامل",
    fr: "Nom complet",
    en: "Full Name",
    es: "Nombre completo",
  },
  emailLabel: {
    ar: "البريد الإلكتروني",
    fr: "Adresse e-mail",
    en: "Email Address",
    es: "Correo electrónico",
  },
  passwordLabel: {
    ar: "كلمة المرور",
    fr: "Mot de passe",
    en: "Password",
    es: "Contraseña",
  },
  btnRegister: {
    ar: "تسجيل الحساب",
    fr: "S'inscrire",
    en: "Create Account",
    es: "Crear cuenta",
  },
  btnLogin: {
    ar: "تسجيل الدخول",
    fr: "Se connecter",
    en: "Sign In",
    es: "Iniciar sesión",
  },
  toggleToLogin: {
    ar: "لديك حساب بالفعل؟ سجل دخولك",
    fr: "Vous avez déjà un compte ? Connectez-vous",
    en: "Already have an account? Sign In",
    es: "¿Ya tienes una cuenta? Inicia sesión",
  },
  toggleToRegister: {
    ar: "ليس لديك حساب؟ أنشئ حساباً جديداً",
    fr: "Pas de compte ? S'inscrire",
    en: "Need an account? Register",
    es: "¿No tienes una cuenta? Regístrate",
  },
  errPasswordShort: {
    ar: "كلمة المرور يجب أن تتكون من 6 رموز على الأقل.",
    fr: "Le mot de passe doit contenir au moins 6 caractères.",
    en: "Password must be at least 6 characters.",
    es: "La contraseña debe tener al menos 6 caracteres.",
  },
  successAuth: {
    ar: "تم تسجيل الدخول بنجاح! جاري التوجيه...",
    fr: "Connexion réussie ! Redirection...",
    en: "Authentication successful! Redirecting...",
    es: "¡Autenticación exitosa! Redirigiendo...",
  },
  closeLabel: {
    ar: "إغلاق النافذة",
    fr: "Fermer la fenêtre",
    en: "Close modal",
    es: "Cerrar ventana",
  },
} as const;

function getLabel(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key][lang] || LABELS[key].en;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, lang, dir }) => {
  const [mounted, setMounted] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Client-side hydration safety check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll safely and bind Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    timerRef.current = setTimeout(() => {
      setLoading(false);
      if (password.length < 6) {
        setErrorMessage(getLabel("errPasswordShort", lang));
      } else {
        setSuccessMessage(getLabel("successAuth", lang));
        timerRef.current = setTimeout(() => {
          onClose();
        }, 1200);
      }
    }, 1200);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      dir={dir}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* OPAQUE MODAL CARD */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 md:p-8 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (X) Button (Using native `end-4` for direction awareness) */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 end-4 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label={getLabel("closeLabel", lang)}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center font-bold text-xl select-none"
            aria-hidden="true"
          >
            ⚖️
          </div>
          <h2
            id="auth-modal-title"
            className="text-xl font-extrabold text-slate-900 dark:text-white"
            style={{
              fontFamily:
                lang === "ar"
                  ? "var(--font-serif-ar)"
                  : "var(--font-serif-en)",
            }}
          >
            {getLabel(isRegister ? "titleRegister" : "titleLogin", lang)}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {getLabel("subtitle", lang)}
          </p>
        </div>

        {/* Live Region for Screen Readers & Feedback Alerts */}
        <div aria-live="polite" className="space-y-2">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {getLabel("nameLabel", lang)}
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute top-1/2 -translate-y-1/2 text-slate-400 start-3 pointer-events-none"
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={getLabel("namePlaceholder", lang)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2.5 ps-9 pe-3 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {getLabel("emailLabel", lang)}
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute top-1/2 -translate-y-1/2 text-slate-400 start-3 pointer-events-none"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2.5 ps-9 pe-3 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {getLabel("passwordLabel", lang)}
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute top-1/2 -translate-y-1/2 text-slate-400 start-3 pointer-events-none"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2.5 ps-9 pe-3 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            <span>
              {getLabel(isRegister ? "btnRegister" : "btnLogin", lang)}
            </span>
          </button>
        </form>

        {/* Toggle Login/Register Mode */}
        <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMessage(null);
            }}
            className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 rounded px-1"
          >
            {getLabel(
              isRegister ? "toggleToLogin" : "toggleToRegister",
              lang
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};