import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { ShieldCheck, CreditCard, Bookmark, Trophy, BarChart3, Ban } from "lucide-react"

const LAST_UPDATED = "15 شتنبر 2026"
const CONTACT_EMAIL = "contact@mizan.page"

export function PrivacyPolicyPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: "سياسة الخصوصية", url: "/privacy" },
  ])

  return (
    <>
      <AEOHead
        title="سياسة الخصوصية"
        description="سياسة الخصوصية المحدثة: بلا Adsterra، بيانات الاشتراك والكريدتس والاختبارات والتفاعلات، مصادقة Clerk، ولا بيع بيانات، وحذف الحساب عبر طلب GDPR فقط."
        directAnswer="سياسة الخصوصية المحدثة: ميزان الرقمية بلا إعلانات Adsterra منذ 15 شتنبر 2026، نجمع بيانات الاشتراك Mizan Pro والكريدتس والاختبارات والتفاعلات والمحفوظات، المصادقة عبر Clerk، لا بيع بيانات، وحذف الحساب عبر طلب إلى contact@mizan.page فقط."
        breadcrumbs={[
          { name: "الرئيسية", url: "https://www.mizan.page/" },
          { name: "سياسة الخصوصية", url: "https://www.mizan.page/privacy" },
        ]}
        faq={[
          { question: "هل تبيعون بياناتي لمعلنين؟", answer: "لا، منذ إزالة Adsterra لا نبيع أي بيانات لمعلنين ولا نستخدم كوكيز تتبع بين المواقع." },
          { question: "هل يمكنني حذف حسابي؟", answer: "لا يوجد حذف ذاتي، يجب إرسال طلب GDPR إلى contact@mizan.page، سيُحذف الملف والمحاولات والمدفوعات والتفاعلات خلال 30 يوماً." },
          { question: "ماذا عن الاشتراك بعد الحذف؟", answer: "الاشتراك النشط لا يُسترد عند حذف الحساب. احذف بعد انتهاء اشتراكك." },
        ]}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">سياسة الخصوصية</h1>
          <p className="mt-2 text-xs text-muted-foreground">آخر تحديث: {LAST_UPDATED} — تحديث شامل: إزالة Adsterra + بيانات الاشتراك</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={12} /> بلا إعلانات — لا Adsterra — لا بيع بيانات
          </div>
        </header>

        <div className="space-y-8">
          <Section title="1. من نحن (محدث)">
            <p>
              منصة "الميزان الرقمية" (mizan.page) هي منصة تعليمية عربية مستقلة لطلبة وباحثي القانون بالمغرب. 
              منذ 15 شتنبر 2026، <strong>بلا إعلانات خارجية</strong> (Adsterra وكل الشبكات أُزيلت). التمويل عبر Mizan Pro (49 د.م شهري / 399 د.م سنوي) وباقات الكريدتس (19-199 د.م) فقط.
              تضم المنصة: 8 مقالات، 13 خبراً، 250 مصطلحاً قانونياً، 21 كلية، 9 مستندات، 3 فعاليات، 4 مسارات اختبارات، نظام رتب D-SSS، تفاعلات، ومحفوظات.
            </p>
          </Section>

          <Section title="2. البيانات التي نجمعها (محدثة — تشمل كل مزايا الموقع)">
            <div className="space-y-4">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold"><CreditCard size={14} /> بيانات الاشتراك والمدفوعات</h4>
                <ul className="mt-1 list-disc pr-5 space-y-1 text-xs leading-relaxed">
                  <li>معرف المستخدم (user_ref, clerk_user_id)، الباقة (package_id)، المبلغ (amount_mad/amount_usd)، الكريدتس المشتراة + البونص</li>
                  <li>معرف الدفع الخارجي (provider_payment_id)، حالة الدفع (pending/completed/failed)، المزود (Stripe)</li>
                  <li>تاريخ الإنشاء والإكمال، metadata (بلد البطاقة، بلد IP، كود الرفض إن وجد)</li>
                  <li>لا نرى رقم البطاقة — Stripe Radar يحمي من الاحتيال (declines_per_ip, card_country)</li>
                </ul>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold"><Trophy size={14} /> بيانات الاختبارات والرتب</h4>
                <ul className="mt-1 list-disc pr-5 space-y-1 text-xs">
                  <li>محاولات الاختبارات (quiz_attempts): النمط (mode)، التصنيف (label)، النتيجة (total/correct/score)، XP المكتسب، الكريدتس، أفضل سلسلة (best_streak)، المدة</li>
                  <li>الملف الشخصي (mizan_profiles): اسم المستخدم، الاسم الظاهر، الدور (role)، الفصل، سنوات الخبرة، الاهتمامات، المدينة، السيرة، XP، الكريدتس، الرتبة D-SSS، الشارات، أيام التتالي</li>
                  <li>التقدم محمي: لا يمكن تعديل XP/Rank من الواجهة — يُحسب في الخادم عبر <code>submit_quiz_attempt</code> RPC</li>
                </ul>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold"><Bookmark size={14} /> المحفوظات والتفاعلات</h4>
                <ul className="mt-1 list-disc pr-5 space-y-1 text-xs">
                  <li><code>mizan:saved:content:v1</code> (محلي): مقالات/أخبار/مصطلحات محفوظة (id, type, title, slug, savedAt)</li>
                  <li>التفاعلات (reactions): النوع (like, helpful, bookmark, fire, insightful)، الهدف (target_type, target_id)، التاريخ</li>
                  <li>عدادات التفاعلات (reaction_counts): مجمعة، بلا بيانات شخصية</li>
                </ul>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold"><BarChart3 size={14} /> التحليلات والتتبع</h4>
                <ul className="mt-1 list-disc pr-5 space-y-1 text-xs">
                  <li><code>mizan:analytics:queue</code> (محلي مؤقت): تفاعلات (page_view, quiz, reaction, save, payment_click) تُفرغ كل 10 ثوان عبر sendBeacon إلى /api/analytics</li>
                  <li>Google Analytics (بموافقة فقط): صفحات مزارة، مدة الجلسة، نوع الجهاز — IP مجهول جزئياً</li>
                  <li>لا تتبع إعلاني بين المواقع منذ إزالة Adsterra</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold">المصادقة والحساب</h4>
                <ul className="mt-1 list-disc pr-5 space-y-1 text-xs">
                  <li>Clerk: البريد، معرف المستخدم (user_*), جلسة __clerk_*, __session — لإدارة تسجيل الدخول عبر Google وغيره</li>
                  <li>Supabase profiles: البريد، bonus_credits, referred_by, referral_code, full_name, bio, avatar_url, is_frozen, ads_exempt, preferred_lang, last_ip_address (مجردة بملح)</li>
                  <li>البلاغات (reports): نوع الهدف، السبب، التفاصيل، الحالة، ملاحظة المشرف</li>
                  <li>إجراءات الإشراف (moderation_actions): المشرف، الإجراء، السبب</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section title="3. كيف نستخدم البيانات (بلا إعلانات)">
            <ul className="list-disc pr-5 space-y-1.5 text-sm">
              <li>تشغيل الميزات: الاشتراك (Mizan Pro)، الكريدتس، المحفوظات، الرتب، الاختبارات، التفاعلات</li>
              <li>التحليلات: فهم الاستخدام وتحسين المحتوى — بموافقتكم فقط لـ GA</li>
              <li>مكافحة الاحتيال: مراقبة سرعة Checkout، بلد البطاقة vs IP، أكواد الرفض (stolen_card, fraudulent) — عبر Stripe Radar + evaluatePaymentRisk</li>
              <li>الحوكمة: مراجعة البلاغات واتخاذ إجراءات إشراف</li>
              <li>الدعم: الرد على استفساراتكم عبر البريد</li>
            </ul>
            <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              لا نبيع بياناتكم لأي طرف ثالث. لا إعلانات Adsterra، لا كوكيز تتبع بين المواقع، لا بيع بيانات لمعلنين منذ 15 شتنبر 2026.
            </p>
          </Section>

          <Section title="4. مشاركة البيانات مع أطراف ثالثة (محدثة — بلا Adsterra)">
            <p>قد تتم مشاركة بيانات مجهولة أو ضرورية مع:</p>
            <ul className="list-disc pr-5 space-y-1.5 text-xs">
              <li><strong>Clerk</strong> (المصادقة): لإدارة تسجيل الدخول — يخضع لسياسة Clerk</li>
              <li><strong>Supabase</strong> (قاعدة البيانات): لتخزين الملفات، المحاولات، المدفوعات، التفاعلات — RLS يحمي البيانات</li>
              <li><strong>Stripe</strong> (المدفوعات): لمعالجة الدفع — لا نرى رقم البطاقة، يخضع لسياسة Stripe و Radar</li>
              <li><strong>Google Analytics</strong> (بموافقة فقط): لقياس الاستخدام المجهول — IP مجهول</li>
              <li><strong>Cloudflare</strong> (الاستضافة والحماية): _headers، Turnstile، RATE_LIMIT_KV، IP مجرد بملح</li>
            </ul>
            <p className="mt-2 text-xs">
              <strong>تمت إزالة:</strong> Adsterra وكل شبكات الإعلانات — لا مشاركة بيانات مع معلنين بعد الآن.
            </p>
          </Section>

          <Section title="5. الكوكيز والتخزين المحلي (مطابق لسياسة الكوكيز)">
            <p>نستخدم:</p>
            <ul className="list-disc pr-5 space-y-1 text-xs">
              <li>ضرورية: __clerk_*, __session, sb-*, mizan-cookie-consent</li>
              <li>وظيفية: mizan:subscription:v1 (اشتراك Pro)، mizan:saved:content:v1 (محفوظات)، mizan_quiz_progress (رتبة/XP)، mizan_theme</li>
              <li>تحليلية محلية مؤقتة: mizan:analytics:queue (يُفرغ كل 10 ثوان)</li>
              <li>تحليلية خارجية بموافقة: _ga, _gid (Google Analytics)</li>
              <li>لا إعلانية: لا Adsterra منذ 15 شتنبر 2026</li>
            </ul>
            <p className="mt-2">
              راجع <Link to="/cookies" className="underline font-semibold text-primary">سياسة الكوكيز</Link> الكاملة المحدثة.
            </p>
          </Section>

          <Section title="6. حقوقكم وحذف الحساب (سياسة جديدة)">
            <div className="space-y-3">
              <ul className="list-disc pr-5 space-y-1.5 text-sm">
                <li>الحق في معرفة البيانات المحفوظة عنكم (ملف، محاولات، مدفوعات، تفاعلات، محفوظات محلية)</li>
                <li>الحق في سحب الموافقة على التحليلات في أي وقت من /cookies</li>
                <li>الحق في طلب نسخة من بياناتكم (GDPR export) عبر /admin/userdata (للمشرف) أو عبر البريد</li>
              </ul>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <p className="flex items-center gap-2 text-xs font-bold text-rose-900 dark:text-rose-200">
                  <Ban size={14} /> حذف الحساب — لا يوجد زر ذاتي
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  لا يمكن حذف الحساب ذاتياً من /profile لمنع التحايل (إنشاء، شراء، حذف، إعادة إنشاء). 
                  للحذف (GDPR):
                </p>
                <ol className="mt-2 list-decimal pr-5 space-y-1 text-xs">
                  <li>أرسل من نفس البريد المسجل إلى <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-bold" dir="ltr">{CONTACT_EMAIL}</a> بعنوان "طلب حذف حساب - GDPR"</li>
                  <li>سيُحذف: profiles, mizan_profiles, quiz_attempts, payments, credit_transactions, reactions, reports</li>
                  <li>سيُحتفظ: audit_logs, moderation_actions (بلا بيانات تعريفية) لأغراض قانونية</li>
                  <li>المدة: 30 يوماً كحد أقصى</li>
                  <li><strong>الاشتراك النشط لا يُسترد عند الحذف</strong> — انتظر انتهاء اشتراكك (شهر/سنة) ثم اطلب الحذف</li>
                </ol>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                <p className="font-bold">سياسة الاشتراك والاسترجاع:</p>
                <ul className="mt-1 list-disc pr-5 space-y-1">
                  <li><strong>البيع نهائي:</strong> Mizan Pro (49 د.م شهري / 399 د.م سنوي) وباقات الكريدتس (19-199 د.م) — لا إلغاء ولا استرداد خلال المدة النشطة</li>
                  <li><strong>بعد الانتهاء:</strong> ينتهي الوصول لمزايا Pro تلقائياً، يجب الدفع مجدداً للاستمرار — لا تجديد تلقائي إجباري</li>
                  <li><strong>الكريدتس:</strong> تبقى بعد انتهاء Pro، لكن بونص Pro ينتهي</li>
                </ul>
              </div>
            </div>

            <p className="mt-3">
              لممارسة حقوقكم، راسلونا على{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-semibold text-primary" dir="ltr">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="7. أمان البيانات">
            <p>نتخذ إجراءات معقولة:</p>
            <ul className="list-disc pr-5 space-y-1 text-xs">
              <li>Clerk: تشفير الجلسة، JWKS verification عبر functions/_shared/clerk.js</li>
              <li>Supabase: RLS، triggers تمنع تعديل XP/Rank من الواجهة (20260920000000_protect_progression_and_quiz_answers)</li>
              <li>Stripe: توقيع webhook عبر timingSafeEqualStr (مقارنة بزمن ثابت)، WebCrypto HMAC</li>
              <li>Cloudflare: _headers (CSP, HSTS, X-Frame-Options), Turnstile CAPTCHA, rate limiting KV + memory fallback, IP مجرد بملح IP_HASH_SALT</li>
              <li>payloadGuard: كشف حقن XSS/SQLi، حروف غير مرئية Trojan Source</li>
            </ul>
            <p className="mt-2 text-xs">لا يمكن ضمان أمان مطلق لأي نقل عبر الإنترنت.</p>
          </Section>

          <Section title="8. التعديلات">
            <p>
              قد نحدّث السياسة لتعكس تغييرات في المزايا (مثل إضافة Mizan Pro، إزالة Adsterra، نظام التفاعلات). 
              التغييرات الجوهرية تُعلن عبر البريد والمنصة قبل 15 يوماً. تاريخ آخر تحديث أعلى الصفحة.
            </p>
          </Section>

          <Section title="9. تواصل معنا">
            <p>
              لأي استفسار بخصوص الخصوصية، الاشتراك، الكوكيز، أو حذف الحساب، راسلونا على{" "}
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
