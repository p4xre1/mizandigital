import { useState } from "react"
import { AEOHead } from "../../components/seo/AEOHead"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { LegalBlocks } from "../../components/legal/LegalBlocks"
import { getStoredConsent, setStoredConsent, type ConsentValue } from "../../lib/utils/cookieConsent"
import { Cookie, Check, X, ShieldCheck } from "lucide-react"
import { COOKIE_POLICY, COOKIE_TABLE } from "@/content/legal/policies.js"

/**
 * جدول الكوكيز والنصوص من src/content/legal/policies.js — نفس المصدر الذي
 * يبني منه scripts/prerender.mjs الـ HTML المنشور.
 */
export function CookiePolicyPage() {
  const [consent, setConsent] = useState<ConsentValue | null>(() => getStoredConsent())

  const handleChoice = (value: ConsentValue) => {
    setStoredConsent(value)
    setConsent(value)
  }

  return (
    <>
      <AEOHead
        title={COOKIE_POLICY.title}
        description={COOKIE_POLICY.description}
        directAnswer={COOKIE_POLICY.directAnswer}
        breadcrumbs={[
          { name: "الرئيسية", url: "https://www.mizan.page/" },
          { name: "سياسة الكوكيز", url: "https://www.mizan.page/cookies" },
        ]}
        faq={COOKIE_POLICY.faq}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Cookie size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">{COOKIE_POLICY.heading}</h1>
          <p className="mt-2 text-xs text-muted-foreground">{COOKIE_POLICY.updatedNote}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={12} /> {COOKIE_POLICY.badge}
          </div>
        </header>

        <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h2 className="mb-2 text-sm font-extrabold text-emerald-900 dark:text-emerald-100">
            تحديث مهم: إزالة الإعلانات
          </h2>
          <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-200">
            ابتداءً من 15 شتنبر 2026، تمت <strong>إزالة Adsterra وكل شبكات الإعلانات</strong> نهائياً من
            ميزان الرقمية. لا نستخدم أي كوكيز إعلانية، لا تتبع بين المواقع، ولا بيع بيانات لمعلنين.
            التمويل الآن عبر <strong>Mizan Pro</strong> (اشتراك شهري 49 د.م / سنوي 399 د.م) وباقات
            الكريدتس فقط.
          </p>
        </div>

        {/* أداة التحكم بالموافقة — تفاعلية، فلا يمكن بناؤها مسبقاً */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold text-foreground">إدارة تفضيلاتكم الحالية</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            حالة الموافقة الحالية على كوكيز التحليل (Google Analytics فقط — لا إعلانات):{" "}
            <span
              className={
                consent === "granted"
                  ? "font-bold text-emerald-600 dark:text-emerald-400"
                  : consent === "denied"
                    ? "font-bold text-rose-600 dark:text-rose-400"
                    : "font-bold text-muted-foreground"
              }
            >
              {consent === "granted" ? "مقبولة" : consent === "denied" ? "مرفوضة" : "لم يُحدَّد بعد"}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleChoice("granted")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
            >
              <Check size={14} /> قبول التحليلات
            </button>
            <button
              type="button"
              onClick={() => handleChoice("denied")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
            >
              <X size={14} /> رفض التحليلات
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {COOKIE_POLICY.sections.map((section) => (
            <Section key={section.title} title={section.title}>
              <LegalBlocks blocks={section.blocks} />
            </Section>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          عدد المفاتيح الموثّقة: {COOKIE_TABLE.length}
        </p>
      </main>
    </>
  )
}
