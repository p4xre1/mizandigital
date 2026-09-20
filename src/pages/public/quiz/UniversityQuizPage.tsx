import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { GraduationCap, Play, ArrowRight, Layers } from "lucide-react"
import { SEOHead } from "../../../components/seo/SEOHead"
import { canonicalFor } from "@/lib/canonical"
import { generateBreadcrumbSchema } from "../../../lib/seo/schema"
import { QuizRunner } from "../../../components/quiz/QuizRunner"
import { useQuizQuestions } from "../../../hooks/useQuizQuestions"
import { useQuizProgress } from "../../../hooks/useQuizProgress"
import { saveAttempt } from "../../../lib/quiz/repository"
import type { Semester } from "../../../types/quiz"

const SEMESTERS: Semester[] = ["S1", "S2", "S3", "S4", "S5", "S6"]
const COUNTS = [5, 10, 20]

/**
 * اختبارات طلبة الكلية (/quiz/university):
 * يختار الطالب فصله الدراسي (S1 → S6) ثم المادة، فيُبنى اختبار من أسئلة
 * ذلك التصنيف تحديداً — تماماً كما يدرّس في كليات الحقوق بالمغرب.
 */
export function UniversityQuizPage() {
  const { questions } = useQuizQuestions("university")
  const { recentQuestionIds, profile } = useQuizProgress()

  const [semester, setSemester] = useState<Semester>(() =>
    profile?.role === "student" && profile.semester ? (profile.semester as Semester) : "S1"
  )
  const [module, setModule] = useState<string | null>(null)
  const [count, setCount] = useState(10)
  const [started, setStarted] = useState(false)

  const modules = useMemo(() => {
    const set = new Set<string>()
    questions
      .filter((question) => question.semester === semester)
      .forEach((question) => question.module && set.add(question.module))
    return Array.from(set)
  }, [questions, semester])

  const pool = useMemo(() => {
    return questions.filter((question) => {
      if (question.semester !== semester) return false
      if (module && question.module !== module) return false
      return true
    })
  }, [module, questions, semester])

  const label = `${semester}${module ? ` — ${module}` : " — كل المواد"}`

  if (started) {
    return (
      <main className="container-wide py-10" dir="rtl">
        <SEOHead title={`اختبار ${label}`} description={`اختبار في مقرر ${label} لطلبة كليات الحقوق بالمغرب`} />
        <QuizRunner
          questions={pool}
          mode="university"
          label={label}
          tier="university"
          questionCount={Math.min(count, pool.length)}
          excludeIds={recentQuestionIds}
          onExit={() => setStarted(false)}
          onComplete={(attempt) => void saveAttempt(attempt, profile?.username ?? null)}
        />
      </main>
    )
  }

  return (
    <main className="container-wide py-10" dir="rtl">
      <SEOHead
        title="اختبارات طلبة كليات الحقوق — من S1 إلى S6"
        description="اختبارات قانونية مرتبطة بالمقررات الجامعية الرسمية لكل فصل دراسي: القانون المدني، الجنائي، الإداري، الدستوري، المساطر، الشغل، ومدونة الأسرة."
        canonicalUrl={canonicalFor("/quiz/university")}
        keywords={["اختبارات كلية الحقوق", "امتحانات القانون", "S1 S2 S3", "القانون المدني المغربي"]}
        schema={[
          generateBreadcrumbSchema([
            { name: "الرئيسية", url: "/" },
            { name: "الاختبارات", url: "/quiz" },
            { name: "اختبارات الكلية", url: "/quiz/university" },
          ]),
        ]}
      />

      <div className="mb-6 flex items-center gap-2 text-[12.5px] font-bold text-muted-foreground">
        <Link to="/quiz" className="hover:text-foreground">
          الاختبارات
        </Link>
        <ArrowRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">طلبة الكلية</span>
      </div>

      <header className="rounded-2xl border border-border bg-card p-6">
        <span className="mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="size-5" strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-black text-foreground">اختبارات طلبة الكلية</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-muted-foreground">
          اختر فصلك الدراسي ثم المادة التي تريد مراجعتها. الأسئلة مصنّفة بحسب المقررات الجامعية
          الرسمية، وكل سؤال مرفق بشرح وسنده القانوني حتى تراجع وأنت تمتحن.
        </p>
      </header>

      {/* اختيار الفصل */}
      <section className="mt-6">
        <h2 className="mb-3 text-[15px] font-extrabold text-foreground">الفصل الدراسي</h2>
        <div className="flex flex-wrap gap-2">
          {SEMESTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSemester(item)
                setModule(null)
              }}
              className={`rounded-xl border px-4 py-2 text-[13px] font-extrabold transition ${
                semester === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* اختيار المادة */}
      <section className="mt-6">
        <h2 className="mb-3 text-[15px] font-extrabold text-foreground">المادة</h2>
        {modules.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-[13px] font-semibold text-muted-foreground">
            لا توجد مواد مصنّفة لهذا الفصل بعد. جرّب فصلاً آخر.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModule(null)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[13px] font-extrabold transition ${
                module === null
                  ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                  : "border-border bg-background text-muted-foreground hover:border-accent-gold/50 hover:text-foreground"
              }`}
            >
              <Layers className="size-3.5" aria-hidden="true" />
              كل المواد ({questions.filter((question) => question.semester === semester).length})
            </button>
            {modules.map((item) => {
              const total = questions.filter(
                (question) => question.semester === semester && question.module === item
              ).length
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setModule(item)}
                  className={`rounded-xl border px-4 py-2 text-[13px] font-extrabold transition ${
                    module === item
                      ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                      : "border-border bg-background text-muted-foreground hover:border-accent-gold/50 hover:text-foreground"
                  }`}
                >
                  {item} ({total})
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* عدد الأسئلة ثم البدء */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-extrabold text-foreground">عدد الأسئلة</p>
            <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
              {pool.length} سؤالاً متاحاً في {label}
            </p>
          </div>
          <div className="flex gap-2">
            {COUNTS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCount(item)}
                className={`rounded-xl border px-3.5 py-2 text-[13px] font-extrabold transition ${
                  count === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={pool.length === 0}
          onClick={() => setStarted(true)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="size-4" aria-hidden="true" />
          ابدأ اختبار {label}
        </button>
      </section>
    </main>
  )
}
