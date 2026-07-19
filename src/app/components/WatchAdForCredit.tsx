import { useEffect, useState } from "react";
import { PlayCircle, Loader2 } from "lucide-react";
import { addBonusCredits } from "../lib/credits";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface WatchAdForCreditProps {
  onCreditAdded?: (credits: { daily_credits: number; bonus_credits: number; total: number }) => void;
}

export default function WatchAdForCredit({ onCreditAdded }: WatchAdForCreditProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [watchedAdsCount, setWatchedAdsCount] = useState(0);

  useEffect(() => {
    async function loadUser() {
      if (!isSupabaseConfigured) return;
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    }
    void loadUser();
  }, []);

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

  useEffect(() => {
    if (!completed || !userId) return;

    async function handleAdCompletion() {
      setCompleted(false);
      setProgress(0);

      if (watchedAdsCount + 1 < 2) {
        setWatchedAdsCount((count) => count + 1);
        setMessage("1/2 Ads Watched. Watch 1 more ad to unlock your credit!");
        return;
      }

      setWatchedAdsCount(0);
      setLoading(true);
      try {
        const updated = await addBonusCredits(userId, 1);
        onCreditAdded?.(updated);
        setMessage("Success! You have earned 1 Tool Credit.");
      } catch (err: unknown) {
        setMessage(err instanceof Error ? err.message : "فشل إضافة النقاط.");
      } finally {
        setLoading(false);
      }
    }

    void handleAdCompletion();
  }, [completed, onCreditAdded, userId, watchedAdsCount]);

  const handleStart = () => {
    if (!userId) {
      setMessage("يرجى تسجيل الدخول أولاً للحصول على نقاط إضافية.");
      return;
    }
    setMessage("");
    setProgress(0);
    setCompleted(false);
    setPlaying(true);
  };

  const handleReset = () => {
    setPlaying(false);
    setProgress(0);
    setCompleted(false);
    setMessage("");
    setWatchedAdsCount(0);
  };

  return (
    <div className="border border-border rounded-2xl p-6 bg-surface shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <PlayCircle className="w-7 h-7 text-primary" />
        <div>
          <p className="text-sm font-semibold">Watch a short video ad to earn 1 temporary tool credit</p>
          <p className="text-xs text-muted-foreground">This reward requires 2 ads watched consecutively to award credit.</p>
        </div>
      </div>

      <div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {playing
            ? `Playing ad… ${progress}%`
            : watchedAdsCount === 1
            ? "1/2 Ads Watched. Watch 1 more ad to unlock your credit!"
            : completed
            ? "Ad finished. Processing..."
            : "Ready to watch."
          }
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleStart}
          disabled={playing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-white text-sm font-semibold hover:bg-primary/90 transition"
        >
          {playing ? "Loading…" : "Watch Ad"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition"
        >
          Reset
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Processing credit...
        </div>
      )}

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.startsWith("Success") ? "bg-green-50 border border-green-200 text-green-800" : "bg-yellow-50 border border-yellow-200 text-yellow-800"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
