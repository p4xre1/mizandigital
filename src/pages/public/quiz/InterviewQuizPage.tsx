import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BriefcaseBusiness, Play, ArrowRight } from "lucide-react"
import { SEOHead } from "../../../components/seo/SEOHead"
import { canonicalFor } from "@/lib/canonical"
import { generateBreadcrumbSchema } from "../../../lib/seo/schema"
import { QuizRunner } from "../../../components/quiz/QuizRunner"
import { useQuizQuestions } from "../../../hooks/useQuizQuestions"
import { useQuizProgress } from "../../../hooks/useQuizProgress"
import { saveAttempt } from "../../../lib/quiz/repository"
import type { InterviewTrack } from "../../../types/quiz"

const TRACKS: Array<{ id: InterviewTrack; label: string; hint: string }> = [
  { id: "internship", label: "تدريب (Internship)", hint: "ما ينتظره مكتب المحاماة أو المحكمة من المتدرب في أول أسبوع." },
  { id: "job", label: "وظيفة قانونية", hint: "مراجعة العقود، الافتحاص القانوني، العمل داخل الشركات." },
  { id: "ethics", label: "أخلاقيات المهنة", hint: "السر المهني، تضارب المصالح، التعامل مع الموكل والمحكمة." },
  { id: "softskills", label: "مهارات التواصل والعمل", hint: "إدارة الوقت، الشفافية مع الموكل، العمل ضمن فريق." },
]

/**
 * تدريبات المقابلات المهنية (/quiz/interview):
 * مواقف عملية وأسئلة مقابلات حقيقية لتأهيل الخريجين والباحثين عن تدريب
 * أو وظيفة قانونية، بدل الاكتفاء بالمعرفة النظرية.
 */
export function InterviewQuizPage() {
  const { questions } = useQuizQuestions("interview")
  const { recentQuestionIds, profile } = useQuizProgress()

  const [track, setTrack] = useState<InterviewTrack | "all">("all")
  const [started, setStarted] = useState(false)

  const pool = useMemo(
    () => (track === "all" ? questions : questions.filter((question) => question.track === track)),
    [questions, track]
  )

  const label = track === "all" ? "المقابلات والتداريب (شامل)" : TRACKS.find((item) => item.id === track)?.label ?? ""

  if (started) {
    return (
      <main className="container-wide py-10" dir="rtl">
        <SEOHead title={`تدريب مقابلات: ${label}`} description="أسئلة عملية ومواقف تطبيقية لتأهيل الباحثين عن تدريب أو وظيفة قانونية." />
        <QuizRunner
          questions={pool}
          mode="interview"
          label={label}
          tier="interview"
          questionCount={Math.min(10, pool.length)}
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
        title="اختبارات المقابلات المهنية وتداريب العمل القانوني"
        description="مواقف عملية وأسئلة مقابلات حقيقية لإعداد الخريجين والباحثين عن تدريب أو وظيفة قانونية في مكاتب المحاماة والشركات والمؤسسات."
        canonicalUrl={canonicalFor("/quiz/interview")}
        keywords={["مقابلة عمل قانونية", "تدريب محاماة", "internship law Morocco", "أخلاقيات المحاماة"]}
        schema={[
          generateBreadcrumbSchema([
            { name: "الرئيسية", url: "/" },
            { name: "الاختبارات", url: "/quiz" },
            { name: "المقابلات والتداريب", url: "/quiz/interview" },
          ]),
        ]}
      />

      <div className="mb-6 flex items-center gap-2 text-[12.5px] font-bold text-muted-foreground">
        <Link to="/quiz" className="hover:text-foreground">
          الاختبارات
        </Link>
        <ArrowRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">المقابلات والتداريب</span>
      </div>

      <header className="rounded-2xl border border-border bg-card p-6">
        <span className="mb-3 grid size-11 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
          <BriefcaseBusiness className="size-5" strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-black text-foreground">مقابلات التدريب والعمل</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-muted-foreground">
          هنا لا نقيس حفظك للنصوص بل جاهزيتك العملية: كيف تستلم ملفاً، كيف تتعامل مع موكل يطلب
          المستحيل، كيف تراجع عقداً، وماذا تقول حين يسألك المشغّل عن أخلاقيات المهنة.
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTrack("all")}
          className={`rounded-2xl border p-4 text-right transition ${
            track === "all" ? "border-primary bg-primary/[0.06]" : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <p className="text-[14px] font-extrabold text-foreground">شامل (كل المحاور)</p>
          <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
            مزيج متوازن من كل المحاور ({questions.length} سؤالاً) — الأقرب لمقابلة فعلية.
          </p>
        </button>
        {TRACKS.map((item) => {
          const total = questions.filter((question) => question.track === item.id).length
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTrack(item.id)}
              className={`rounded-2xl border p-4 text-right transition ${
                track === item.id ? "border-primary bg-primary/[0.06]" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <p className="text-[14px] font-extrabold text-foreground">{item.label}</p>
              <p className="mt-1 text-[12px] leading-6 text-muted-foreground">{item.hint}</p>
              <p className="mt-1.5 text-[11px] font-bold text-primary">{total} سؤالاً</p>
            </button>
          )
        })}
      </section>

      <button
        type="button"
        disabled={pool.length === 0}
        onClick={() => setStarted(true)}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="size-4" aria-hidden="true" />
        ابدأ تدريب {label}
      </button>

      <p className="mt-6 rounded-2xl border border-border bg-card p-4 text-[12px] leading-6 text-muted-foreground">
        الأجوبة هنا تُبيّن الممارسة المهنية السليمة المتعارف عليها، وليست قواعد قانونية ملزمة؛
        راجع دائماً النظام الداخلي للمكتب أو المؤسسة التي تتقدم إليها.
      </p>
    </main>
  )
}
