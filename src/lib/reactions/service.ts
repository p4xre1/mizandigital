/**
 * خدمة التفاعلات — Reactions Service
 * تدعم like, helpful, bookmark, fire, insightful
 */

export type ReactionType = "like" | "dislike" | "helpful" | "bookmark" | "fire" | "insightful";
export type TargetType = "article" | "news" | "lexicon_term" | "school" | "quiz_question" | "comment" | "law";

export interface ReactionSummary {
  reaction_type: ReactionType;
  count: number;
}

const ANON_KEY = "mizan:anon:user_ref:v1";

function getUserRef(): string {
  if (typeof window === "undefined") return "server";
  try {
    let ref = window.localStorage.getItem(ANON_KEY);
    if (!ref) {
      ref = `anon:${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      window.localStorage.setItem(ANON_KEY, ref);
    }
    return ref;
  } catch {
    return `anon:${Math.random().toString(36).slice(2, 8)}`;
  }
}

function getClerkId(): string | null {
  // Clerk ID سيأتي من useUser() في المكونات، هنا نمرره كـ param
  return null;
}

// ذاكرة محلية للتفاعلات (optimistic UI)
const localReactions = new Map<string, Set<ReactionType>>();

function keyFor(targetType: TargetType, targetId: string): string {
  return `${targetType}:${targetId}`;
}

export async function fetchReactions(targetType: TargetType, targetId: string): Promise<ReactionSummary[]> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await (supabase as any).rpc("get_reaction_summary", {
      p_target_type: targetType,
      p_target_id: targetId,
    });
    if (error) throw error;
    return (data as ReactionSummary[]) || [];
  } catch {
    // fallback من localStorage
    const key = keyFor(targetType, targetId);
    const set = localReactions.get(key);
    if (!set) return [];
    return Array.from(set).map((rt) => ({ reaction_type: rt, count: 1 }));
  }
}

export async function toggleReaction(
  targetType: TargetType,
  targetId: string,
  reactionType: ReactionType,
  clerkUserId?: string | null
): Promise<{ action: "added" | "removed"; count: number; summary: ReactionSummary[] }> {
  const userRef = getUserRef();
  const key = keyFor(targetType, targetId);

  // Optimistic update
  const current = localReactions.get(key) || new Set<ReactionType>();
  const had = current.has(reactionType);

  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await (supabase as any).rpc("toggle_reaction", {
      p_user_ref: userRef,
      p_target_type: targetType,
      p_target_id: targetId,
      p_reaction_type: reactionType,
      p_clerk_user_id: clerkUserId || null,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? (data as any)[0] : (data as any);
    const action = ((row as any)?.action as "added" | "removed") || (had ? "removed" : "added");

    if (action === "added") current.add(reactionType);
    else current.delete(reactionType);
    localReactions.set(key, current);

    const summary = await fetchReactions(targetType, targetId);

    return { action, count: (row as any)?.count || 0, summary };
  } catch {
    // fallback محلي
    if (had) current.delete(reactionType);
    else current.add(reactionType);
    localReactions.set(key, current);

    const summary: ReactionSummary[] = Array.from(current).map((rt) => ({ reaction_type: rt, count: 1 }));
    return { action: had ? "removed" : "added", count: had ? 0 : 1, summary };
  }
}

export function getLocalUserReactions(targetType: TargetType, targetId: string): ReactionType[] {
  const key = keyFor(targetType, targetId);
  return Array.from(localReactions.get(key) || []);
}

export const REACTION_META: Record<ReactionType, { label: string; icon: string; color: string }> = {
  like: { label: "إعجاب", icon: "👍", color: "text-sky-600" },
  dislike: { label: "غير مفيد", icon: "👎", color: "text-slate-500" },
  helpful: { label: "مفيد", icon: "✅", color: "text-emerald-600" },
  bookmark: { label: "حفظ", icon: "🔖", color: "text-amber-600" },
  fire: { label: "ممتاز", icon: "🔥", color: "text-orange-600" },
  insightful: { label: "عميق", icon: "💡", color: "text-violet-600" },
};
