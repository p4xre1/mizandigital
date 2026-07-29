import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { trackAuthEvent } from "@/lib/analytics";

export type Lang = "ar" | "fr" | "en" | "es";
export type TabType = "login" | "signup" | "forgot" | "reset";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  dir: "rtl" | "ltr";
  /** Optional initial tab override */
  initialTab?: TabType;
  /** Optional callback triggered on success */
  onSuccess?: () => void;
}

const TITLE_LABELS: Record<TabType, Record<Lang, string>> = {
  login: {
    ar: "تسجيل الدخول للمنصة",
    fr: "Connexion à la plateforme",
    en: "Sign In to Mizan",
    es: "Iniciar sesión en Mizan",
  },
  signup: {
    ar: "إنشاء حساب جديد",
    fr: "Créer un compte",
    en: "Create an Account",
    es: "Crear una cuenta",
  },
  forgot: {
    ar: "استعادة كلمة المرور",
    fr: "Mot de passe oublié",
    en: "Reset Password",
    es: "Restablecer contraseña",
  },
  reset: {
    ar: "تعيين كلمة المرور الجديدة",
    fr: "Définir un nouveau mot de passe",
    en: "Set New Password",
    es: "Establecer nueva contraseña",
  },
};

const SUBTITLE_LABELS: Record<TabType, Record<Lang, string>> = {
  login: {
    ar: "الوصول المباشر للأرشيف القانوني والأبحاث الأكاديمية",
    fr: "Accès direct aux archives juridiques et travaux académiques",
    en: "Access independent legal archives & judicial precedents",
    es: "Acceso directo a archivos jurídicos e investigaciones académicas",
  },
  signup: {
    ar: "أنشئ حسابك للوصول إلى كافة الميزات والمحتوى القانوني",
    fr: "Créez votre compte pour accéder à toutes les fonctionnalités",
    en: "Create your account to unlock full access to legal research",
    es: "Crea tu cuenta para acceder a todo el contenido legal",
  },
  forgot: {
    ar: "أدخل بريدك الإلكتروني لتلقي رابط إعادة ضبط كلمة المرور",
    fr: "Entrez votre e-mail pour recevoir un lien de réinitialisation",
    en: "Enter your email to receive a password reset link",
    es: "Ingresa tu correo para recibir un enlace de restablecimiento",
  },
  reset: {
    ar: "أدخل كلمة المرور الجديدة لحسابك لإنهاء عملية الاستعادة",
    fr: "Entrez votre nouveau mot de passe pour finaliser la réinitialisation",
    en: "Enter your new password to complete the recovery process",
    es: "Ingresa tu nueva contraseña para completar la recuperación",
  },
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  dir,
  initialTab = "login",
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [globalError, setGlobalError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep onCloseRef current
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // SSR Hydration check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset tab and notification states when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setGlobalError("");
      setGlobalSuccess("");
    }
  }, [isOpen, initialTab]);

  // Lock body scroll, manage keyboard events, and focus management
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus the modal container for accessibility
    setTimeout(() => {
      modalRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  // Centralized Tab Switch Handler that clears feedback banners
  const handleSwitchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setGlobalError("");
    setGlobalSuccess("");
  }, []);

  const handleAuthSuccess = useCallback(() => {
    // 📊 Track Authentication Event
    if (activeTab === "login" || activeTab === "signup") {
      trackAuthEvent("email", activeTab);
    } else if (activeTab === "forgot" || activeTab === "reset") {
      trackAuthEvent("email", activeTab);
    }

    if (onSuccess) onSuccess();

    timerRef.current = setTimeout(() => {
      onCloseRef.current();
    }, 1200);
  }, [activeTab, onSuccess]);

  if (!isOpen || !mounted) return null;

  const currentLang = (lang in TITLE_LABELS.login ? lang : "en") as Lang;
  const modalTitle = TITLE_LABELS[activeTab]?.[currentLang] || TITLE_LABELS[activeTab]?.en;
  const modalSubtitle = SUBTITLE_LABELS[activeTab]?.[currentLang] || SUBTITLE_LABELS[activeTab]?.en;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      dir={dir}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      aria-describedby="auth-modal-subtitle"
    >
      {/* OPAQUE MODAL CARD */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 ease-out focus:outline-none"
      >
        {/* Close (X) Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 end-4 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center font-bold text-xl select-none"
            aria-hidden="true"
          >
            ⚖️
          </div>
          <h2
            id="auth-modal-title"
            className="text-xl font-extrabold text-slate-900 dark:text-white"
          >
            {modalTitle}
          </h2>
          <p
            id="auth-modal-subtitle"
            className="text-xs text-slate-500 dark:text-slate-400"
          >
            {modalSubtitle}
          </p>
        </div>

        {/* Feedback Alerts */}
        <div aria-live="polite" className="space-y-2">
          {globalError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {globalSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{globalSuccess}</span>
            </div>
          )}
        </div>

        {/* Active Auth Form Sub-Component */}
        {activeTab === "login" && (
          <LoginForm
            onSwitchTab={handleSwitchTab}
            onSuccess={handleAuthSuccess}
            setGlobalError={setGlobalError}
            setGlobalSuccess={setGlobalSuccess}
          />
        )}

        {activeTab === "signup" && (
          <SignupForm
            onSwitchTab={handleSwitchTab}
            setGlobalError={setGlobalError}
            setGlobalSuccess={setGlobalSuccess}
          />
        )}

        {activeTab === "forgot" && (
          <ForgotPasswordForm
            onSwitchTab={handleSwitchTab}
            setGlobalError={setGlobalError}
            setGlobalSuccess={setGlobalSuccess}
          />
        )}

        {activeTab === "reset" && (
          <ResetPasswordForm
            onSuccessReset={handleAuthSuccess}
            setGlobalError={setGlobalError}
            setGlobalSuccess={setGlobalSuccess}
          />
        )}
      </div>
    </div>,
    document.body
  );
};

export default AuthModal;