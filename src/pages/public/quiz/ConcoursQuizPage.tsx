import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ShieldCheck, Play, ArrowRight, Timer } from "lucide-react"
import { SEOHead } from "../../../components/seo/SEOHead"
import { canonicalFor } from "@/lib/canonical"
import { generateBreadcrumbSchema } from "../../../lib/seo/schema"
import { QuizRunner } from "../../../components/quiz/QuizRunner"
import { useQuizQuestions } from "../../../hooks/useQuizQuestions"
import { useQuizProgress } from "../../../hooks/useQuizProgress"
import { saveAttempt } from "../../../lib/quiz/repository"
import type { ConcoursBody } from "../../../types/quiz"

const BODIES: Array<{ id: ConcoursBody; label: string; hint: string }> = [
  { id: "police", label: "الأمن الوطني", hint: "مباراة الشرطة: النظام العام، المسطرة الجنائية، الثقافة العامة." },
  { id: "judiciary", label: "القضاء وكتابة الضبط", hint: "المعهد العالي للقضاء، التنظيم القضائي، المساطر." },
  { id: "civil_service", label: "الوظيفة العمومية", hint: "النظام الأساسي للوظيفة العمومية، الإدارة الترابية، الدستور." },
  { id: "auxiliary", label: "القوات المساعدة", hint: "المهام الميدانية والتنظيم الإداري الترابي." },
  { id: "customs", label: "الجمارك", hint: "التشريع الجمركي، الاستيراد والتصدير، المخالفات." },
  { id: "general", label: "مباريات مشتركة", hint: "ثقافة عامة ودستورية مشتركة بين أغلب المباريات." },
]

const COUNTS = [10, 20, 30]

/**
 * اختبارات المباريات المهنية (/quiz/concours):
 * صيغة قريبة من الامتحانات الرسمية السابقة لمباريات الأمن الوطني، القوات
 * المساعدة، الجمارك، القضاء، والوظيفة العمومية، مع وضع مؤقّت يحاكي المباراة.
 */
export function ConcoursQuizPage() {
  const { questions } = useQuizQuestions("concours")
  const { recentQuestionIds, profile } = useQuizProgress()

  const [body, setBody] = useState<ConcoursBody | "all">("all")
  const [count, setCount] = useState(20)
  const [timed, setTimed] = useState(true)
  const [started, setStarted] = useState(false)

  const pool = useMemo(
    () => (body === "all" ? questions : questions.filter((question) => question.body === body)),
    [body, questions]
  )

  const label = body === "all" ? "المباريات المهنية (شامل)" : `${BODIES.find((item) => item.id === body)?.label ?? ""}`

  if (started) {
    return (
      <main className="container-wide py-10" dir="rtl">
        <SEOHead title={`اختبار مباراة ${label}`} description={`تدريب على صيغة أسئلة ${label}`} />
        <QuizRunner
          questions={pool}
          mode="concours"
          label={label}
          tier="concours"
          questionCount={Math.min(count, pool.length)}
          excludeIds={recentQuestionIds}
          secondsPerQuestion={timed ? 60 : undefined}
          onExit={() => setStarted(false)}
          onComplete={(attempt) => void saveAttempt(attempt, profile?.username ?? null)}
        />
      </main>
    )
  }

  return (
    <main className="container-wide py-10" dir="rtl">
      <SEOHead
        title="اختبارات المباريات المهنية — الأمن الوطني، القضاء، الوظيفة العمومية"
        description="تدريب على صيغة أسئلة المباريات الرسمية بالمغرب: الأمن الوطني، القوات المساعدة، الجمارك، القضاء، والوظيفة العمومية، مع وضع مؤقّت يحاكي ظروف المباراة."
        canonicalUrl={canonicalFor("/quiz/concours")}
        keywords={["مباراة الأمن الوطني", "مباراة القضاء", "الوظيفة العمومية المغرب", "concours Maroc"]}
        schema={[
          generateBreadcrumbSchema([
            { name: "الرئيسية", url: "/" },
            { name: "الاختبارات", url: "/quiz" },
            { name: "المباريات المهنية", url: "/quiz/concours" },
          ]),
        ]}
      />

      <div className="mb-6 flex items-center gap-2 text-[12.5px] font-bold text-muted-foreground">
        <Link to="/quiz" className="hover:text-foreground">
          الاختبارات
        </Link>
        <ArrowRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">المباريات المهنية</span>
      </div>

      <header className="rounded-2xl border border-border bg-card p-6">
        <span className="mb-3 grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
          <ShieldCheck className="size-5" strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-black text-foreground">اختبارات المباريات المهنية</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-muted-foreground">
          أسئلة تخصصية بصيغة قريبة من الامتحانات الرسمية السابقة، حتى تتدرّب على الشكل الحقيقي للسؤال
          لا على مضمونه فقط. فعّل الوضع المؤقّت لتعيش ضغط الوقت كما في قاعة المباراة.
        </p>
      </header>

      {/* الجهة المنظمة */}
      <section className="mt-6">
        <h2 className="mb-3 text-[15px] font-extrabold text-foreground">المباراة المستهدفة</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setBody("all")}
            className={`rounded-2xl border p-4 text-right transition ${
              body === "all"
                ? "border-primary bg-primary/[0.06]"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <p className="text-[14px] font-extrabold text-foreground">كل المباريات</p>
            <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
              مزيج من كل الجهات ({questions.length} سؤالاً) — مثالي للتقييم الشامل.
            </p>
          </button>
          {BODIES.map((item) => {
            const total = questions.filter((question) => question.body === item.id).length
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setBody(item.id)}
                className={`rounded-2xl border p-4 text-right transition ${
                  body === item.id
                    ? "border-primary bg-primary/[0.06]"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <p className="text-[14px] font-extrabold text-foreground">{item.label}</p>
                <p className="mt-1 text-[12px] leading-6 text-muted-foreground">{item.hint}</p>
                <p className="mt-1.5 text-[11px] font-bold text-primary">{total} سؤالاً</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* الإعدادات */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-extrabold text-foreground">عدد الأسئلة</p>
            <p className="mt-1 text-[12px] font-semibold text-muted-foreground">{pool.length} سؤالاً متاحاً</p>
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

        <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
          <span className="flex items-center gap-2">
            <Timer className="size-4 text-amber-600" aria-hidden="true" />
            <span className="text-[13px] font-extrabold text-foreground">الوضع المؤقّت</span>
            <span className="text-[11.5px] font-semibold text-muted-foreground">60 ثانية لكل سؤال</span>
          </span>
          <input
            type="checkbox"
            checked={timed}
            onChange={(event) => setTimed(event.target.checked)}
            className="size-4 accent-primary"
          />
        </label>

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
