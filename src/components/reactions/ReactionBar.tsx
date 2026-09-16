import { useEffect, useState } from "react";
import { fetchReactions, toggleReaction, REACTION_META, type ReactionType, type TargetType, type ReactionSummary } from "@/lib/reactions/service";
import { useUser } from "@clerk/clerk-react";
import { isClerkEnabled } from "@/lib/clerk/config";

interface Props {
  targetType: TargetType;
  targetId: string;
  className?: string;
  allowed?: ReactionType[];
}

export function ReactionBar({ targetType, targetId, className, allowed = ["like", "helpful", "bookmark", "fire", "insightful"] }: Props) {
  const [summary, setSummary] = useState<ReactionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<ReactionType | null>(null);
  const [myReactions, setMyReactions] = useState<Set<ReactionType>>(new Set());

  // useUser() تُنادى دائماً (حتى لا نخالف قواعد hooks) لكن داخل try/catch:
  // بدون <ClerkProvider> ترمي Clerk خطأ، فنبتلعه ونكمل كمستخدم مجهول.
  // النتيجة لا تُستعمل إلا إذا كان Clerk مفعلاً فعلاً (isClerkEnabled).
  let clerkUserId: string | null = null;
  try {
    const { user } = useUser();
    if (isClerkEnabled) clerkUserId = user?.id || null;
  } catch {
    // Clerk not mounted — نتصرف كمستخدم مجهول بدل رمي خطأ
    clerkUserId = null;
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchReactions(targetType, targetId)
      .then((data) => {
        if (mounted) setSummary(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [targetType, targetId]);

  const handleToggle = async (type: ReactionType) => {
    if (busy) return;
    setBusy(type);
    try {
      const result = await toggleReaction(targetType, targetId, type, clerkUserId);
      setSummary(result.summary);
      setMyReactions((prev) => {
        const next = new Set(prev);
        if (result.action === "added") next.add(type);
        else next.delete(type);
        return next;
      });
    } finally {
      setBusy(null);
    }
  };

  const getCount = (type: ReactionType) => summary.find((s) => s.reaction_type === type)?.count || 0;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`} dir="rtl">
      {allowed.map((type) => {
        const meta = REACTION_META[type];
        const count = getCount(type);
        const active = myReactions.has(type);
        const isBusy = busy === type;

        return (
          <button
            key={type}
            type="button"
            onClick={() => handleToggle(type)}
            disabled={isBusy || loading}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition
              ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}
              ${isBusy ? "opacity-60" : ""}`}
            title={meta.label}
          >
            <span aria-hidden="true">{meta.icon}</span>
            <span>{meta.label}</span>
            {count > 0 && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-black" dir="ltr">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
