import type { QuizAttempt, QuizQuestion, QuizTier } from "@/types/quiz"

/**
 * طبقة الوصول إلى بنك الأسئلة (Repository).
 *
 * ثلاث طبقات للبيانات تُدمج في مصفوفة واحدة:
 *
 *   1) البنك المحلي (seed)  — src/data/quiz-questions.json
 *      يُستورد ديناميكياً (لا يدخل في الحزمة الحرجة) وهو المصدر الذي يجعل
 *      الاختبارات تعمل فوراً، حتى بلا إنترنت أو بدون قاعدة بيانات.
 *
 *   2) بنك لوحة التحكم (cms) — جدول Supabase `quiz_questions`
 *      أي سؤال يضيفه المشرف من /admin/quizzes يظهر للمستخدمين بعد الدمج.
 *      تُخزَّن نسخة مخزونة (cached) محلياً ليوم واحد حتى يظهر المحتوى
 *      فوراً في الزيارة الموالية حتى ولو تعذر الاتصال.
 *
 *   3) أسئلة محلية غير متزامنة (pending) — localStorage
 *      حين لا تتوفر قاعدة البيانات (بيئة تطوير بلا مفاتيح، أو فشل في
 *      الشبكة) تُحفظ الأسئلة المضافة من لوحة التحكم على الجهاز وتُدمج هي
 *      الأخرى، فلا يضيع عمل المشرف.
 *
 * قاعدة الدمج: السؤال المحلي (seed) الذي يحمل نفس معرّف سؤال CMS يُستبدل
 * بنسخة CMS (هي الأحدث)، والأسئلة الجديدة تُلحق.
 */

const CMS_CACHE_KEY = "mizan:quiz:cms-cache:v1"
const CMS_PENDING_KEY = "mizan:quiz:cms-pending:v1"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let seedCache: QuizQuestion[] | null = null
let cmsCache: QuizQuestion[] | null = null
let cmsPromise: Promise<QuizQuestion[]> | null = null

/* ------------------------------------------------------------------ *
 * التحقق من صحة السؤال
 * ------------------------------------------------------------------ */

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/** يتحقق من اكتمال السؤال قبل حفظه — نفس القيود الموجودة في ترقية SQL. */
export function validateQuestion(question: Partial<QuizQuestion>): ValidationResult {
  const errors: string[] = []

  if (!question.question?.trim()) errors.push("نص السؤال مطلوب.")
  if (!question.explanation?.trim()) errors.push("الشرح مطلوب (يظهر للمستخدم بعد الإجابة).")

  const options = (question.options ?? []).map((option) => String(option).trim())
  if (options.length !== 4) errors.push("يجب إدخال أربعة خيارات بالضبط.")
  if (options.some((option) => option.length === 0)) errors.push("لا يجوز ترك أي خيار فارغاً.")
  if (new Set(options).size !== options.length) errors.push("يوجد خياران متكرران — اجعل الخيارات مختلفة.")

  if (typeof question.answer !== "number" || question.answer < 0 || question.answer > 3) {
    errors.push("يجب تحديد الخيار الصحيح.")
  }
  if (!question.tier) errors.push("يجب اختيار مسار الاختبار.")

  return { valid: errors.length === 0, errors }
}

/* ------------------------------------------------------------------ *
 * البنك المحلي (seed)
 * ------------------------------------------------------------------ */

export async function loadSeedQuestions(): Promise<QuizQuestion[]> {
  if (seedCache) return seedCache
  // استيراد ديناميكي: ملف الأسئلة (~40 KiB) ليس مطلوباً لعرض الصفحة
  // الرئيسية، فيُجلب عند أول دخول فعلي لمسار الاختبارات فقط.
  const module = await import("@/data/quiz-questions.json")
  const rows = (module.default ?? []) as QuizQuestion[]
  seedCache = rows.map((row) => ({ ...row, source: "seed" as const }))
  return seedCache
}

/* ------------------------------------------------------------------ *
 * بنك لوحة التحكم (Supabase)
 * ------------------------------------------------------------------ */

interface CmsCacheEnvelope {
  savedAt: number
  questions: QuizQuestion[]
}

function readCmsCache(): QuizQuestion[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CMS_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CmsCacheEnvelope
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) return []
    return Array.isArray(parsed.questions) ? parsed.questions : []
  } catch {
    return []
  }
}

function writeCmsCache(questions: QuizQuestion[]): void {
  if (typeof window === "undefined") return
  try {
    const envelope: CmsCacheEnvelope = { savedAt: Date.now(), questions }
    window.localStorage.setItem(CMS_CACHE_KEY, JSON.stringify(envelope))
  } catch {
    /* تجاهل: امتلاء مساحة التخزين لا يجب أن يوقف الاختبار */
  }
}

