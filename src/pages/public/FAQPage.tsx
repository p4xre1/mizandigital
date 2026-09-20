import { useState } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateFAQSchema, generateBreadcrumbSchema } from "../../lib/seo/schema"
import { ChevronDown, Mail } from "lucide-react"
import faqData from "../../data/faq.json"

interface FaqItem {
  question: string
  answer: string
}

interface FaqGroup {
  title: string
  items: FaqItem[]
}

const FAQ_GROUPS: FaqGroup[] = faqData

function AccordionItem({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-right"
      >
        <span className="text-sm font-bold text-foreground">{item.question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-xs md:text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
          {item.answer}
        </div>
      )}
    </div>
  )
}

export function FAQPage() {
  const [openKey, setOpenKey] = useState<string | null>(null)

  const allFaqs = FAQ_GROUPS.flatMap((group) => group.items)

  return (
    <>
      <AEOHead
        title="الأسئلة الشائعة"
        description="إجابات وافية عن أكثر الأسئلة تكراراً حول منصة الميزان الرقمية: طبيعة المحتوى، الاستشارات القانونية، سياسة الخصوصية، وكيفية المساهمة في إثراء المنصة."
        directAnswer="الأسئلة الشائعة حول ميزان الرقمية: المنصة تعليمية مجانية لطلبة الحقوق بالمغرب، لا تقدم استشارة قانونية، المحتوى يشمل ملخصات S1-S6، قاموس قانوني 250 مصطلح، دليل 21 كلية، واختبارات قانونية."
        faq={allFaqs}
        breadcrumbs={[{ name: "الرئيسية", url: "/" }, { name: "الأسئلة الشائعة", url: "/faq" }]}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-black text-foreground md:text-3xl">الأسئلة الشائعة</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            تجمع هذه الصفحة أكثر الأسئلة التي تصلنا حول طبيعة المنصة ومحتواها واستخدامها.
          </p>
        </header>

        <div className="space-y-8">
          {FAQ_GROUPS.map((group) => (
            <section key={group.title}>
              <h2 className="mb-3 text-sm font-extrabold text-primary">{group.title}</h2>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const key = `${group.title}-${item.question}`
                  return (
                    <AccordionItem
                      key={key}
                      item={item}
                      isOpen={openKey === key}
                      onToggle={() => setOpenKey((prev) => (prev === key ? null : key))}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <Mail size={22} className="text-primary" />
          <p className="text-sm font-bold text-foreground">لم تجد إجابة سؤالك؟</p>
          <p className="text-xs text-muted-foreground">راسلنا مباشرة وسنجيبك في أقرب وقت ممكن.</p>
          <Link
            to="/contact"
            title="اتصل بفريق ميزان الرقمية"
            className="mt-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
          >
            تواصل معنا
          </Link>
        </div>
      </main>
    </>
  )
}
