import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { Scale, ShieldAlert, CreditCard, Ban, Infinity } from "lucide-react"

const LAST_UPDATED = "15 شتنبر 2026"
const CONTACT_EMAIL = "contact@mizan.page"

export function TermsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: "الشروط والأحكام", url: "/terms" },
  ])

  return (
    <>
      <AEOHead
        title="الشروط والأحكام وإخلاء المسؤولية"
        description="الشروط المحدثة لميزان الرقمية: بلا إعلانات Adsterra، اشتراك Mizan Pro 49/399 د.م نهائي بلا إلغاء خلال المدة، لا يمكن حذف الحساب ذاتياً، والمنصة تعليمية فقط."
        directAnswer="الشروط المحدثة: ميزان الرقمية بلا إعلانات Adsterra، اشتراك Mizan Pro شهري 49 د.م وسنوي 399 د.م بيع نهائي بلا إلغاء خلال المدة، بعد الانتهاء يجب الدفع للاستمرار، لا يمكن حذف الحساب ذاتياً بل عبر طلب GDPR."
        breadcrumbs={[
          { name: "الرئيسية", url: "https://www.mizan.page/" },
          { name: "الشروط والأحكام", url: "https://www.mizan.page/terms" },
        ]}
        faq={[
          { question: "هل يمكنني إلغاء اشتراك Mizan Pro؟", answer: "لا، البيع نهائي خلال المدة النشطة. بعد انتهاء الشهر أو السنة، ينتهي الوصول لمزايا Pro ويجب الدفع مجدداً للاستمرار. لا تجديد تلقائي إجباري." },
          { question: "هل يمكنني حذف حسابي؟", answer: "لا يمكن الحذف الذاتي من الواجهة. يجب إرسال طلب إلى contact@mizan.page وسيتم الحذف وفق GDPR مع الاحتفاظ بالسجلات القانونية فقط." },
          { question: "هل توجد إعلانات؟", answer: "لا، تمت إزالة Adsterra وكل شبكات الإعلانات نهائياً منذ 15 شتنبر 2026." },
        ]}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Scale size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">الشروط والأحكام</h1>
          <p className="mt-2 text-xs text-muted-foreground">آخر تحديث: {LAST_UPDATED} — تحديث شامل: إزالة Adsterra + سياسة الاشتراك</p>
        </header>

        <div className="mb-8 flex items-start gap-3 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5">
          <ShieldAlert size={22} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-xs md:text-sm leading-relaxed text-amber-900 dark:text-amber-200">
            <p className="mb-1.5 font-extrabold">إخلاء مسؤولية مهم — يرجى القراءة بعناية</p>
            <p>
              منصة "الميزان الرقمية" هي <strong>منصة تعليمية بحتة</strong> موجهة لطلبة وباحثي القانون،
              وليست مكتب محاماة ولا جهة استشارات قانونية. المحتوى المنشور (ملخصات، مقالات، معجم 250 مصطلح،
              أخبار 13، دليل 21 كلية، اختبارات 4 مسارات) معدّ لأغراض دراسية ومعرفية فقط، ولا يشكل استشارة قانونية أو رأياً قانونياً
              رسمياً، ولا ينشئ أي علاقة محامٍ-موكل. لأي حالة أو نزاع قانوني فعلي، يجب استشارة محامٍ مرخّص.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CreditCard size={16} className="text-primary" /> ملخص سياسة الاشتراك (مهم)
          </div>
          <ul className="list-disc pr-5 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li><strong>Mizan Pro شهري:</strong> 49 د.م — 500 كريدتس، مزايا: شجرة قوانين متقدمة، تحديات مميزة، دعم أولوية</li>
            <li><strong>Mizan Pro سنوي:</strong> 399 د.م — 7000 كريدتس + 1000 هدية، خصم 32%</li>
            <li><strong>باقات كريدتس:</strong> 100 (19 د.م) — 350 (49 د.م) — 800 (99 د.م) — 2000 (199 د.م)</li>
            <li><strong>البيع نهائي:</strong> لا إلغاء ولا استرداد خلال المدة النشطة</li>
            <li><strong>بعد الانتهاء:</strong> ينتهي الوصول لمزايا Pro تلقائياً، يجب الدفع مجدداً للاستمرار — لا تجديد تلقائي إجباري</li>
            <li><strong>حذف الحساب:</strong> غير متاح ذاتياً، يجب طلب عبر البريد (GDPR)</li>
          </ul>
        </div>

        <div className="space-y-8">
          <Section title="1. قبول الشروط">
            <p>
              باستخدامكم لموقع mizan.page (المنصة)، توافقون على هذه الشروط كاملة، بما فيها سياسة الاشتراك والكوكيز والخصوصية. إن لم توافقوا، توقفوا عن الاستخدام.
            </p>
          </Section>

          <Section title="2. طبيعة المنصة (محدثة)">
            <p>
              الميزان الرقمية منصة تعليمية عربية مستقلة، <strong>بلا إعلانات خارجية منذ 15 شتنبر 2026</strong> (تمت إزالة Adsterra نهائياً). 
              التمويل عبر Mizan Pro والكريدتس فقط. تضم: 8 مقالات، 13 خبراً، 250 مصطلحاً قانونياً، 21 كلية، 9 مستندات، 3 فعاليات، 4 مسارات اختبارات (جامعي S1-S6، عام، مباريات، مقابلات)، نظام رتب D-SSS، تفاعلات (إعجاب، مفيد، حفظ)، ومحفوظات محلية.
            </p>
          </Section>

          <Section title="3. إنشاء الحساب والمصادقة">
            <p>التسجيل عبر <strong>Clerk</strong> (يدعم Google). عند التسجيل:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li>يجب تقديم بريد صحيح واسم مستعار فريد</li>
              <li>أنت مسؤول عن سرية حسابك</li>
              <li>يُمنع إنشاء حسابات متعددة للتحايل على الكريدتس أو الاختبارات</li>
              <li>الإدارة يمكنها تجميد الحساب (is_frozen) عند مخالفة الحوكمة أو محاولات اختراق</li>
              <li>بيانات الملف: الاسم، السيرة، المدينة، الاهتمامات، الرتبة، XP، الكريدتس، الشارات</li>
            </ul>
          </Section>

          <Section title="4. الاشتراك والمدفوعات (سياسة جديدة — مهمة جداً)">
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <Ban size={16} className="mt-0.5 text-amber-600" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold">لا إلغاء ولا استرداد خلال المدة النشطة</p>
                  <p>عند شراء Mizan Pro (شهري أو سنوي) أو باقات الكريدتس، البيع <strong>نهائي</strong>. لا يمكنك الإلغاء أو طلب استرداد خلال الشهر أو السنة النشطة، حتى لو لم تستخدم المزايا. هذا لضمان استقرار التمويل بعد إزالة الإعلانات.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <Infinity size={16} className="mt-0.5 text-emerald-600" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold">بعد الانتهاء: يجب الدفع للاستمرار</p>
                  <p>عند انتهاء اشتراكك (بعد شهر أو سنة)، <strong>ينتهي الوصول لمزايا Pro تلقائياً</strong>. حسابك يعود لمجاني، والكريدتس المتبقية تبقى، لكن مزايا Pro (شجرة متقدمة، إلخ) تتوقف. للاستمرار، يجب شراء اشتراك جديد — <strong>لا يوجد تجديد تلقائي إجباري</strong>، أنت تختار التجديد يدوياً من /pricing.</p>
                </div>
              </div>

              <ul className="list-disc pr-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                <li><strong>الأسعار:</strong> شهري 49 د.م (500 كريدتس)، سنوي 399 د.م (7000 + 1000 هدية)، باقات كريدتس 19-199 د.م</li>
                <li><strong>الدفع:</strong> عبر Stripe (بطاقة بنكية). لا نرى رقم البطاقة، Stripe Radar يحمي من الاحتيال</li>
                <li><strong>الفوترة:</strong> فاتورة إلكترونية عبر البريد، مع معرف دفع provider_payment_id</li>
                <li><strong>مكافحة الاحتيال:</strong> نراقب سرعة إنشاء جلسات Checkout، بلد البطاقة vs IP، وأكواد الرفض (stolen_card, fraudulent). عند الشك، قد نطلب تحقق 3D Secure</li>
                <li><strong>الضرائب:</strong> الأسعار تشمل كل الرسوم، التسوية بعملة حساب Stripe</li>
                <li><strong>التغييرات:</strong> يمكننا تعديل الأسعار مستقبلاً، لكن اشتراكك الحالي يبقى بنفس السعر حتى انتهاء مدته</li>
              </ul>
            </div>
          </Section>

          <Section title="5. الكريدتس والرتب والاختبارات">
            <ul className="list-disc pr-5 space-y-1.5">
              <li><strong>الكريدتس:</strong> تُكتسب عبر الاختبارات (XP → كريدتس) أو الشراء. تُستخدم لتحميل PDF أو فتح مزايا. لا تنتهي صلاحيتها مع الحساب المجاني، لكن مع Pro تحصل على بونص</li>
              <li><strong>الاختبارات:</strong> 4 مسارات (جامعي S1-S6، عام عشوائي، مباريات، مقابلات). الإجابات محمية: لا يمكن كشفها من الواجهة قبل الإرسال، والـ XP يُحسب في الخادم فقط عبر RPC <code>submit_quiz_attempt</code></li>
              <li><strong>الرتب:</strong> من D حتى SSS حسب XP. لا يمكن منح النفس XP عبر تعديل LocalStorage — الحماية في <code>20260920000000_protect_progression_and_quiz_answers</code></li>
              <li><strong>التفاعلات:</strong> إعجاب، مفيد، حفظ، fire، insightful — تُحسب عبر <code>toggle_reaction</code> RPC مع حماية من التلاعب</li>
            </ul>
          </Section>

          <Section title="6. حذف الحساب (سياسة جديدة)">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs leading-relaxed">
              <p className="font-bold text-rose-900 dark:text-rose-200">لا يمكن حذف الحساب ذاتياً من الواجهة</p>
              <p className="mt-1 text-muted-foreground">
                لمنع إساءة الاستخدام (إنشاء حساب، شراء، حذف، إعادة إنشاء للتحايل)، لا يوجد زر "حذف الحساب" في /profile. 
                إذا أردت حذف حسابك نهائياً (GDPR):
              </p>
              <ol className="mt-2 list-decimal pr-5 space-y-1">
                <li>أرسل طلباً من نفس البريد المسجل إلى <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-bold" dir="ltr">{CONTACT_EMAIL}</a> بعنوان "طلب حذف حساب - GDPR"</li>
                <li>سيُحذف: الملف الشخصي (mizan_profiles, profiles)، محاولات الاختبارات، المدفوعات، معاملات الكريدتس، التفاعلات، البلاغات</li>
                <li>سيُحتفظ: سجلات المراجعة (audit_logs) وأحداث الاحتيال (moderation_actions) لأغراض قانونية فقط، بلا بيانات تعريفية</li>
                <li>المدة: خلال 30 يوماً كحد أقصى</li>
                <li><strong>الاشتراك النشط لا يُسترد عند الحذف</strong> — احذف بعد انتهاء اشتراكك إن أردت تجنب الخسارة</li>
              </ol>
            </div>
          </Section>

          <Section title="7. دقة المحتوى">
            <p>
              نبذل جهداً معقولاً للتأكد من دقة المحتوى وتحديثه، إلا أننا لا نضمن خلوّه التام من الأخطاء. الرجوع إلى النصوص الرسمية بالجريدة الرسمية (adala.justice.gov.ma, sgg.gov.ma) هو المرجع الملزم.
            </p>
          </Section>

          <Section title="8. الاستخدام المسموح به">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>تصفح المحتوى لأغراض دراسية وشخصية غير تجارية</li>
              <li>يُمنع إعادة نشر جماعي أو تجاري دون إذن</li>
              <li>يُمنع استخدام أدوات كشف إجابات الاختبارات أو حقن XP أو التلاعب بالتفاعلات — الأنظمة محمية بـ RLS و triggers</li>
              <li>يُمنع إنشاء حسابات وهمية أو محاولات اختراق (يُكشف عبر guard.js و payloadGuard.js)</li>
            </ul>
          </Section>

          <Section title="9. الملكية الفكرية">
            <p>جميع الحقوق محفوظة لميزان الرقمية أو لمالكيها الأصليين، ما لم يُذكر خلاف ذلك. المحتوى التعليمي الأصلي مرخص للاستخدام الشخصي فقط.</p>
          </Section>

          <Section title="10. حدود المسؤولية">
            <p>
              لا نتحمل مسؤولية عن قرارات قانونية أو أكاديمية تُتخذ اعتماداً كلياً على محتوى المنصة دون رجوع لمصادر رسمية أو استشارة مختص. لا نتحمل مسؤولية انقطاع مؤقت أو أخطاء تقنية خارجة عن إرادتنا.
            </p>
          </Section>

          <Section title="11. الروابط الخارجية">
            <p>قد تتضمن روابط لمواقع رسمية (عدالة، الأمانة العامة، وزارة التعليم). لا نتحمل مسؤولية محتواها.</p>
          </Section>

          <Section title="12. بلا إعلانات (تحديث)">
            <p>
              منذ 15 شتنبر 2026، <strong>لا توجد إعلانات Adsterra ولا شبكات إعلانية</strong> في المنصة. التمويل عبر Mizan Pro والكريدتس فقط. لا كوكيز إعلانية، لا تتبع بين المواقع، لا بيع بيانات لمعلنين. راجع <Link to="/cookies" className="underline font-semibold text-primary">سياسة الكوكيز</Link> و <Link to="/privacy" className="underline font-semibold text-primary">سياسة الخصوصية</Link>.
            </p>
          </Section>

          <Section title="13. التعديلات">
            <p>يجوز تحديث الشروط من وقت لآخر. الاستمرار في الاستخدام بعد التعديل يعني الموافقة على الشروط المحدثة. التغييرات الجوهرية (مثل الأسعار) تُعلن عبر البريد والمنصة قبل 15 يوماً.</p>
          </Section>

          <Section title="14. القانون المطبق">
            <p>تخضع هذه الشروط وتُفسّر وفقاً للقوانين المعمول بها في المملكة المغربية.</p>
          </Section>

          <Section title="15. تواصل معنا">
            <p>
              لأي استفسار بخصوص الشروط، الاشتراك، أو حذف الحساب، راسلونا على{" "}
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
