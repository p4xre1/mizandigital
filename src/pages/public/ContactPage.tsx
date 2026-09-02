import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { Mail, MessageCircle, Clock, ShieldAlert } from "lucide-react"

const CONTACT_EMAIL = "contact@mizan.page"

export function ContactPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: "اتصل بنا", url: "/contact" },
  ])

  return (
    <>
      <SEOHead
        title="تواصل معنا"
        description="تواصل مع فريق منصة الميزان الرقمية عبر البريد الإلكتروني لأي استفسار أو ملاحظة أو اقتراح بخصوص المحتوى القانوني أو خدمات المنصة أو الإبلاغ عن مشكلة تقنية."
        schema={breadcrumbSchema}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MessageCircle size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">تواصل معنا</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            نسعد بتواصلكم معنا لأي استفسار حول المحتوى، اقتراح تصحيح، طلب تعاون أكاديمي، أو أي
            ملاحظة تساعدنا على تطوير المنصة.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            title="راسلنا عبر البريد الإلكتروني"
            className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-center gap-2 text-primary">
              <Mail size={18} />
              <span className="text-sm font-bold text-foreground">البريد الإلكتروني</span>
            </div>
            <span dir="ltr" className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition text-right">
              {CONTACT_EMAIL}
            </span>
            <p className="text-xs text-muted-foreground">
              للاستفسارات العامة، التصحيحات العلمية، والشراكات الأكاديمية.
            </p>
          </a>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <Clock size={18} />
              <span className="text-sm font-bold text-foreground">مدة الرد</span>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">
              نحاول الرد خلال 2 إلى 5 أيام عمل
            </span>
            <p className="text-xs text-muted-foreground">
              فريقنا صغير ومستقل، نقدّر صبركم أثناء معالجة الرسائل.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            تنبيه: منصة الميزان الرقمية <strong>منصة تعليمية</strong> موجهة لطلبة وباحثي القانون، وليست
            مكتباً للاستشارات القانونية. لا يمكننا تقديم رأي أو استشارة قانونية بخصوص حالتكم الشخصية
            عبر البريد الإلكتروني. لهذا الغرض يرجى التواصل مع محامٍ أو مستشار قانوني مرخّص. راجع{" "}
            <a href="/terms" title="الشروط والأحكام الخاصة باستخدام المنصة" className="underline font-semibold">
              الشروط وإخلاء المسؤولية
            </a>{" "}
            لمزيد من التفاصيل.
          </p>
        </div>
      </main>
    </>
  )
}
