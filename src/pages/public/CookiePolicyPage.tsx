import { useState } from "react"
import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { getStoredConsent, setStoredConsent, type ConsentValue } from "../../lib/utils/cookieConsent"
import { Cookie, Check, X } from "lucide-react"

const LAST_UPDATED = "25 غشت 2026"

const COOKIE_TABLE = [
  {
    name: "mizan-theme",
    provider: "الميزان الرقمية (محلي)",
    purpose: "حفظ تفضيلكم للوضع الليلي أو النهاري للموقع.",
    duration: "دائم (حتى المسح اليدوي)",
    type: "ضروري / وظيفي",
  },
  {
    name: "mizan-cookie-consent",
    provider: "الميزان الرقمية (محلي)",
    purpose: "حفظ قراركم بخصوص قبول أو رفض كوكيز التحليل.",
    duration: "دائم (حتى المسح اليدوي)",
    type: "ضروري",
  },
  {
    name: "_ga، _ga_*",
    provider: "Google Analytics",
    purpose: "تمييز الزوار وقياس الاستخدام والتنقل داخل الموقع بشكل مجهول إحصائياً.",
    duration: "حتى سنتين",
    type: "تحليلي (يتطلب موافقتكم)",
  },
  {
    name: "_gid",
    provider: "Google Analytics",
    purpose: "تمييز الزوار خلال 24 ساعة لأغراض إحصائية.",
    duration: "24 ساعة",
    type: "تحليلي (يتطلب موافقتكم)",
  },
  {
    name: "__gads، __gpi",
    provider: "Google AdSense",
    purpose: "قياس أداء الإعلانات وتحديد عدد مرات ظهورها للزائر.",
    duration: "حتى 13 شهراً",
    type: "إعلاني (يتطلب موافقتكم)",
  },
  {
    name: "IDE، test_cookie",
    provider: "Google DoubleClick",
    purpose: "عرض إعلانات ذات صلة باهتمامات الزائر عبر مواقع مختلفة، والتحقق من دعم المتصفح للكوكيز.",
    duration: "حتى 13 شهراً",
    type: "إعلاني (يتطلب موافقتكم)",
  },
]

export function CookiePolicyPage() {
  const [consent, setConsent] = useState<ConsentValue | null>(() => getStoredConsent())

  const handleChoice = (value: ConsentValue) => {
    setStoredConsent(value)
    setConsent(value)
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: "سياسة الكوكيز", url: "/cookies" },
  ])

  return (
    <>
      <SEOHead
        title="سياسة الكوكيز"
        description="تعرّف على ملفات تعريف الارتباط (الكوكيز) التي تستخدمها منصة الميزان الرقمية، أنواعها، الغرض من كل نوع، وكيفية التحكم بها أو تعطيلها من إعدادات متصفحك."
        schema={breadcrumbSchema}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Cookie size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">سياسة الكوكيز</h1>
          <p className="mt-2 text-xs text-muted-foreground">آخر تحديث: {LAST_UPDATED}</p>
        </header>

        {/* أداة التحكم بالموافقة مباشرة من الصفحة */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold text-foreground">إدارة تفضيلاتكم الحالية</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            حالة الموافقة الحالية على كوكيز التحليل والإعلانات (Google Analytics وGoogle AdSense):{" "}
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
              <Check size={14} /> قبول كوكيز التحليل والإعلانات
            </button>
            <button
              type="button"
              onClick={() => handleChoice("denied")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
            >
              <X size={14} /> رفض كوكيز التحليل والإعلانات
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <Section title="1. ما هي ملفات تعريف الارتباط (الكوكيز)؟">
            <p>
              الكوكيز هي ملفات نصية صغيرة تُحفظ على جهازكم عند زيارة موقع إلكتروني، وتُستخدم لتذكّر
              تفضيلاتكم أو لتحليل كيفية استخدامكم للموقع.
            </p>
          </Section>

          <Section title="2. الكوكيز التي نستخدمها">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2.5 font-bold text-foreground">الاسم</th>
                    <th className="px-3 py-2.5 font-bold text-foreground">المزوّد</th>
                    <th className="px-3 py-2.5 font-bold text-foreground">الغرض</th>
                    <th className="px-3 py-2.5 font-bold text-foreground">المدة</th>
                    <th className="px-3 py-2.5 font-bold text-foreground">النوع</th>
                  </tr>
                </thead>
                <tbody>
                  {COOKIE_TABLE.map((row) => (
                    <tr key={row.name} className="border-t border-border">
                      <td dir="ltr" className="px-3 py-2.5 text-right font-mono text-[11px] text-foreground">
                        {row.name}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{row.provider}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{row.purpose}</td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.duration}</td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="3. أنواع الكوكيز">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>
                <strong>كوكيز ضرورية:</strong> لازمة لعمل الموقع الأساسي (مثل حفظ تفضيل الوضع
                الليلي/النهاري وقرار الموافقة نفسه)، ولا تتطلب موافقة مسبقة.
              </li>
              <li>
                <strong>كوكيز تحليلية:</strong> عبر Google Analytics، تساعدنا على فهم استخدام الموقع
                وتحسينه. لا تُفعَّل إلا بعد موافقتكم الصريحة، وفق وضع الموافقة من Google (Google
                Consent Mode).
              </li>
              <li>
                <strong>كوكيز إعلانية:</strong> عبر Google AdSense وGoogle DoubleClick، تُستخدم لعرض
                إعلانات على الموقع وقد تُستخدم لعرض إعلانات أقرب لاهتماماتكم بناءً على تصفحكم. لا
                تُفعَّل إلا بعد موافقتكم الصريحة. يمكنكم إدارة تفضيلات الإعلانات الشخصية عبر{" "}
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold text-primary"
                >
                  إعدادات إعلانات Google
                </a>
                .
              </li>
            </ul>
          </Section>

          <Section title="4. كيف تتحكمون في الكوكيز؟">
            <p>
              يمكنكم تغيير قراركم في أي وقت من خلال الأداة أعلى هذه الصفحة، أو من إعدادات المتصفح
              لديكم لحظر أو حذف الكوكيز، أو من خلال مسح بيانات الموقع المحلية (Local Storage). لاحظوا
              أن تعطيل الكوكيز الضرورية بالكامل قد يؤثر على بعض وظائف الموقع مثل حفظ تفضيل المظهر.
            </p>
          </Section>

          <Section title="5. تواصل معنا">
            <p>
              لأي استفسار بخصوص هذه السياسة، راسلونا على{" "}
              <a href="mailto:contact@mizan.page" className="underline font-semibold text-primary" dir="ltr">
                contact@mizan.page
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
    </>
  )
}
