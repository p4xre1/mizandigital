import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { ShieldCheck } from "lucide-react"

const LAST_UPDATED = "25 غشت 2026"
const CONTACT_EMAIL = "contact@mizan.page"

export function PrivacyPolicyPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: "سياسة الخصوصية", url: "/privacy" },
  ])

  return (
    <>
      <SEOHead
        title="سياسة الخصوصية"
        description="تعرّف على سياسة الخصوصية في منصة الميزان الرقمية: كيف نجمع بياناتك ونستخدمها ونحميها، بما في ذلك استخدام أدوات مثل Google Analytics وملفات تعريف الارتباط."
        schema={breadcrumbSchema}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">سياسة الخصوصية</h1>
          <p className="mt-2 text-xs text-muted-foreground">آخر تحديث: {LAST_UPDATED}</p>
        </header>

        <div className="space-y-8">
          <Section title="1. من نحن">
            <p>
              منصة "الميزان الرقمية" (المشار إليها بـ"المنصة" أو "نحن") هي منصة تعليمية عربية مستقلة
              موجهة لطلبة وباحثي القانون. هذه السياسة توضح البيانات التي نجمعها من زوار الموقع
              mizan.page، وكيفية استخدامها وحمايتها.
            </p>
          </Section>

          <Section title="2. البيانات التي نجمعها">
            <p>لا نطلب من الزوار إنشاء حساب أو تقديم بيانات شخصية لتصفح المحتوى العام. مع ذلك نجمع تلقائياً:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li>بيانات استخدام مجهولة (الصفحات المزارة، مدة الجلسة، نوع الجهاز والمتصفح) عبر Google Analytics.</li>
              <li>عنوان IP بشكل مجهول جزئياً (Anonymized IP) لأغراض إحصائية فقط.</li>
              <li>البريد الإلكتروني في حال تواصلتم معنا طوعاً عبر صفحة اتصل بنا أو البريد المباشر.</li>
            </ul>
          </Section>

          <Section title="3. استخدام Google Analytics وGoogle AdSense (أدوات وإعلانات Google)">
            <p>
              نستخدم <strong>Google Analytics (GA4)</strong> و<strong>Google Tags</strong> لفهم كيفية
              استخدام زوارنا للموقع، وقياس أداء الصفحات، وتحسين تجربة المستخدم. هذه الأدوات قد تضع
              ملفات تعريف ارتباط (كوكيز) على جهازكم — راجع{" "}
              <Link to="/cookies" title="سياسة استخدام ملفات تعريف الارتباط (الكوكيز)" className="underline font-semibold text-primary">
                سياسة الكوكيز
              </Link>{" "}
              لتفاصيل هذه الملفات وكيفية التحكم بها.
            </p>
            <p>
              كما نستخدم <strong>Google AdSense</strong> لعرض إعلانات على الموقع كمصدر تمويل يساعدنا
              على استمرارية المنصة مجاناً. يستخدم Google AdSense وشركاؤه الإعلانيون (بما فيهم Google
              DoubleClick) كوكيز الطرف الثالث لعرض إعلانات بناءً على زياراتكم لهذا الموقع ومواقع أخرى
              على الإنترنت. يمكنكم تعطيل الإعلانات المخصَّصة (Personalized Ads) عبر{" "}
              <a
                href="https://adssettings.google.com"
                title="إعدادات إعلانات Google"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-primary"
              >
                إعدادات إعلانات Google
              </a>
              {" "}أو عبر{" "}
              <a
                href="https://www.aboutads.info/choices/"
                title="خيارات الإعلانات الرقمية — aboutads.info"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-primary"
              >
                www.aboutads.info
              </a>
              .
            </p>
            <p>
              لا يتم تفعيل كوكيز التحليل أو الإعلانات إلا بعد موافقتكم الصريحة عبر شريط إشعار الكوكيز
              الذي يظهر عند أول زيارة، تماشياً مع وضع الموافقة من Google (Google Consent Mode).
              يمكنكم سحب موافقتكم في أي وقت من خلال صفحة{" "}
              <Link to="/cookies" title="سياسة استخدام ملفات تعريف الارتباط (الكوكيز)" className="underline font-semibold text-primary">
                سياسة الكوكيز
              </Link>
              ، أو إعدادات المتصفح، أو مسح بيانات الموقع المحلية.
            </p>
            <p>
              لمزيد من المعلومات حول ممارسات Google في الخصوصية، يمكنكم مراجعة{" "}
              <a
                href="https://policies.google.com/privacy"
                title="سياسة خصوصية Google"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-primary"
              >
                سياسة خصوصية Google
              </a>
              .
            </p>
          </Section>

          <Section title="4. كيف نستخدم البيانات">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>تحليل أداء الصفحات وتحسين تجربة الاستخدام والمحتوى المقدَّم.</li>
              <li>الرد على استفساراتكم في حال تواصلتم معنا عبر البريد الإلكتروني.</li>
              <li>حماية المنصة من الاستخدام غير المشروع أو المسيء.</li>
            </ul>
            <p>
              لا نبيع بياناتكم الشخصية لأي طرف ثالث. قد تُستخدم بيانات تصفح مجهولة، بموافقتكم، من قِبل
              Google AdSense لعرض إعلانات (مخصَّصة أو غير مخصَّصة حسب اختياركم) — راجع القسم الثالث
              أعلاه للتفاصيل وكيفية التحكم بذلك.
            </p>
          </Section>

          <Section title="5. مشاركة البيانات مع أطراف ثالثة">
            <p>
              قد تتم مشاركة بيانات استخدام مجهولة مع مزودي خدمات تقنية نعتمد عليهم لتشغيل المنصة
              (مثل Google لأدوات التحليل وإعلانات AdSense، ومزود الاستضافة وقاعدة البيانات Supabase)،
              وذلك فقط بالقدر اللازم لتشغيل الموقع، تحليل أدائه، وعرض الإعلانات.
            </p>
          </Section>

          <Section title="6. حقوقكم">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>الحق في معرفة البيانات التي قد تكون محفوظة عنكم (كرسائل التواصل).</li>
              <li>الحق في طلب حذف بياناتكم الشخصية المرسلة عبر البريد الإلكتروني.</li>
              <li>الحق في سحب الموافقة على ملفات تعريف الارتباط التحليلية في أي وقت.</li>
            </ul>
            <p>
              لممارسة أي من هذه الحقوق، راسلونا على{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} title="راسلنا عبر البريد الإلكتروني" className="underline font-semibold text-primary" dir="ltr">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="7. أمان البيانات">
            <p>
              نتخذ إجراءات تقنية وتنظيمية معقولة لحماية البيانات التي نتلقاها، غير أنه لا يمكن ضمان
              أمان مطلق لأي نقل بيانات عبر الإنترنت.
            </p>
          </Section>

          <Section title="8. التعديلات على هذه السياسة">
            <p>
              قد نحدّث هذه السياسة من وقت لآخر لتعكس تغييرات في ممارساتنا أو لأسباب تشغيلية أو قانونية.
              سيُشار إلى تاريخ آخر تحديث أعلى هذه الصفحة عند إجراء أي تعديل جوهري.
            </p>
          </Section>

          <Section title="9. تواصل معنا">
            <p>
              لأي استفسار بخصوص هذه السياسة، راسلونا على{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} title="راسلنا عبر البريد الإلكتروني" className="underline font-semibold text-primary" dir="ltr">
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
