import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Lock, Mail, User, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "ar" | "fr" | "en" | "es";
  dir: "rtl" | "ltr";
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

  // Ensure portal target exists on client-side render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (password.length < 6) {
        setErrorMessage(
          lang === "ar"
            ? "كلمة المرور يجب أن تتكون من 6 رموز على الأقل."
            : "Password must be at least 6 characters."
        );
      } else {
        setSuccessMessage(
          lang === "ar"
            ? "تم تسجيل الدخول بنجاح! جاري التوجيه..."
            : "Authentication successful! Redirecting..."
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    }, 1200);
  };

  const inputPaddingClass = dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3";
  const iconPositionClass = dir === "rtl" ? "right-3" : "left-3";

  // 🌟 createPortal mounts the modal directly to document.body, escaping NavigationMenu / Menubar wrappers
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      dir={dir}
      onClick={onClose}
    >
      {/* SOLID OPAQUE CONTAINER */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 md:p-8 shadow-2xl space-y-6 opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (X) Button */}
        <button
          onClick={onClose}
          type="button"
          className={`absolute top-4 ${
            dir === "rtl" ? "left-4" : "right-4"
          } p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center font-bold text-xl">
            ⚖️
          </div>
          <h2
            className="text-xl font-extrabold text-slate-900 dark:text-white"
            style={{ fontFamily: lang === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)" }}
          >
            {isRegister
              ? lang === "ar"
                ? "إنشاء حساب أكاديمي جديد"
                : "Create Academic Account"
              : lang === "ar"
              ? "تسجيل الدخول للمنصة"
              : "Sign In to Mizan"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === "ar"
              ? "الوصول المباشر للأرشيف القانوني والأبحاث الأكاديمية"
              : "Access independent legal archives & judicial precedents"}
          </p>
        </div>

        {/* Feedback Alerts */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === "ar" ? "اسم المستخدم / الصفة الأكاديمية" : "Full Name / Title"}
              </label>
              <div className="relative">
                <User
                  size={15}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${iconPositionClass}`}
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={lang === "ar" ? "د. أحمد المنصوري" : "Dr. Ahmed Al-Mansouri"}
                  className={`w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none ${inputPaddingClass}`}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {lang === "ar" ? "البريد الإلكتروني" : "Email Address"}
            </label>
            <div className="relative">
              <Mail
                size={15}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${iconPositionClass}`}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@university.edu"
                className={`w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none ${inputPaddingClass}`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {lang === "ar" ? "كلمة المرور" : "Password"}
            </label>
            <div className="relative">
              <Lock
                size={15}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${iconPositionClass}`}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none ${inputPaddingClass}`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            <span>
              {isRegister
                ? lang === "ar"
                  ? "تسجيل الحساب"
                  : "Create Account"
                : lang === "ar"
                ? "تسجيل الدخول"
                : "Sign In"}
            </span>
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMessage(null);
            }}
            className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
          >
            {isRegister
              ? lang === "ar"
                ? "لديك حساب بالفعل؟ سجل دخولك"
                : "Already have an account? Sign In"
              : lang === "ar"
              ? "ليس لديك حساب؟ أنشئ حساباً جديداً"
              : "Need an account? Register"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};