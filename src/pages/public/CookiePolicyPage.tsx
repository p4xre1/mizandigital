import { useState } from "react"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { getStoredConsent, setStoredConsent, type ConsentValue } from "../../lib/utils/cookieConsent"
import { Cookie, Check, X, ShieldCheck, CreditCard, Bookmark, Trophy } from "lucide-react"

const LAST_UPDATED = "15 شتنبر 2026"

const COOKIE_TABLE = [
  {
    name: "mizan_theme",
    provider: "الميزان الرقمية (محلي)",
    purpose: "حفظ تفضيلكم للوضع الليلي أو النهاري.",
    duration: "دائم (حتى المسح اليدوي)",
    type: "ضروري / وظيفي",
  },
  {
    name: "mizan-cookie-consent",
    provider: "الميزان الرقمية (محلي)",
    purpose: "حفظ قراركم بخصوص قبول أو رفض كوكيز التحليل.",
    duration: "دائم",
    type: "ضروري",
  },
  {
    name: "sb-* (sb-<ref>-auth-token)",
    provider: "Supabase Auth (المصادقة)",
    purpose: "إدارة جلسة تسجيل الدخول، حماية الحساب، وتخزين توكن المصادقة.",
    duration: "جلسة + حتى 30 يوماً",
    type: "ضروري / مصادقة",
  },
  {
    name: "mizan:subscription:v1",
    provider: "الميزان الرقمية (محلي)",
    purpose: "حفظ حالة اشتراك Mizan Pro (شهري/سنوي) والكريدتس المتبقية.",
    duration: "دائم",
    type: "وظيفي",
  },
  {
    name: "mizan:saved:content:v1",
    provider: "الميزان الرقمية (محلي)",
    purpose: "حفظ المحتوى المحفوظ (مقالات، أخبار، مصطلحات) للوصول السريع.",
    duration: "دائم",
    type: "وظيفي",
  },
  {
    name: "mizan_quiz_progress",
    provider: "الميزان الرقمية (محلي)",
    purpose: "حفظ تقدم الاختبارات، الرتبة (D-SSS)، نقاط الخبرة XP، والإجابات.",
    duration: "دائم",
    type: "وظيفي",
  },
  {
    name: "mizan:analytics:queue",
    provider: "الميزان الرقمية (محلي)",
    purpose: "طابور مؤقت لتتبع التفاعلات (page_view, quiz, reaction) قبل الإرسال.",
    duration: "مؤقت (يُفرغ كل 10 ثوان)",
    type: "تحليلي محلي",
  },
  {
    name: "_ga، _ga_*",
    provider: "Google Analytics",
    purpose: "قياس الاستخدام والتنقل بشكل مجهول إحصائياً.",
    duration: "حتى سنتين",
    type: "تحليلي (يتطلب موافقة)",
  },
  {
    name: "_gid",
    provider: "Google Analytics",
    purpose: "تمييز الزوار خلال 24 ساعة.",
    duration: "24 ساعة",
    type: "تحليلي (يتطلب موافقة)",
  },
  {
    name: "sb-* , supabase-auth-token",
    provider: "Supabase",
    purpose: "مصادقة قاعدة البيانات وحفظ الجلسة للملفات المحمية.",
    duration: "جلسة",
    type: "ضروري / وظيفي",
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
      <AEOHead
        title="سياسة الكوكيز"
        description="سياسة الكوكيز في ميزان الرقمية بعد إزالة Adsterra: كوكيز ضرورية للمصادقة (Supabase Auth)، الاشتراك (Mizan Pro)، المحفوظات، تقدم الاختبارات، وتحليلات مجهولة بموافقتكم."
        directAnswer="سياسة الكوكيز المحدثة في ميزان الرقمية: لا إعلانات Adsterra بعد الآن. نستخدم كوكيز ضرورية للمصادقة (Supabase Auth)، اشتراك Mizan Pro، المحفوظات، تقدم الاختبارات، وتحليلات Google Analytics بموافقتكم فقط."
        breadcrumbs={[
          { name: "الرئيسية", url: "https://www.mizan.page/" },
          { name: "سياسة الكوكيز", url: "https://www.mizan.page/cookies" },
        ]}
        faq={[
          { question: "هل تستخدمون Adsterra؟", answer: "لا، تمت إزالة Adsterra وكل شبكات الإعلانات الخارجية نهائياً. الموقع الآن بلا إعلانات." },
          { question: "ما هي الكوكيز الضرورية؟", answer: "مصادقة Supabase Auth، حالة اشتراك Mizan Pro، المحتوى المحفوظ، تقدم الاختبارات والرتبة، وتفضيل المظهر." },
          { question: "هل يمكنني رفض التحليلات؟", answer: "نعم، يمكنك رفض كوكيز Google Analytics من الأداة أعلاه، وسيستمر الموقع بالعمل بشكل كامل." },
        ]}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Cookie size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">سياسة الكوكيز</h1>
          <p className="mt-2 text-xs text-muted-foreground">آخر تحديث: {LAST_UPDATED} — تمت إزالة Adsterra</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={12} /> بلا إعلانات خارجية — لا Adsterra ولا شبكات تتبع إعلاني
          </div>
        </header>

        <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h2 className="mb-2 text-sm font-extrabold text-emerald-900 dark:text-emerald-100">تحديث مهم: إزالة الإعلانات</h2>
          <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-200">
            ابتداءً من 15 شتنبر 2026، تمت <strong>إزالة Adsterra وكل شبكات الإعلانات</strong> نهائياً من ميزان الرقمية. 
            لا نستخدم أي كوكيز إعلانية، لا تتبع بين المواقع، ولا بيع بيانات لمعلنين. 
            التمويل الآن عبر <strong>Mizan Pro</strong> (اشتراك شهري 49 د.م / سنوي 399 د.م) وباقات الكريدتس فقط.
          </p>
        </div>

        {/* أداة التحكم بالموافقة */}
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
          <Section title="1. ما هي ملفات تعريف الارتباط؟">
            <p>
              الكوكيز هي ملفات نصية صغيرة تُحفظ على جهازكم. في ميزان الرقمية نستخدمها فقط لتذكّر تفضيلاتكم (المظهر، الاشتراك، المحفوظات، تقدم الاختبارات) ولقياس الاستخدام المجهول بموافقتكم.
            </p>
          </Section>

          <Section title="2. الكوكيز التي نستخدمها (محدثة - بلا Adsterra)">
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

          <Section title="3. أنواع الكوكيز (بعد إزالة الإعلانات)">
            <ul className="list-disc pr-5 space-y-2">
              <li>
                <strong>ضرورية / مصادقة:</strong> Supabase Auth (sb-*) — لازمة لتسجيل الدخول وحماية الحساب وربط بروفايلك ورتبتك. لا يمكن تعطيلها دون فقدان تسجيل الدخول.
              </li>
              <li>
                <strong>وظيفية:</strong>
                <ul className="mt-1 list-disc pr-5 space-y-1">
                  <li className="flex items-center gap-2"><CreditCard size={12} /> <span><code>mizan:subscription:v1</code> — حالة Mizan Pro (شهري 49 د.م / سنوي 399 د.م) والكريدتس</span></li>
                  <li className="flex items-center gap-2"><Bookmark size={12} /> <span><code>mizan:saved:content:v1</code> — المحتوى المحفوظ (مقالات، أخبار، مصطلحات)</span></li>
                  <li className="flex items-center gap-2"><Trophy size={12} /> <span><code>mizan_quiz_progress</code> — الرتبة D-SSS، XP، تقدم الاختبارات</span></li>
                  <li><code>mizan_theme</code> — الوضع الليلي/النهاري</li>
                  <li><code>mizan-cookie-consent</code> — قرار الموافقة نفسه</li>
                </ul>
              </li>
              <li>
                <strong>تحليلية محلية:</strong> <code>mizan:analytics:queue</code> — طابور مؤقت للتفاعلات (page_view, quiz, reaction, save) يُفرغ كل 10 ثوان عبر sendBeacon إلى /api/analytics. لا يحتوي IP خام، بل بصمة مجردة.
              </li>
              <li>
                <strong>تحليلية خارجية (بموافقة):</strong> Google Analytics (_ga, _gid) — لقياس الاستخدام المجهول فقط. لا تُفعَّل إلا بعد موافقتكم عبر شريط الكوكيز (Google Consent Mode). يمكن رفضها ويستمر الموقع كاملاً.
              </li>
              <li>
                <strong>لا يوجد كوكيز إعلانية:</strong> تمت إزالة Adsterra نهائياً. لا كوكيز تتبع بين المواقع، لا بيع بيانات لمعلنين.
              </li>
            </ul>
          </Section>

          <Section title="4. كيف تتحكمون في الكوكيز؟">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>التحكم في التحليلات: استعملوا الأداة أعلى هذه الصفحة (قبول/رفض).</li>
              <li>المحفوظات والاشتراك: يمكن مسحها من إعدادات المتصفح → Local Storage → مفاتيح mizan:*</li>
              <li>Supabase Auth: تسجيل الخروج يحذف كوكيز الجلسة (sb-*). لا يمكن تعطيل كوكيز المصادقة مع بقاء تسجيل الدخول.</li>
              <li>حذف الحساب: لا يمكن حذف الحساب ذاتياً من الواجهة. يجب التواصل عبر contact@mizan.page لطلب الحذف وفق GDPR — سيُحذف كل شيء (الملف، المحاولات، المدفوعات، التفاعلات) باستثناء السجلات القانونية.</li>
            </ul>
          </Section>

          <Section title="5. الاشتراك والمدفوعات والكوكيز">
            <p>
              عند شراء <strong>Mizan Pro</strong> (شهري 49 د.م أو سنوي 399 د.م) أو باقات الكريدتس (100-2000 كريدتس)، يُحفظ اشتراككم في <code>mizan:subscription:v1</code> محلياً وفي قاعدة البيانات. 
              <strong>لا يمكن إلغاء الاشتراك خلال المدة النشطة</strong> — البيع نهائي. بعد انتهاء المدة (شهر أو سنة)، ينتهي الوصول لمزايا Pro تلقائياً ويجب الدفع مجدداً للاستمرار. لا تجديد تلقائي إجباري — يمكنك اختيار عدم التجديد.
            </p>
          </Section>

          <Section title="6. تواصل معنا">
            <p>
              لأي استفسار بخصوص الكوكيز أو الاشتراك أو حذف الحساب، راسلونا على{" "}
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