type CmsRow = {
  slug: string
  tier: string
  semester: string | null
  module: string | null
  body: string | null
  track: string | null
  difficulty: string
  question: string
  options: unknown
  answer: number
  explanation: string
  reference: string | null
  created_at?: string | null
}

/** يحوّل صف قاعدة البيانات إلى كائن السؤال المستخدم في الواجهة. */
export function mapCmsRow(row: CmsRow): QuizQuestion {
  const options = Array.isArray(row.options) ? (row.options as unknown[]).map((option) => String(option)) : []
  return {
    id: row.slug,
    tier: row.tier as QuizTier,
    semester: (row.semester ?? null) as QuizQuestion["semester"],
    module: row.module ?? null,
    body: row.body as QuizQuestion["body"],
    track: row.track as QuizQuestion["track"],
    difficulty: row.difficulty as QuizQuestion["difficulty"],
    question: row.question,
    options,
    answer: row.answer,
    explanation: row.explanation,
    reference: row.reference ?? null,
    source: "cms",
    created_at: row.created_at ?? null,
  }
}

/**
 * يجلب أسئلة لوحة التحكم. النتيجة تُخزّن في ذاكرة الوحدة (module cache)
 * حتى لا تتكرر نفس الطلبات مع كل تنقّل بين صفحات الاختبارات.
 */
export async function loadCmsQuestions(options: { force?: boolean } = {}): Promise<QuizQuestion[]> {
  if (cmsCache && !options.force) return cmsCache
  if (cmsPromise && !options.force) return cmsPromise

  cmsPromise = (async () => {
    try {
      const { supabase } = await import("@/lib/supabase/client")
      const { data, error } = await supabase
        .from("quiz_questions")
        .select(
          "slug, tier, semester, module, body, track, difficulty, question, options, answer, explanation, reference, created_at"
        )
        .eq("is_published", true)
        .order("created_at", { ascending: true })
        .limit(500)

      if (error || !data) {
        // فشل الاتصال: نرجع النسخة المخزونة محلياً (قد تكون فارغة في أول زيارة)
        cmsCache = readCmsCache()
        return cmsCache
      }

      const questions = (data as unknown as CmsRow[])
        .map(mapCmsRow)
        // سؤال بلا خيارات صالحة أو بفهرس جواب خارج النطاق لا يُعرض أبداً
        .filter((question) => question.options.length === 4 && question.answer >= 0 && question.answer < 4)

      writeCmsCache(questions)
      cmsCache = questions
      return questions
    } catch {
      cmsCache = readCmsCache()
      return cmsCache
    } finally {
      cmsPromise = null
    }
  })()

  return cmsPromise
}

/* ------------------------------------------------------------------ *
 * الأسئلة المحلية المعلّقة (إضافة بلا قاعدة بيانات)
 * ------------------------------------------------------------------ */

export function loadPendingQuestions(): QuizQuestion[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CMS_PENDING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QuizQuestion[]) : []
  } catch {
    return []
  }
}

function savePendingQuestions(questions: QuizQuestion[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(CMS_PENDING_KEY, JSON.stringify(questions))
  } catch {
    /* تجاهل */
  }
}

/* ------------------------------------------------------------------ *
 * الدمج
 * ------------------------------------------------------------------ */

/**
 * يدمج كل المصادر: بنك CMS يغطي على البنك المحلي عند تطابق المعرّف، ثم
 * تُضاف أسئلة CMS الجديدة وأسئلة الجهاز المعلّقة.
 */
export function mergeQuestions(seed: QuizQuestion[], cms: QuizQuestion[], pending: QuizQuestion[] = []): QuizQuestion[] {
  const byId = new Map<string, QuizQuestion>()

  for (const question of seed) byId.set(question.id, question)
  // نسخة قاعدة البيانات أحدث من نسخة الملف المحلي فتستبدلها
  for (const question of cms) byId.set(question.id, question)
  for (const question of pending) byId.set(question.id, question)

  return Array.from(byId.values())
}

/** يجلب كل الأسئلة (محلي + CMS + معلّقة) في استدعاء واحد. */
export async function loadAllQuestions(options: { force?: boolean } = {}): Promise<QuizQuestion[]> {
  const [seed, cms] = await Promise.all([loadSeedQuestions(), loadCmsQuestions(options)])
  return mergeQuestions(seed, cms, loadPendingQuestions())
}

/* ------------------------------------------------------------------ *
 * الكتابة (لوحة التحكم)
 * ------------------------------------------------------------------ */

function slugify(value: string): string {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[\s/\\_]+/g, "-")
      .replace(/[^\w\u0600-\u06FF-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || `q-${Date.now().toString(36)}`
  )
}

