import { AEOHead } from "../../components/seo/AEOHead"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { LegalBlocks } from "../../components/legal/LegalBlocks"
import { Scale, ShieldAlert, CreditCard } from "lucide-react"
import { TERMS_POLICY } from "@/content/legal/policies.js"

/**
 * المحتوى من src/content/legal/policies.js — نفس المصدر الذي يبني منه
 * scripts/prerender.mjs الـ HTML المنشور.
 */
export function TermsPage() {
  return (
    <>
      <AEOHead
        title={TERMS_POLICY.title}
        description={TERMS_POLICY.description}
        directAnswer={TERMS_POLICY.directAnswer}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "الشروط والأحكام", url: "https://www.mizan.page/terms" },
        ]}
        faq={TERMS_POLICY.faq}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Scale size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">{TERMS_POLICY.heading}</h1>
          <p className="mt-2 text-xs text-muted-foreground">{TERMS_POLICY.updatedNote}</p>
        </header>

        <div className="mb-8 flex items-start gap-3 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5">
          <ShieldAlert size={22} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-xs md:text-sm leading-relaxed text-amber-900 dark:text-amber-200">
            <p className="mb-1.5 font-extrabold">إخلاء مسؤولية مهم — يرجى القراءة بعناية</p>
            <p>
              منصة "الميزان الرقمية" هي <strong>منصة تعليمية بحتة</strong> موجهة لطلبة وباحثي القانون،
              وليست مكتب محاماة ولا جهة استشارات قانونية. المحتوى المنشور (ملخصات، مقالات، معجم 250
              مصطلح، أخبار 13، دليل 21 كلية، اختبارات 4 مسارات) معدّ لأغراض دراسية ومعرفية فقط، ولا
              يشكل استشارة قانونية أو رأياً قانونياً رسمياً، ولا ينشئ أي علاقة محامٍ-موكل. لأي حالة أو
              نزاع قانوني فعلي، يجب استشارة محامٍ مرخّص.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CreditCard size={16} className="text-primary" /> ملخص سياسة الاشتراك (مهم)
          </div>
          <ul className="list-disc pr-5 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li>
              <strong>Mizan Pro شهري:</strong> 49 د.م — 500 كريدتس، مزايا: شجرة قوانين متقدمة، تحديات
              مميزة، دعم أولوية
            </li>
            <li>
              <strong>Mizan Pro سنوي:</strong> 399 د.م — 7000 كريدتس + 1000 هدية، خصم 32%
            </li>
            <li>
              <strong>باقات كريدتس:</strong> 100 (19 د.م) — 350 (49 د.م) — 800 (99 د.م) — 2000 (199 د.م)
            </li>
            <li>
              <strong>البيع نهائي:</strong> لا إلغاء ولا استرداد خلال المدة النشطة
            </li>
            <li>
              <strong>بعد الانتهاء:</strong> ينتهي الوصول لمزايا Pro تلقائياً، يجب الدفع مجدداً
              للاستمرار — لا تجديد تلقائي إجباري
            </li>
            <li>
              <strong>حذف الحساب:</strong> غير متاح ذاتياً، يجب طلب عبر البريد (GDPR)
            </li>
          </ul>
        </div>

        <div className="space-y-8">
          {TERMS_POLICY.sections.map((section) => (
            <Section key={section.title} title={section.title}>
              <LegalBlocks blocks={section.blocks} />
            </Section>
          ))}
        </div>
      </main>
    </>
  )
}
