import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { Scale, ShieldAlert } from "lucide-react"

const LAST_UPDATED = "19 غشت 2026"
const CONTACT_EMAIL = "contact@mizan.page"

export function TermsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: "الشروط والأحكام", url: "/terms" },
  ])

  return (
    <>
      <SEOHead
        title="الشروط والأحكام وإخلاء المسؤولية"
        description="شروط استخدام منصة الميزان الرقمية، وإخلاء مسؤولية يوضح أن المنصة تعليمية بحتة وليست بديلاً عن الاستشارة القانونية."
        schema={breadcrumbSchema}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Scale size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">الشروط والأحكام</h1>
          <p className="mt-2 text-xs text-muted-foreground">آخر تحديث: {LAST_UPDATED}</p>
        </header>

        {/* إخلاء المسؤولية البارز - أهم عنصر في هذه الصفحة */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5">
          <ShieldAlert size={22} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-xs md:text-sm leading-relaxed text-amber-900 dark:text-amber-200">
            <p className="mb-1.5 font-extrabold">إخلاء مسؤولية مهم — يرجى القراءة بعناية</p>
            <p>
              منصة "الميزان الرقمية" هي <strong>منصة تعليمية بحتة</strong> موجهة لطلبة وباحثي القانون،
              وليست مكتب محاماة ولا جهة استشارات قانونية. المحتوى المنشور (ملخصات، مقالات، معجم،
              أخبار) معدّ لأغراض دراسية ومعرفية فقط، ولا يشكل استشارة قانونية أو رأياً قانونياً
              رسمياً، ولا ينشئ أي علاقة محامٍ-موكل بينكم وبين المنصة أو القائمين عليها. لأي حالة أو
              نزاع قانوني فعلي، يجب استشارة محامٍ مرخّص أو جهة قانونية مختصة.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <Section title="1. قبول الشروط">
            <p>
              باستخدامكم لموقع mizan.page ("المنصة")، فإنكم توافقون على الالتزام بهذه الشروط والأحكام
              كاملة. إن لم توافقوا عليها، يرجى التوقف عن استخدام المنصة.
            </p>
          </Section>

          <Section title="2. طبيعة المنصة">
            <p>
              الميزان الرقمية منصة تعليمية عربية مستقلة، غير ربحية وغير تابعة لأي جهة حكومية أو نقابة
              مهنية، هدفها مساعدة طلبة كليات الحقوق على تنظيم مراجعتهم والوصول إلى موارد ومصطلحات
              قانونية بشكل مبسّط.
            </p>
          </Section>

          <Section title="3. دقة المحتوى">
            <p>
              نبذل جهداً معقولاً للتأكد من دقة المحتوى وتحديثه، إلا أننا لا نضمن خلوّه التام من
              الأخطاء أو أنه محدَّث بشكل دائم وفق آخر التعديلات التشريعية. يبقى الرجوع إلى النصوص
              القانونية الرسمية المنشورة بالجريدة الرسمية والمراجع الأكاديمية المعتمدة هو المرجع
              الأساسي والملزم.
            </p>
          </Section>

          <Section title="4. الاستخدام المسموح به">
            <ul className="list-disc pr-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              <li>يجوز لكم تصفح المحتوى واستخدامه لأغراض دراسية وشخصية غير تجارية.</li>
              <li>يُمنع إعادة نشر أو نسخ المحتوى بشكل جماعي أو تجاري دون إذن كتابي مسبق.</li>
              <li>يُمنع استخدام المنصة بأي شكل يخالف القانون أو يضر بالغير أو بالمنصة نفسها.</li>
            </ul>
          </Section>

          <Section title="5. الملكية الفكرية">
            <p>
              جميع الحقوق المتعلقة بتصميم المنصة والمحتوى الأصلي المنشور عليها محفوظة لصالح الميزان
              الرقمية أو لمالكيها الأصليين، ما لم يُذكر خلاف ذلك.
            </p>
          </Section>

          <Section title="6. حدود المسؤولية">
            <p>
              لا تتحمل المنصة أو القائمون عليها أي مسؤولية عن أي قرار قانوني أو أكاديمي أو شخصي
              يُتَّخذ اعتماداً كلياً على محتوى المنصة دون الرجوع إلى مصادر رسمية أو استشارة مختص. كما
              لا نتحمل مسؤولية أي انقطاع مؤقت في الخدمة أو أخطاء تقنية خارجة عن إرادتنا المعقولة.
            </p>
          </Section>

          <Section title="7. الروابط الخارجية">
            <p>
              قد تتضمن المنصة روابط لمواقع خارجية (كمواقع رسمية أو مراجع أكاديمية). لا نتحمل مسؤولية
              محتوى هذه المواقع أو ممارساتها المتعلقة بالخصوصية.
            </p>
          </Section>

          <Section title="8. التعديلات على الشروط">
            <p>
              يجوز لنا تحديث هذه الشروط من وقت لآخر. يعني استمراركم في استخدام المنصة بعد أي تعديل
              موافقتكم على الشروط المحدَّثة.
            </p>
          </Section>

          <Section title="9. القانون المطبَّق">
            <p>تخضع هذه الشروط وتُفسَّر وفقاً للقوانين المعمول بها في المملكة المغربية.</p>
          </Section>

          <Section title="10. تواصل معنا">
            <p>
              لأي استفسار بخصوص هذه الشروط، راسلونا على{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-semibold text-primary" dir="ltr">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
    </>
  )
}
