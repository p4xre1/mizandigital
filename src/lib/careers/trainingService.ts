/**
 * خدمة التدريب المهني على Supabase — عمليات مقيَّدة بالمستخدم نفسه.
 *
 * المبدأ نفسه المطبَّق في lib/profiles/service.ts: لا تُسقط أي دالة الواجهة
 * عند فشل الشبكة، بل تُرجع نتيجة صريحة `{ ok:false, reason }`. صفحات
 * «تدريبي المهني» تعمل محلياً (localStorage عبر useQuizProgress) حتى بلا
 * جلسة وبلا اتصال.
 *
 * الخصوصية:
 *   • الجداول الجديدة (career_training_profiles / career_training_progress)
 *     لها RLS تقصر كل صف على `owner_id = auth.uid()` — لا قراءة لبيانات غيرك.
 *     الملكية باسم owner_id (الاصطلاح الحديث) لا user_id، والمفتاح الأساسي
 *     مركّب (owner_id, career_slug) فلا معنى لمعرّف صف مستقل.
 *   • الزائر لا يكتب شيئاً: لا `user_id` لديه، والسياسات ترفض المجهول أصلاً.
 *   • حفظ المدينة يتم بفعل صريح من المستخدم، ويحدّث `mizan_profiles.city` لصفّه وحده.
 *   • لا يُخزَّن عنوان دقيق ولا سن ولا معطيات حساسة ولا أي استنتاج أهلية.
 */

import type { CareerLexiconTerm } from "./types";

export interface ServiceResult {
  ok: boolean;
  reason?: string;
}

const NO_SESSION = "سجّل الدخول لحفظ تدريبك في حسابك.";

async function getClient() {
  const { supabase } = await import("@/lib/supabase/client");
  return supabase;
}

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = await getClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * مسارات التدريب المتابَعة
 * ------------------------------------------------------------------ */

export interface CareerTrainingRow {
  career_slug: string;
  is_following: boolean;
  started_at: string;
  updated_at: string;
  last_practiced_at: string | null;
}

export interface FollowedCareersResult extends ServiceResult {
  slugs: string[];
}

/** مسارات التدريب التي أضافها المستخدم إلى ملفه. */
export async function fetchFollowedCareers(): Promise<FollowedCareersResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, slugs: [], reason: NO_SESSION };

  try {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from("career_training_profiles")
      .select("career_slug, is_following, started_at, updated_at, last_practiced_at")
      .eq("owner_id", userId);

    if (error) throw error;
    const rows = (data ?? []) as CareerTrainingRow[];
    return { ok: true, slugs: rows.filter((row) => row.is_following).map((row) => row.career_slug) };
  } catch (error) {
    return { ok: false, slugs: [], reason: error instanceof Error ? error.message : "تعذر الجلب" };
  }
}

/** إضافة/إزالة مسار من «تدريبي المهني» — بفعل صريح من المستخدم فقط. */
export async function setCareerFollowing(careerSlug: string, isFollowing: boolean): Promise<ServiceResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, reason: NO_SESSION };
  if (!careerSlug) return { ok: false, reason: "مسار غير محدد." };

  try {
    const supabase = await getClient();
    if (isFollowing) {
      const { error } = await supabase.from("career_training_profiles").upsert(
        {
          owner_id: userId,
          career_slug: careerSlug,
          is_following: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id,career_slug" }
      );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("career_training_profiles")
        .update({ is_following: false, updated_at: new Date().toISOString() })
        .eq("owner_id", userId)
        .eq("career_slug", careerSlug);
      if (error) throw error;
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "تعذر الحفظ" };
  }
}

/* ------------------------------------------------------------------ *
 * تقدّم التدريب (جدول مشتقّ قابل لإعادة البناء)
 * ------------------------------------------------------------------ */

export interface CareerProgressRow {
  career_slug: string;
  attempted_count: number;
  completed_count: number;
  best_score: number | null;
  /** jsonb في القاعدة: مصفوفة معرّفات مصطلحات القاموس. */
  weak_topics: string[];
  updated_at: string;
}

export interface TrainingProgressResult extends ServiceResult {
  rows: CareerProgressRow[];
}

