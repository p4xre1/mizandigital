import { useState } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"

interface FaqItem {
  question: string
  answer: string
}

interface HomeFaqSectionProps {
  lexiconCount: number
  articlesCount: number
  schoolsCount: number
}

export function HomeFaqSection({ lexiconCount, articlesCount, schoolsCount }: HomeFaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  // نفس الأسئلة والأجوبة الموثّقة المستعملة فـ محتوى SEO الثابت
  // (scripts/prerender.mjs) — حفاظاً على تطابق المعلومة فـ كل الموقع
  const faqs: FaqItem[] = [
    {
      question: "ماذا تقدم ميزان الرقمية؟",
      answer: `تجمع المنصة حالياً ${lexiconCount} مصطلحاً قانونياً، و${articlesCount} مقالاً، إضافة إلى دليل يضم ${schoolsCount} كلية أو مؤسسة جامعية، بجانب الأخبار والندوات والمواد الدراسية. يتم تحديث هذه البيانات مع إضافة مواد جديدة.`,
    },
    {
      question: "كيف يمكن للطالب استخدام ميزان الرقمية؟",
      answer: "أفضل نقطة بداية هي تحديد نوع المعلومة التي تبحث عنها: استخدم القاموس للمصطلحات القانونية، والأرشيف للمواد الدراسية، والمقالات للمنهجية والتحليل، والأخبار للمستجدات، ودليل الكليات للحصول على معلومات المؤسسات الجامعية.",
    },
    {
      question: "ما هو القاموس القانوني في ميزان الرقمية؟",
      answer: `أداة بحث للمصطلحات القانونية تعرض المصطلح بالعربية والفرنسية مع تعريف مختصر، ويمكن أن يتضمن إحالات إلى مصادر أو نصوص قانونية مرتبطة بالمصطلح. يحتوي القاموس حالياً على ${lexiconCount} مصطلحاً.`,
    },
    {
      question: "ما هي مراحل الدراسة S1 إلى S6؟",
      answer: "يقسم الأرشيف الدراسي فـ ميزان الرقمية المواد إلى ستة فصول: S1 وS2 وS3 وS4 وS5 وS6، بما يساعد الطالب على الوصول إلى المواد وفق المرحلة الدراسية.",
    },
    {
      question: "ما هي مصادر المعلومات القانونية؟",
      answer: "يجب التعامل مع ميزان الرقمية باعتبارها منصة تعليمية وبحثية، وليس بديلاً عن النص القانوني الرسمي. عند دراسة قاعدة قانونية، يُنصح بالرجوع إلى الجريدة الرسمية والنص التشريعي الرسمي والمصادر الجامعية أو المؤسساتية ذات الصلة.",
    },
  ]

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }

  return (
    <section className="py-16 border-t border-border" aria-labelledby="home-faq-heading">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3">
            <HelpCircle size={14} />
            <span>الأسئلة الشائعة</span>
          </div>
          <h2 id="home-faq-heading" className="text-2xl font-black text-foreground sm:text-3xl">
            كل ما تحتاج معرفته عن المنصة
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={faq.question}
                className="rounded-2xl border border-border bg-card overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right"
                >
                  <span className="text-sm font-bold text-foreground">{faq.question}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-xs leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
