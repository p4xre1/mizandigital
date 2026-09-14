import { useCallback, useEffect, useState } from "react"
import type { ConcoursBody, InterviewTrack, QuizQuestion, QuizTier, Semester } from "@/types/quiz"
import { loadAllQuestions, loadPendingQuestions, loadSeedQuestions, mergeQuestions } from "@/lib/quiz/repository"

export interface QuizFilters {
  semester?: Semester | null
  module?: string | null
  body?: ConcoursBody | null
  track?: InterviewTrack | null
}

export interface UseQuizQuestionsResult {
  questions: QuizQuestion[]
  /** true حتى اكتمال أول جلب (البنك المحلي يظهر قبل ذلك ولا نحجب الواجهة). */
  loading: boolean
  /** true إذا أُضيفت أسئلة من قاعدة البيانات فوق البنك المحلي. */
  hasCmsQuestions: boolean
  /** true إذا فُقد الاتصال واحتُفظت أسئلة على الجهاز فقط. */
  hasPendingLocal: boolean
  refresh: () => void
}

/**
 * يجلب بنك الأسئلة ويبقيه محدّثاً.
 *
 * ملاحظة أداء: الأسئلة المحلية (JSON) تُستورد ديناميكياً فلا تدخل الحزمة
 * الحرجة، ومع ذلك تظهر في أول render للصفحات التي تستعمل هذا الخطاف لأن
 * التحميل يبدأ فوراً داخل useEffect ويستغرق أجزاء من الثانية من الذاكرة
 * المؤقتة للمتصفح.
 */
export function useQuizQuestions(tier?: QuizTier | "placement"): UseQuizQuestionsResult {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [hasCmsQuestions, setHasCmsQuestions] = useState(false)
  const [hasPendingLocal, setHasPendingLocal] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let mounted = true

    const run = async () => {
      setLoading(true)
      try {
        // 1) البنك المحلي أولاً: المحتوى يظهر للمستخدم فوراً
        const seed = await loadSeedQuestions()
        if (mounted) setQuestions(mergeQuestions(seed, [], loadPendingQuestions()))

        // 2) ثم بنك لوحة التحكم: يُدمج فوق المحلي عند وصوله
        const all = await loadAllQuestions()
        if (!mounted) return

        const seedIds = new Set(seed.map((question) => question.id))
        setQuestions(all)
        setHasCmsQuestions(all.some((question) => !seedIds.has(question.id)))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [nonce])

  useEffect(() => {
    setHasPendingLocal(loadPendingQuestions().length > 0)
  }, [questions])

  const refresh = useCallback(() => setNonce((value) => value + 1), [])

  const filtered = questions.filter((question) => {
    if (!tier || tier === "placement") return true
    return question.tier === tier
  })

  return { questions: filtered, loading, hasCmsQuestions, hasPendingLocal, refresh }
}

/** يطبّق فلاتر الفصل/المادة/الجهة على بنك الأسئلة. */
export function useFilteredQuestions(questions: QuizQuestion[], filters: QuizFilters): QuizQuestion[] {
  const { semester, module, body, track } = filters
  return questions.filter((question) => {
    if (semester && question.semester !== semester) return false
    if (module && question.module !== module) return false
    if (body && question.body !== body) return false
    if (track && question.track !== track) return false
    return true
  })
}