export async function fetchTrainingProgress(): Promise<TrainingProgressResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, rows: [], reason: NO_SESSION };

  try {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from("career_training_progress")
      .select("career_slug, attempted_count, completed_count, best_score, weak_topics, updated_at")
      .eq("owner_id", userId);

    if (error) throw error;
    const rows = ((data ?? []) as unknown as CareerProgressRow[]).map((row) => ({
      ...row,
      weak_topics: Array.isArray(row.weak_topics) ? row.weak_topics : [],
    }));
    return { ok: true, rows };
  } catch (error) {
    return { ok: false, rows: [], reason: error instanceof Error ? error.message : "تعذر الجلب" };
  }
}

/** يحفظ/يحدّث صفّ تقدّم لمسار واحد (لا يحذف صفوف غيره، ولا يمسّ جدول المحاولات). */
export async function upsertTrainingProgress(input: {
  careerSlug: string;
  attemptedCount: number;
  completedCount: number;
  bestScore: number | null;
  weakTopics: CareerLexiconTerm[];
}): Promise<ServiceResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, reason: NO_SESSION };

  try {
    const supabase = await getClient();
    const { error } = await supabase.from("career_training_progress").upsert(
      {
        owner_id: userId,
        career_slug: input.careerSlug,
        attempted_count: Math.max(0, Math.min(10000, Math.round(input.attemptedCount))),
        completed_count: Math.max(0, Math.min(10000, Math.round(input.completedCount))),
        best_score:
          input.bestScore === null ? null : Math.max(0, Math.min(100, Math.round(input.bestScore))),
        weak_topics: input.weakTopics.map((term) => term.id),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,career_slug" }
    );
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "تعذر الحفظ" };
  }
}

/* ------------------------------------------------------------------ *
 * حفظ المدينة — بفعل صريح فقط
 * ------------------------------------------------------------------ */

/**
 * يحفظ المدينة في بروفايل المستخدم نفسه (`mizan_profiles.city`).
 *
 * لماذا `mizan_profiles` وليس جدولاً جديداً؟ لأن المدينة موجودة أصلاً هناك
 * (حقل `city` في محرّر /profile) وتحمل معها خيار النشر `share_location` الذي
 * يضبطه المستخدم بنفسه. لا نضيف عموداً ولا جدولاً ثانياً لنفس المعلومة، ولا
 * نغيّر `share_location`: من لم يُفعّل مشاركة موقعه تبقى مدينته غير معروضة
 * للعموم (`fetchPublicProfile` يمحوها حين يكون الخيار مغلقاً).
 *
 * لا يُستدعى تلقائياً عند اختيار المدينة في مكوّن «أقرب الكليات»: يُستدعى من
 * زر «حفظ مدينتي في ملفي» فقط. ولو اختار المستخدم مدينة ثم غادر الصفحة، بقيت
 * المدينة في حالة المكوّن المحلية ولم تُكتب في أي جدول.
 */
export async function saveCityToProfile(cityName: string): Promise<ServiceResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, reason: NO_SESSION };

  const value = cityName.trim().slice(0, 60);
  if (!value) return { ok: false, reason: "اسم المدينة غير صالح." };

  try {
    const { fetchMyProfile, ensureMyProfile, saveMyProfile } = await import("@/lib/profiles/service");
    const existing = (await fetchMyProfile(userId)) ?? (await ensureMyProfile(userId, {}));
    if (!existing) return { ok: false, reason: "تعذر الوصول إلى البروفايل." };

    // لا استبدال صامت: إن كانت المدينة المحفوظة هي نفسها فلا كتابة إطلاقاً
    // (لا تعديل ولا طلب شبكة زائد). الحفظ يبقى دائماً بفعل صريح من المستخدم،
    // ولا نمسّ `share_location` — من لم يُفعّل مشاركة موقعه تبقى مدينته خاصة.
    if (existing.city && existing.city.trim() === value) {
      return { ok: true };
    }

    // لا نلمس أي حقل آخر: نمرّر البروفايل كما هو مع تغيير المدينة وحدها،
    // والتقدّم (XP/الكريدتس) كما قرأته القاعدة لا كما يحسبه العميل.
    const next = { ...existing, city: value };
    const result = await saveMyProfile(
      userId,
      next,
      {
        xp: existing.xp ?? 0,
        credits: existing.credits ?? 0,
        badges: existing.badges ?? [],
        streakDays: existing.streakDays ?? 0,
        placementCompleted: existing.placementCompleted ?? false,
      },
      { isPublic: existing.isPublic ?? true }
    );

    return result.synced ? { ok: true } : { ok: false, reason: result.reason };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "تعذر حفظ المدينة." };
  }
}
