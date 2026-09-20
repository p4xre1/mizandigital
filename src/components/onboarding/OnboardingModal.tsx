import { useState } from "react"
import { X, Loader2, Check } from "lucide-react"
import type { OnboardingInterest, OnboardingPayload, OnboardingUserType } from "@/lib/onboarding/api"

interface OnboardingModalProps {
  onSubmit: (payload: OnboardingPayload) => Promise<void>
  onDismiss: () => void
}

const USER_TYPE_OPTIONS: { value: OnboardingUserType; label: string }[] = [
  { value: "student", label: "طالب" },
  { value: "teacher", label: "أستاذ/ة" },
  { value: "normal", label: "شخص عادي" },
  { value: "license", label: "حاصل على الإجازة" },
  { value: "master", label: "ماستر" },
  { value: "doctorate", label: "دكتوراه" },
  { value: "startup", label: "ستارت أب" },
  { value: "company", label: "شركة" },
]

const REFERRAL_OPTIONS = [
  "محرك بحث (Google)",
  "إنستغرام",
  "فيسبوك",
  "تيك توك",
  "صديق أو زميل",
  "أستاذ/ة",
  "أخرى",
]

const INTEREST_OPTIONS: { value: OnboardingInterest; label: string }[] = [
  { value: "lexicon", label: "المصطلحات القانونية" },
  { value: "schools", label: "كليات الحقوق" },
  { value: "pdfs", label: "المكتبة والملخصات (PDF)" },
  { value: "articles", label: "المقالات" },
  { value: "news", label: "الأخبار" },
  { value: "events", label: "الندوات" },
]

/**
 * ملاحظة UX: الاستبيان قابل للتجاوز عبر زر الإغلاق (X) — ما كنخليوش
 * المستخدم "محبوس" فـ modal إجباري. onDismiss ما كيسجّلش أي جواب فـ
 * قاعدة البيانات، فالاستبيان غادي يبان مرة أخرى فـ الجلسة الجاية
 * (checkOnboardingCompleted كيرجع false لين المستخدم يكمّل ويضغط "إنهاء").
 */
export function OnboardingModal({ onSubmit, onDismiss }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [userType, setUserType] = useState<OnboardingUserType | null>(null)
  const [referralSource, setReferralSource] = useState<string | null>(null)
  const [otherReferral, setOtherReferral] = useState("")
  const [interests, setInterests] = useState<OnboardingInterest[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleInterest = (value: OnboardingInterest) => {
    setInterests((prev) => (prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]))
  }

  const canGoNext =
    (step === 1 && userType !== null) ||
    (step === 2 && referralSource !== null && (referralSource !== "أخرى" || otherReferral.trim().length > 0))

  const handleFinish = async () => {
    if (!userType || !referralSource) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        user_type: userType,
        referral_source: referralSource === "أخرى" ? otherReferral.trim() : referralSource,
        interests,
      })
    } catch {
      setError("تعذّر حفظ إجاباتك، حاول مرة أخرى.")
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق"
          className="absolute left-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        {/* مؤشّر التقدّم */}
        <div className="flex gap-1.5 px-6 pt-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="px-6 py-5">
          {step === 1 && (
            <>
              <h2 id="onboarding-modal-title" className="mb-1 text-lg font-bold text-foreground">
                مرحباً بك
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">من أنت؟ (اختر ما يصفك أكثر)</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                {USER_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUserType(opt.value)}
                    className={`rounded-xl border px-3 py-2.5 text-right text-sm font-semibold transition ${
                      userType === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-1 text-lg font-bold text-foreground">من أين سمعت عنا؟</h2>
              <p className="mb-4 text-sm text-muted-foreground">اختر مصدر واحد</p>
              <div className="flex flex-col gap-2">
                {REFERRAL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setReferralSource(opt)}
                    className={`rounded-xl border px-3.5 py-2.5 text-right text-sm font-semibold transition ${
                      referralSource === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
                {referralSource === "أخرى" && (
                  <input
                    type="text"
                    value={otherReferral}
                    onChange={(e) => setOtherReferral(e.target.value)}
                    placeholder="اكتب المصدر..."
                    className="mt-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    autoFocus
                  />
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="mb-1 text-lg font-bold text-foreground">ما الذي يهمك أكثر؟</h2>
              <p className="mb-4 text-sm text-muted-foreground">يمكنك اختيار أكثر من موضوع (اختياري)</p>
              <div className="flex flex-col gap-2">
                {INTEREST_OPTIONS.map((opt) => {
                  const checked = interests.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleInterest(opt.value)}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-right text-sm font-semibold transition ${
                        checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                      {checked && <Check className="size-4" />}
                    </button>
                  )
                })}
              </div>
              {error && <p className="mt-3 text-xs font-semibold text-destructive">{error}</p>}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className={`text-xs font-semibold text-muted-foreground transition hover:text-foreground ${
              step === 1 ? "invisible" : ""
            }`}
          >
            رجوع
          </button>

          {step < 3 ? (
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالي
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinish}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              إنهاء
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
