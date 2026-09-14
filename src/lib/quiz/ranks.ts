import type { RankId } from "@/types/quiz"

/**
 * نظام الرتب والألعاب (RPG Rank System).
 *
 * التصاعد من Rank D (مبتدئ) حتى Rank SSS (النخبة)، وكل رتبة لها عتبة خبرة
 * (XP) خاصة. الرتبة — وليس الاشتراك — هي التي تفرض حدود النشر والصلاحيات،
 * بينما يبقى الاشتراك الاحترافي (Mizan Pro) مسؤولاً عن التحميل بلا إنترنت
 * وشجرة القوانين المتقدمة وتجاوز قيود الاختبارات.
 *
 * العتبات متقاربة في البداية (لكي يشعر المستخدم بتقدم سريع) ثم تتباعد
 * تدريجياً (لكي تبقى رتب النخبة نادرة وذات قيمة فعلية).
 */

export interface RankDefinition {
  id: RankId
  /** الاسم العربي للرتبة كما يظهر للمستخدم. */
  label: string
  /** وصف موجز لما تعنيه الرتبة. */
  description: string
  /** حد الخبرة الأدنى للوصول إلى هذه الرتبة. */
  minXp: number
  /** أقصى خبرة داخل الرتبة (تستعمل لرسم شريط التقدم) — null لرتبة النخبة الأخيرة. */
  maxXp: number | null
  /** أصناف Tailwind للون الرتبة (نص + خلفية خفيفة + حدود). */
  tone: string
  chip: string
  /** أيقونة/رمز قصير يظهر داخل الشارة. */
  glyph: string
}

export const RANKS: RankDefinition[] = [
  {
    id: "D",
    label: "مبتدئ",
    description: "أول خطوة في الطريق: تتعرف على النصوص وتجمع نقاط خبرتك الأولى.",
    minXp: 0,
    maxXp: 120,
    tone: "text-slate-600 dark:text-slate-300",
    chip: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
    glyph: "D",
  },
  {
    id: "C",
    label: "متعلم",
    description: "بدأت تتمكن من المصطلحات والمبادئ العامة للقانون المغربي.",
    minXp: 120,
    maxXp: 300,
    tone: "text-teal-600 dark:text-teal-300",
    chip: "bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-700",
    glyph: "C",
  },
  {
    id: "B",
    label: "متمكن",
    description: "تجيب عن أسئلة الفصول المتوسطة بثبات وتفهم الروابط بين المواد.",
    minXp: 300,
    maxXp: 650,
    tone: "text-sky-600 dark:text-sky-300",
    chip: "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-700",
    glyph: "B",
  },
  {
    id: "A",
    label: "متقدم",
    description: "مستوى يؤهلك لمساعدة زملائك في المراجعة ونشر أولى مقالاتك.",
    minXp: 650,
    maxXp: 1200,
    tone: "text-indigo-600 dark:text-indigo-300",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700",
    glyph: "A",
  },
  {
    id: "S",
    label: "خبير",
    description: "رتبة تفتح باب شهادة التوصية المعتمدة (Mizan Recommendation).",
    minXp: 1200,
    maxXp: 2200,
    tone: "text-amber-600 dark:text-amber-300",
    chip: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-600",
    glyph: "S",
  },
  {
    id: "SS",
    label: "نخبة",
    description: "تستحق الثقة: إجاباتك مرجع للآخرين في لوحة الاستشارات.",
    minXp: 2200,
    maxXp: 4000,
    tone: "text-orange-600 dark:text-orange-300",
    chip: "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-600",
    glyph: "SS",
  },
  {
    id: "SSS",
    label: "النخبة العليا",
    description: "أعلى رتبة في ميزان: اسمك مقترن بالتميز القانوني المستمر.",
    minXp: 4000,
    maxXp: null,
    tone: "text-rose-600 dark:text-rose-300",
    chip: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-600",
    glyph: "SSS",
  },
]

const RANK_BY_ID = new Map(RANKS.map((rank) => [rank.id, rank]))

/** يُرجع تعريف الرتبة المناسبة لمقدار الخبرة الممرر. */
export function getRankForXp(xp: number): RankDefinition {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0
  let current = RANKS[0]
  for (const rank of RANKS) {
    if (safeXp >= rank.minXp) current = rank
  }
  return current
}

export function getRankDefinition(id: RankId): RankDefinition {
  return RANK_BY_ID.get(id) ?? RANKS[0]
}

export interface RankProgress {
  rank: RankDefinition
  next: RankDefinition | null
  /** نسبة التقدم داخل الرتبة الحالية (0..100). */
  percent: number
  /** نقاط الخبرة المتبقية للوصول إلى الرتبة الموالية (0 في الرتبة الأخيرة). */
  xpToNext: number
}

/** يحسب شريط التقدم: الرتبة الحالية، الرتبة الموالية، والنسبة المئوية. */
export function getRankProgress(xp: number): RankProgress {
  const rank = getRankForXp(xp)
  if (!rank.maxXp) {
    return { rank, next: null, percent: 100, xpToNext: 0 }
  }
  const span = rank.maxXp - rank.minXp
  const earned = Math.min(Math.max(xp - rank.minXp, 0), span)
  const percent = span > 0 ? Math.round((earned / span) * 100) : 0
  return { rank, next: RANKS[RANKS.indexOf(rank) + 1] ?? null, percent, xpToNext: Math.max(rank.maxXp - xp, 0) }
}

/* ------------------------------------------------------------------ *
 * الأوسمة (Badges)
 * ------------------------------------------------------------------ */

export interface BadgeDefinition {
  id: string
  label: string
  description: string
  icon: string
}

export const BADGES: BadgeDefinition[] = [
  { id: "first_quiz", label: "الانطلاقة", description: "أنهيت أول اختبار على المنصة.", icon: "🚀" },
  { id: "perfect", label: "علامة كاملة", description: "أجبت عن كل أسئلة اختبار بشكل صحيح.", icon: "🎯" },
  { id: "streak_10", label: "سلسلة ذهبية", description: "عشر إجابات صحيحة متتالية في اختبار واحد.", icon: "🔥" },
  { id: "concours_ready", label: "جاهز للمباراة", description: "أكملت اختبار مباراة بمعدل 80% أو أكثر.", icon: "🛡️" },
  { id: "lawyer_mind", label: "عقلية محامٍ", description: "أنهيت 5 اختبارات في مسار المقابلات المهنية.", icon: "💼" },
  { id: "marathon", label: "ماراثون المعرفة", description: "أجبت عن 100 سؤال عبر مختلف المسارات.", icon: "🏅" },
  { id: "week_streak", label: "أسبوع من الانضباط", description: "تدربت سبعة أيام متتالية.", icon: "📅" },
]

export const BADGE_BY_ID = new Map(BADGES.map((badge) => [badge.id, badge]))
