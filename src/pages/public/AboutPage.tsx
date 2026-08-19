import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { GraduationCap, Linkedin, Target, ShieldAlert } from "lucide-react"

const LINKEDIN_URL = "https://www.linkedin.com/in/mohamed-reda-yassin-05069533b"
const CONTACT_EMAIL = "contact@mizan.page"

export function AboutPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: "من نحن", url: "/about" },
  ])

  // بيانات هيكلية عن الشخص القائم على المنصة (Schema.org Person)
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Mohamed Reda Yassin",
    jobTitle: "طالب في القانون الخاص",
    sameAs: [LINKEDIN_URL],
    affiliation: {
      "@type": "CollegeOrUniversity",
      name: "جامعة عبد المالك السعدي",
      alternateName: "Université Abdelmalek Essaadi",
    },
  }

  return (
    <>
      <SEOHead
        title="من نحن"
        description="تعرّف على القائم على منصة الميزان الرقمية، طالب قانون خاص بكلية العلوم القانونية والاقتصادية والاجتماعية بطنجة، جامعة عبد المالك السعدي."
        schema={[breadcrumbSchema, personSchema]}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Target size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">من نحن</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            القصة والدافع وراء منصة الميزان الرقمية.
          </p>
        </header>

        <div className="space-y-8">
          <Section title="رسالة المنصة">
            <p>
              انطلقت "الميزان الرقمية" كمبادرة طلابية مستقلة تهدف إلى تجميع الأرشيف الدراسي
              والملخصات والمعجم القانوني والمقالات في مكان واحد، لمساعدة طلبة القانون بالمغرب على
              تنظيم مراجعتهم والوصول إلى موارد موثوقة بسهولة.
            </p>
          </Section>

          <Section title="من يقف وراء المنصة؟">
            <p>
              أنا <strong className="text-foreground">Mohamed Reda Yassin</strong>، طالب في شعبة
              القانون الخاص، السنة الثالثة إجازة، بكلية العلوم القانونية والاقتصادية والاجتماعية
              بطنجة، التابعة لجامعة عبد المالك السعدي. أطلقت هذه المنصة كمشروع شخصي لمساعدة زملائي
              الطلبة على الاستفادة من تجربتي في تنظيم المراجعة والوصول إلى الموارد القانونية.
            </p>

            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground transition hover:border-primary/50 hover:text-primary"
            >
              <Linkedin size={16} />
              تواصل معي على LinkedIn
            </a>
          </Section>

          <Section title="المؤسسة الأكاديمية">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:justify-center">
              <img
                src="/images/about/logo-uae.jpg"
                alt="شعار جامعة عبد المالك السعدي"
                className="h-20 w-auto object-contain"
                loading="lazy"
              />
              <img
                src="/images/about/logo-fsjes.jpg"
                alt="شعار كلية العلوم القانونية والاقتصادية والاجتماعية بطنجة"
                className="h-16 w-auto object-contain"
                loading="lazy"
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <GraduationCap size={14} className="text-primary shrink-0" />
              <span>
                كلية العلوم القانونية والاقتصادية والاجتماعية بطنجة — جامعة عبد المالك السعدي
              </span>
            </div>
          </Section>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              مبادرة طلابية مستقلة غير رسمية، وغير ناطقة باسم الكلية أو الجامعة. المحتوى المنشور
              معدّ لأغراض تعليمية بحتة، وليس بديلاً عن الاستشارة القانونية المتخصصة — راجع{" "}
              <a href="/terms" className="underline font-semibold">
                الشروط وإخلاء المسؤولية
              </a>
              . لأي استفسار: {" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-semibold" dir="ltr">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
