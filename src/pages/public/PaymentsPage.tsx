import { useEffect, useState } from "react";
import { AEOHead } from "@/components/seo/AEOHead";
import { fetchPackages, createPaymentIntent, formatPriceMAD } from "@/lib/payments/service";
import type { CreditPackage } from "@/lib/payments/types";
import { PackageCard } from "@/components/payments/PackageCard";
import { useQuizProgress } from "@/hooks/useQuizProgress";
import { Coins, ShieldCheck, Zap, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export function PaymentsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { progress } = useQuizProgress();

  useEffect(() => {
    fetchPackages()
      .then(setPackages)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (slug: string) => {
    setBusySlug(slug);
    setMessage(null);
    try {
      const result = await createPaymentIntent(slug, progress.profile?.username || null);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        // Mock success for now
        setMessage(`تم إنشاء طلب الدفع ${result.paymentId} — سيتم تفعيل الكريدتس قريباً. في الوقت الحالي، هذه محاكاة (الدفع الحقيقي سيتصل بـ CMI/Stripe).`);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فشل إنشاء عملية الدفع");
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <main className="container-wide py-10" dir="rtl">
      <AEOHead
        title="شراء الكريدتس — ميزان الرقمية"
        description="اشترِ حزم الكريدتس لفتح اختبار تحديد المستوى، تجاوز القيود، ودعم منصة ميزان الرقمية. دفع آمن عبر CMI والموزعين المحليين."
        directAnswer="شراء الكريدتس في ميزان الرقمية لدعم المنصة والوصول لمزايا إضافية: شجرة قوانين متقدمة، وتحديات مميزة."
        breadcrumbs={[{ name: "الرئيسية", url: "https://www.mizan.page/" }, { name: "شراء الكريدتس — ميزان الرقمية", url: "https://www.mizan.page/paymentspage" }]}
        canonicalUrl="https://www.mizan.page/payments"
      />

      <div className="mb-8 rounded-3xl border border-border bg-gradient-to-l from-primary/10 via-card to-amber-500/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-extrabold text-primary">
              <Coins className="size-3.5" /> نظام الكريدتس
            </span>
            <h1 className="mt-3 text-2xl font-black text-foreground">اشترِ كريدتس وادعم المنصة</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-7 text-muted-foreground">
              الكريدتس تُستعمل لتجاوز اختبار تحديد المستوى، فتح اختبارات مميزة، وتخصيص البروفايل. كل عملية شراء تدعم استمرار المحتوى المجاني للطلبة.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold text-muted-foreground">رصيدك الحالي</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-black text-foreground">
              <Coins className="size-5 text-amber-500" /> {progress.credits} كريدتس
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{progress.xp} XP • رتبة {progress.placementRank || "—"}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "دفع آمن", text: "عبر CMI، Stripe، أو MoPay" },
            { icon: Zap, title: "تفعيل فوري", text: "الكريدتس تُضاف لحسابك مباشرة بعد التأكيد" },
            { icon: Coins, title: "دعم الطلبة", text: "جزء من العائد يمول منحاً للمحتوى المجاني" },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <span className="grid size-8 place-items-center rounded-lg bg-muted text-primary">
                <f.icon className="size-4" />
              </span>
              <span>
                <span className="block text-[12px] font-extrabold text-foreground">{f.title}</span>
                <span className="block text-[11px] text-muted-foreground">{f.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-[13px] font-bold text-amber-800 dark:text-amber-200">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} onSelect={handleSelect} loading={busySlug === pkg.slug} />
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-[14px] font-extrabold text-foreground">الأسئلة الشائعة حول الكريدتس</h2>
        <div className="mt-4 space-y-3 text-[12.5px] leading-6 text-muted-foreground">
          <p><strong className="text-foreground">هل الكريدتس إلزامية؟</strong> لا. كل الاختبارات الأساسية مجانية. الكريدتس فقط لمزايا إضافية مثل تجاوز اختبار التحديد أو فتح تحديات خاصة.</p>
          <p><strong className="text-foreground">هل تنتهي صلاحيتها؟</strong> لا، الكريدتس لا تنتهي. تبقى في حسابك حتى استعمالها.</p>
          <p><strong className="text-foreground">كيف يُحسب السعر؟</strong> {packages[0] ? formatPriceMAD(packages[0].price_mad) : "19.00 د.م."} للباقة التجريبية، مع خصومات متزايدة للحزم الأكبر.</p>
        </div>
        <div className="mt-4">
          <Link to="/quiz" className="inline-flex items-center gap-2 text-[12.5px] font-extrabold text-primary hover:gap-3">
            العودة للاختبارات <ArrowLeft className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
