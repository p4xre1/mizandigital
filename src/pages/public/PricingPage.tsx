import { Link } from "react-router-dom";
import { AEOHead } from "@/components/seo/AEOHead";
import { canonicalFor } from "@/lib/canonical";
import { ArrowLeft, BookOpen, Check, GraduationCap } from "lucide-react";

const freeFeatures = [
  "أرشيف الفصول S1 إلى S6",
  "القاموس القانوني: 250 مصطلحاً",
  "كل المقالات والأخبار القانونية",
  "جميع الاختبارات والمسارات التدريبية",
  "دليل 21 كلية حقوق",
  "أدوات البحث والتدريب القانوني",
  "تحميل الملفات المتاحة في الأرشيف",
];

export function PricingPage() {
  return (
    <main className="container-wide py-12" dir="rtl">
      <AEOHead
        title="الموارد التعليمية — ميزان الرقمية"
        description="استكشف المحتوى والأدوات التعليمية المتاحة للجميع في ميزان الرقمية."
        directAnswer="تتيح ميزان الرقمية مواردها وأدواتها التعليمية للجميع."
        breadcrumbs={[{ name: "الرئيسية", url: "/" }, { name: "الموارد التعليمية", url: "/pricing" }]}
        canonicalUrl={canonicalFor("/pricing")}
      />

      <header className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
          <GraduationCap className="size-4" /> للتعلم بلا حواجز
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">موارد ميزان التعليمية المجانية بالكامل</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          تصفح الموارد والأدوات التعليمية المتاحة للجميع.
        </p>
      </header>

      <section className="mx-auto mt-9 max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9" aria-label="مزايا ميزان المجانية">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="size-6" /></span>
          <div>
            <h2 className="text-xl font-black text-foreground">كل الموارد التعليمية</h2>
            <p className="mt-1 text-sm text-muted-foreground">محتوى متاح للتصفح والتعلم.</p>
          </div>
        </div>

        <ul className="mt-7 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
          {freeFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm leading-6 text-foreground">
              <Check className="mt-1 size-4 shrink-0 text-emerald-600" /> {feature}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
          <Link to="/articles" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground transition hover:opacity-90">
            ابدأ التصفح <ArrowLeft className="size-4" />
          </Link>
          <Link to="/archive" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-extrabold text-foreground transition hover:bg-muted">
            افتح الأرشيف <ArrowLeft className="size-4" />
          </Link>
        </div>
      </section>

    </main>
  );
}
