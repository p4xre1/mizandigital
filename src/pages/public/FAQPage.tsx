import { useState } from "react"
import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { generateFAQSchema, generateBreadcrumbSchema } from "../../lib/seo/schema"
import { HelpCircle, ChevronDown, Mail } from "lucide-react"

interface FaqItem {
  question: string
  answer: string
}

interface FaqGroup {
  title: string
  items: FaqItem[]
}

const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "عام حول المنصة",
    items: [
      {
        question: "ما هي منصة الميزان الرقمية؟",
        answer:
          "الميزان الرقمية منصة تعليمية عربية مستقلة موجهة لطلبة وباحثي القانون بالمغرب. نوفر أرشيفاً دراسياً وملخصات، معجماً قانونياً، مقالات ودراسات، وأخباراً تشريعية، ودليلاً لكليات الحقوق. المحتوى معدّ لأغراض تعليمية بحتة.",
      },
      {
        question: "هل المنصة تابعة لجهة حكومية أو نقابة محامين؟",
        answer:
          "لا. الميزان الرقمية مبادرة مستقلة غير حكومية، ولا تمثل أي وزارة أو نقابة أو مؤسسة رسمية. الهدف منها مساعدة الطلبة على تنظيم مراجعتهم والوصول لمصادر موثوقة.",
      },
      {
        question: "هل استخدام المنصة مجاني؟",
        answer:
          "نعم، جميع المحتويات المتاحة حالياً (الملخصات، المعجم، المقالات، الأخبار) مجانية بالكامل لأي زائر دون الحاجة لإنشاء حساب.",
      },
    ],
  },
  {
    title: "المحتوى والدقة العلمية",
    items: [
      {
        question: "من يكتب أو يراجع المحتوى المنشور؟",
        answer:
          "يُعدّ المحتوى بمساهمة طلبة وباحثين، ويخضع لمراجعة داخلية قبل النشر عبر لوحة التحكم. مع ذلك يبقى المحتوى ذا طابع تعليمي مساعد، ولا يغني عن الرجوع إلى النصوص القانونية الرسمية والمراجع المعتمدة.",
      },
      {
        question: "وجدت خطأ أو معلومة قديمة في مقال أو ملخص، ماذا أفعل؟",
        answer:
          "نرحب بالتصحيحات. راسلنا عبر صفحة اتصل بنا أو مباشرة على contact@mizan.page مع ذكر رابط الصفحة والملاحظة، وسنراجعها في أقرب وقت ممكن.",
      },
      {
        question: "هل يمكنني الاعتماد على المنصة بدلاً من محاضرات الأستاذ أو الكتب المقررة؟",
        answer:
          "لا ننصح بذلك. المنصة أداة مساعدة للمراجعة والتنظيم، وليست بديلاً عن المقرر الرسمي أو محاضرات الأستاذ أو المراجع الأكاديمية المعتمدة في كليتك.",
      },
    ],
  },
  {
    title: "الاستشارات القانونية",
    items: [
      {
        question: "هل يمكنني الحصول على استشارة قانونية لقضيتي عبر المنصة؟",
        answer:
          "لا. الميزان الرقمية منصة تعليمية وليست مكتب استشارات قانونية، ولا تقدّم أي رأي أو استشارة قانونية بخصوص حالات شخصية. لأي قضية أو نزاع فعلي يجب استشارة محامٍ مرخّص أو جهة قانونية مختصة.",
      },
      {
        question: "هل المقالات المنشورة تعتبر رأياً قانونياً ملزماً؟",
        answer:
          "لا. المقالات والتحليلات المنشورة تعبّر عن فهم أكاديمي أو تلخيصي للموضوع، ولا تشكل رأياً قانونياً رسمياً ولا تنشئ أي علاقة محامٍ-موكل بين المنصة وقارئها.",
      },
    ],
  },
  {
    title: "الحساب والخصوصية",
    items: [
      {
        question: "هل تجمعون بياناتي الشخصية؟",
        answer:
          "نستخدم أدوات تحليل مثل Google Analytics لفهم كيفية استخدام الموقع وتحسينه، وذلك فقط بعد موافقتكم على ملفات تعريف الارتباط (الكوكيز). لمزيد من التفاصيل راجع سياسة الخصوصية وسياسة الكوكيز.",
      },
      {
        question: "كيف يمكنني حذف بياناتي أو الاعتراض على معالجتها؟",
        answer:
          "راسلنا على contact@mizan.page وسنستجيب لطلبك في أقرب وقت ممكن، وفق ما هو موضح في سياسة الخصوصية.",
      },
    ],
  },
  {
    title: "المساهمة والتعاون",
    items: [
      {
        question: "هل يمكنني المساهمة بمقال أو ملخص؟",
        answer:
          "نعم، يسعدنا استقبال مساهمات الطلبة والباحثين. راسلنا على contact@mizan.page مع نبذة عن المحتوى المقترح وسنعاود التواصل معكم.",
      },
      {
        question: "هل تقبلون طلبات شراكة مع كليات أو جمعيات طلابية؟",
        answer:
          "نعم، نرحب بالتعاون مع كليات الحقوق والجمعيات الطلابية والمبادرات الأكاديمية. يرجى التواصل معنا عبر البريد الإلكتروني لمناقشة التفاصيل.",
      },
    ],
  },
]

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
  const faqSchema = generateFAQSchema(allFaqs)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: "الأسئلة الشائعة", url: "/faq" },
  ])

  return (
    <>
      <SEOHead
        title="الأسئلة الشائعة"
        description="إجابات وافية عن أكثر الأسئلة تكراراً حول منصة الميزان الرقمية: طبيعة المحتوى، الاستشارات القانونية، سياسة الخصوصية، وكيفية المساهمة في إثراء المنصة."
        schema={[faqSchema, breadcrumbSchema]}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <HelpCircle size={26} />
          </div>
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
