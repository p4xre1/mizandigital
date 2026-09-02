import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Cookie } from "lucide-react"
import { getStoredConsent, setStoredConsent } from "../lib/utils/cookieConsent"

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // نعرض الشريط فقط إن لم يسبق للزائر اتخاذ قرار (لا يوجد قيمة محفوظة بعد)
    if (getStoredConsent() === null) {
      setVisible(true)
    }
  }, [])

  const handleChoice = (value: "granted" | "denied") => {
    setStoredConsent(value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-live="polite"
      aria-label="إشعار ملفات تعريف الارتباط"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300"
    >
      <div className="container-wide flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Cookie size={18} />
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground max-w-2xl">
            نستخدم ملفات تعريف الارتباط (الكوكيز) لأغراض تحليلية عبر Google Analytics ولعرض إعلانات
            عبر شبكات إعلانية (مثل Adsterra)، بما قد يشمل إعلانات مخصَّصة حسب اهتماماتكم. يمكنكم قبول ذلك أو رفضه،
            وسيبقى الموقع يعمل بشكل طبيعي في الحالتين. لمزيد من التفاصيل راجعوا{" "}
            <Link to="/cookies" title="سياسة استخدام ملفات تعريف الارتباط (الكوكيز)" className="underline font-semibold text-primary">
              سياسة الكوكيز
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleChoice("denied")}
            className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
          >
            رفض
          </button>
          <button
            type="button"
            onClick={() => handleChoice("granted")}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
          >
            قبول
          </button>
        </div>
      </div>
    </div>
  )
}
