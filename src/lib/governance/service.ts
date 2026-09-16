/**
 * خدمة الحوكمة والإبلاغ — Governance Service
 */

export type ReportTargetType = "article" | "news" | "comment" | "lexicon_term" | "quiz_question" | "school" | "profile" | "other";
export type ReportReason = "spam" | "harassment" | "misinformation" | "copyright" | "illegal" | "inappropriate" | "other";
export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";

export interface Report {
  id: string;
  reporter_ref: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface CommunityGuideline {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: "general" | "content" | "quiz" | "comments" | "legal";
  is_active: boolean;
  sort_order: number;
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

export async function createReport(params: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
  clerkId?: string | null;
}): Promise<string> {
  const userRef = getUserRef();

  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await supabase.rpc("create_report", {
      p_reporter_ref: userRef,
      p_target_type: params.targetType,
      p_target_id: params.targetId,
      p_reason: params.reason,
      p_details: params.details?.slice(0, 2000) || null,
      p_reporter_clerk_id: params.clerkId || null,
    });

    if (error) throw error;
    return data as string;
  } catch (err) {
    // في حالة فشل الشبكة، نخزن محلياً للمحاولة لاحقاً
    if (typeof window !== "undefined") {
      try {
        const pendingKey = "mizan:reports:pending:v1";
        const existing = JSON.parse(window.localStorage.getItem(pendingKey) || "[]");
        existing.push({ ...params, userRef, createdAt: new Date().toISOString() });
        window.localStorage.setItem(pendingKey, JSON.stringify(existing.slice(-20)));
      } catch {
        /* ignore */
      }
    }
    throw err;
  }
}

export async function fetchGuidelines(): Promise<CommunityGuideline[]> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await supabase.from("community_guidelines").select("*").eq("is_active", true).order("sort_order", { ascending: true });
    if (error) throw error;
    return (data as unknown as CommunityGuideline[]) || [];
  } catch {
    // fallback
    return [
      { id: "1", slug: "respect", title: "الاحترام المتبادل", content: "ميزان الرقمية مجتمع طلابي مهني. يمنع أي خطاب كراهية، تحرش، أو إساءة شخصية.", category: "general", is_active: true, sort_order: 1 },
      { id: "2", slug: "accuracy", title: "الدقة القانونية", content: "عند نشر معلومة قانونية، اذكر المصدر (نص قانوني، جريدة رسمية، قرار قضائي).", category: "content", is_active: true, sort_order: 2 },
      { id: "3", slug: "no-spam", title: "منع السبام والإشهار", content: "يمنع نشر روابط إشهارية أو تكرار نفس المحتوى.", category: "content", is_active: true, sort_order: 3 },
    ];
  }
}

export async function fetchReportsForAdmin(status?: ReportStatus): Promise<Report[]> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    let query = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as Report[]) || [];
  } catch {
    return [];
  }
}

export const REPORT_REASONS: Record<ReportReason, { label: string; description: string }> = {
  spam: { label: "سبام أو إشهار", description: "محتوى إعلاني أو متكرر بلا فائدة" },
  harassment: { label: "تحرش أو إساءة", description: "خطاب كراهية أو إساءة شخصية" },
  misinformation: { label: "معلومة مضللة", description: "معلومة قانونية خاطئة أو غير مسندة" },
  copyright: { label: "انتهاك حقوق", description: "نسخ محتوى محمي بلا إذن" },
  illegal: { label: "محتوى غير قانوني", description: "يحض على نشاط غير قانوني" },
  inappropriate: { label: "محتوى غير لائق", description: "غير مناسب للمجتمع الطلابي" },
  other: { label: "أخرى", description: "سبب آخر" },
};
