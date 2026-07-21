import { useEffect, useState, useCallback } from "react";
import { PlayCircle, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { addBonusCredits } from "../lib/credits";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useI18n, sansFont, serifFont, type Lang } from "../lib/i18n";

// Multilingual helper type
type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({ ar, fr, en, es });

// Translations
const txt = {
  title: t4(
    "شاهد إعلاناً قصيراً للحصول على رصيد إضافي",
    "Regardez une courte publicité pour gagner 1 crédit supplémentaire",
    "Watch a short video ad to earn 1 temporary tool credit",
    "Vea un anuncio corto para ganar 1 crédito temporal"
  ),
  subtitle: t4(
    "تتطلب هذه المكافأة مشاهدة إعلانين متتاليين للحصول على الرصيد.",
    "Cette récompense nécessite de visionner 2 publicités consécutives.",
    "This reward requires 2 ads watched consecutively to award credit.",
    "Esta recompensa requiere ver 2 anuncios consecutivos para otorgar el crédito."
  ),
  playingAd: t4("جاري عرض الإعلان...", "Lecture de l'annonce...", "Playing ad...", "Reproduciendo anuncio..."),
  adsWatchedHalf: t4(
    "تمت مشاهدة 1/2 إعلانات. شاهد إعلاناً آخر للحصول على الرصيد!",
    "1/2 publicité vue. Regardez-en 1 de plus pour débloquer votre crédit !",
    "1/2 Ads Watched. Watch 1 more ad to unlock your credit!",
    "1/2 Anuncios vistos. ¡Vea 1 anuncio más para desbloquear su crédito!"
  ),
  adFinished: t4("انتهى الإعلان. جاري المعالجة...", "Annonce terminée. Traitement...", "Ad finished. Processing...", "Anuncio finalizado. Procesando..."),
  readyToWatch: t4("جاهز للمشاهدة.", "Prêt à visionner.", "Ready to watch.", "Listo para ver."),
  watchBtn: t4("مشاهدة الإعلان", "Regarder l'annonce", "Watch Ad", "Ver anuncio"),
  loadingBtn: t4("جاري التحميل...", "Chargement...", "Loading…", "Cargando..."),
  resetBtn: t4("إعادة ضبط", "Réinitialiser", "Reset", "Restablecer"),
  loginRequired: t4(
    "يرجى تسجيل الدخول أولاً للحصول على نقاط إضافية.",
    "Veuillez vous connecter d'abord pour obtenir des crédits bonus.",
    "Please log in first to earn bonus credits.",
    "Por favor, inicie sesión primero para obtener créditos de bonificación."
  ),
  success: t4(
    "نجاح! لقد حصلت على رصيد أداة إضافي.",
    "Succès ! Vous avez gagné 1 crédit d'outil.",
    "Success! You have earned 1 Tool Credit.",
    "¡Éxito! Ha ganado 1 crédito de herramienta."
  ),
  errorFallback: t4("فشل إضافة النقاط.", "Échec de l'ajout des crédits.", "Failed to add credits.", "Error al agregar créditos."),
  processingCredit: t4("جاري إضافة الرصيد...", "Traitement du crédit...", "Processing credit...", "Procesando crédito..."),
};

interface WatchAdForCreditProps {
  onCreditAdded?: (credits: { daily_credits: number; bonus_credits: number; total: number }) => void;
}

export default function WatchAdForCredit({ onCreditAdded }: WatchAdForCreditProps) {
  const { lang, dir } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ text: string; isSuccess?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [watchedAdsCount, setWatchedAdsCount] = useState(0);

  // Load authenticated user ID
  useEffect(() => {
    async function loadUser() {
      if (!isSupabaseConfigured) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id ?? null);
      } catch (error) {
        console.error("Failed to load user for ad credits:", error);
      }
    }
    void loadUser();
  }, []);

  // Simulate video playback progress
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        const next = Math.min(100, value + 10);
        if (next >= 100) {
          window.clearInterval(timer);
          setPlaying(false);
          setCompleted(true);
        }
        return next;
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [playing]);

  // Handle ad completion and credit awarding
  const processAdCompletion = useCallback(async (activeUserId: string) => {
    setCompleted(false);
    setProgress(0);

    if (watchedAdsCount + 1 < 2) {
      setWatchedAdsCount((count) => count + 1);
      setMessage({ text: txt.adsWatchedHalf[lang], isSuccess: false });
      return;
    }

    setWatchedAdsCount(0);
    setLoading(true);
    try {
      const updated = await addBonusCredits(activeUserId, 1);
      onCreditAdded?.(updated);
      setMessage({ text: txt.success[lang], isSuccess: true });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : txt.errorFallback[lang],
        isSuccess: false,
      });
    } finally {
      setLoading(false);
    }
  }, [watchedAdsCount, lang, onCreditAdded]);

  useEffect(() => {
    if (completed && userId) {
      void processAdCompletion(userId);
    }
  }, [completed, userId, processAdCompletion]);

  const handleStart = () => {
    if (!userId) {
      setMessage({ text: txt.loginRequired[lang], isSuccess: false });
      return;
    }
    setMessage(null);
    setProgress(0);
    setCompleted(false);
    setPlaying(true);
  };

  const handleReset = () => {
    setPlaying(false);
    setProgress(0);
    setCompleted(false);
    setMessage(null);
    setWatchedAdsCount(0);
  };

  return (
    <div 
      className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 bg-white dark:bg-slate-900 shadow-xs space-y-4 transition-colors"
      dir={dir}
    >
      {/* Header Info */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
          <PlayCircle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100" style={{ fontFamily: serifFont(lang) }}>
            {txt.title[lang]}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed" style={{ fontFamily: sansFont(lang) }}>
            {txt.subtitle[lang]}
          </p>
        </div>
      </div>

      {/* Progress Bar & Status Text */}
      <div className="space-y-1.5">
        <div 
          className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden" 
          role="progressbar" 
          aria-valuenow={progress} 
          aria-valuemin={0} 
          aria-valuemax={100}
        >
          <div 
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400" style={{ fontFamily: sansFont(lang) }}>
          {playing
            ? `${txt.playingAd[lang]} ${progress}%`
            : watchedAdsCount === 1
            ? txt.adsWatchedHalf[lang]
            : completed
            ? txt.adFinished[lang]
            : txt.readyToWatch[lang]
          }
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleStart}
          disabled={playing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 transition-all touch-manipulation min-h-[42px] cursor-pointer shadow-xs"
          style={{ fontFamily: sansFont(lang) }}
        >
          {playing && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
          <span>{playing ? txt.loadingBtn[lang] : txt.watchBtn[lang]}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={playing || loading}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4 py-2.5 transition-all touch-manipulation min-h-[42px] cursor-pointer"
          style={{ fontFamily: sansFont(lang) }}
        >
          {txt.resetBtn[lang]}
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 pt-1" style={{ fontFamily: sansFont(lang) }}>
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{txt.processingCredit[lang]}</span>
        </div>
      )}

      {/* Feedback Message Banner */}
      {message && (
        <div
          aria-live="polite"
          className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs font-medium border transition-colors ${
            message.isSuccess
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
              : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300"
          }`}
          style={{ fontFamily: sansFont(lang) }}
        >
          {message.isSuccess ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}