export interface SaveResult {
  question: QuizQuestion
  /** true إذا حُفظ فعلاً في Supabase، و false إذا حُفظ على الجهاز فقط. */
  synced: boolean
  message: string
}

/** ينشئ معرّفاً مستقراً وفريداً للسؤال الجديد. */
export function makeQuestionSlug(question: Pick<QuizQuestion, "id" | "question" | "tier">): string {
  if (question.id && !question.id.startsWith("tmp-")) return String(question.id)
  const base = slugify(question.question).slice(0, 40) || "question"
  return `${question.tier}-${base}-${Math.random().toString(36).slice(2, 6)}`
}

/** يحفظ سؤالاً جديداً أو يحدّث سؤالاً موجوداً (لوحة التحكم). */
export async function saveQuestion(input: QuizQuestion): Promise<SaveResult> {
  const slug = makeQuestionSlug(input)
  const question: QuizQuestion = { ...input, id: slug, source: "cms" }

  const payload = {
    slug,
    tier: question.tier,
    semester: question.semester ?? null,
    module: question.module ?? null,
    body: question.body ?? null,
    track: question.track ?? null,
    difficulty: question.difficulty,
    question: question.question.trim(),
    options: question.options.map((option) => option.trim()),
    answer: question.answer,
    explanation: question.explanation.trim(),
    reference: question.reference?.trim() || null,
    is_published: true,
  }

  try {
    const { supabase } = await import("@/lib/supabase/client")
    const { error } = await supabase.from("quiz_questions").upsert(payload, { onConflict: "slug" })
    if (error) throw error

    // نحدّث المخزون المحلي فوراً حتى يظهر السؤال بلا انتظار إعادة جلب
    cmsCache = null
    return { question, synced: true, message: "حُفظ السؤال في قاعدة البيانات وسيظهر للمستخدمين فوراً." }
  } catch (error) {
    // لا توجد قاعدة بيانات أو تعذّر الاتصال: نحفظ على الجهاز ونُعلم المشرف
    const pending = loadPendingQuestions().filter((item) => item.id !== slug)
    pending.push(question)
    savePendingQuestions(pending)
    cmsCache = null
    const reason = error instanceof Error ? error.message : "خطأ غير معروف"
    return {
      question,
      synced: false,
      message: `تعذّر الاتصال بقاعدة البيانات (${reason}) — حُفظ السؤال على هذا الجهاز مؤقتاً وسيُزامن لاحقاً.`,
    }
  }
}

/** يحذف سؤالاً من قاعدة البيانات (ومن الجهاز إن كان محلياً). */
export async function deleteQuestion(questionId: string): Promise<{ synced: boolean; message: string }> {
  let synced = false
  let message = "حُذف السؤال من هذا الجهاز."

  try {
    const { supabase } = await import("@/lib/supabase/client")
    const { error } = await supabase.from("quiz_questions").delete().eq("slug", questionId)
    if (error) throw error
    synced = true
    message = "حُذف السؤال من قاعدة البيانات."
  } catch {
    // لا يمكن حذف الأسئلة المحلية (seed) — نكتفي بإخفاء أسئلة الجهاز المعلّقة
    message = "تعذّر الحذف من قاعدة البيانات؛ حُذف من هذا الجهاز فقط إن كان محلياً."
  }

  const pending = loadPendingQuestions().filter((item) => item.id !== questionId)
  if (pending.length !== loadPendingQuestions().length) savePendingQuestions(pending)
  cmsCache = null

  return { synced, message }
}

/* ------------------------------------------------------------------ *
 * تسجيل المحاولات (اختياري — لا يعطّل التجربة)
 * ------------------------------------------------------------------ */

/**
 * يرسل نتيجة الاختبار إلى Supabase إن أمكن. الفشل صامت دائماً: النتيجة
 * محفوظة أصلاً على الجهاز (localStorage) وتُحسب منها الرتبة.
 */
export async function saveAttempt(attempt: QuizAttempt, userRef?: string | null): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase/client")
    const { error } = await supabase.from("quiz_attempts").insert({
      user_ref: userRef ?? null,
      mode: attempt.mode,
      label: attempt.label,
      total: attempt.total,
      correct: attempt.correct,
      score: attempt.score,
      xp_earned: attempt.xpEarned,
      credits_earned: attempt.creditsEarned,
      best_streak: attempt.bestStreak,
      duration_ms: attempt.durationMs,
    })
    if (error) throw error
  } catch {
    /* صامت عمداً: الاختبار يكتمل محلياً في كل الحالات */
  }
}

/** يمحو الذاكرة المؤقتة لبنك الأسئلة (يُستعمل بعد تعديلات لوحة التحكم). */
export function invalidateQuestionCache(): void {
  cmsCache = null
  cmsPromise = null
}
