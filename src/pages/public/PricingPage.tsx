import { AEOHead } from "@/components/seo/AEOHead";
import { MizanProCard } from "@/components/billing/MizanProCard";
import { PackageCard } from "@/components/payments/PackageCard";
import { fetchPackages } from "@/lib/payments/service";
import { useEffect, useState } from "react";
import type { CreditPackage } from "@/lib/payments/types";
import { useSubscription } from "@/lib/billing/useSubscription";
import { ShieldCheck, Zap, BookOpen } from "lucide-react";

export function PricingPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const { subscription } = useSubscription();

  useEffect(() => {
    fetchPackages().then(setPackages);
  }, []);

  return (
    <main className="container-wide py-10" dir="rtl">
      <AEOHead title="الأسعار — ميزان برو وحزم الكريدتس" description="اختر خطة ميزان برو الشهرية أو السنوية، أو اشترِ حزم الكريدتس لدعم المنصة وفتح المزايا."
        directAnswer="تسعير ميزان الرقمية: Mizan Pro شهري 49 د.م (500 كريدتس) وسنوي 399 د.م (7000 كريدتس + 1000 هدية)، مع باقات كريدتس للطلبة والباحثين."
        breadcrumbs={[{ name: "الرئيسية", url: "https://www.mizan.page/" }, { name: "الأسعار — ميزان برو وحزم الكريدتس", url: "https://www.mizan.page/pricingpage" }]} canonicalUrl="https://www.mizan.page/pricing" />

      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-3xl font-black text-foreground">خطط تناسب كل طالب قانون</h1>
        <p className="mt-3 text-[14px] leading-7 text-muted-foreground">ميزان برو يمول المحتوى المجاني. كل اشتراك يدعم استمرار الأرشيف والاختبارات للجميع.</p>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-extrabold text-foreground">ميزان برو</h2>
        <MizanProCard currentPlan={subscription.planSlug} onSelect={(slug) => (window.location.href = `/payments?plan=${slug}`)} />
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-extrabold text-foreground">حزم الكريدتس (دفع مرة واحدة)</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} onSelect={(slug) => (window.location.href = `/payments?package=${slug}`)} />
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "دفع آمن", text: "CMI، Stripe، MoPay — بياناتك محمية" },
          { icon: Zap, title: "تفعيل فوري", text: "الكريدتس والاشتراك يُفعّل مباشرة بعد الدفع" },
          { icon: BookOpen, title: "دعم التعليم", text: "30% من العائد يمول منح محتوى مجاني" },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
            <f.icon className="mb-2 size-5 text-primary" />
            <h3 className="text-[13px] font-extrabold text-foreground">{f.title}</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
