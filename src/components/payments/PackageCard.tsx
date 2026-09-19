import type { CreditPackage } from "@/lib/payments/types";
import { formatPriceMAD } from "@/lib/payments/service";
import { Star, Zap, Crown, Gift } from "lucide-react";

interface Props {
  pkg: CreditPackage;
  onSelect: (slug: string) => void;
  loading?: boolean;
}

export function PackageCard({ pkg, onSelect, loading }: Props) {
  const totalCredits = pkg.credits + pkg.bonus_credits;

  return (
    <div
      className="relative rounded-2xl border border-border bg-card p-6"
    >
      {pkg.is_popular && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-bold text-foreground">
          <Star className="size-3" /> الأكثر مبيعاً
        </span>
      )}

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-[16px] font-black text-foreground">{pkg.title}</h3>
          {pkg.description && <p className="mt-1 text-[12px] text-muted-foreground">{pkg.description}</p>}
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
          {pkg.slug === "elite" ? <Crown className="size-5" /> : pkg.slug === "pro" ? <Zap className="size-5" /> : <Gift className="size-5" />}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-2xl font-black text-foreground" dir="ltr">
          {formatPriceMAD(pkg.price_mad)}
        </p>
        <p className="mt-1 text-[12px] font-bold text-muted-foreground">
          {pkg.credits} كريدتس {pkg.bonus_credits > 0 && <span className="text-emerald-600">+ {pkg.bonus_credits} هدية</span>}
        </p>
      </div>

      <div className="mb-5 rounded-xl bg-muted p-3">
        <p className="text-[11px] font-bold text-muted-foreground">الإجمالي</p>
        <p className="text-[14px] font-black text-foreground">{totalCredits} كريدتس</p>
        <p className="text-[10px] text-muted-foreground">≈ {(totalCredits / 12).toFixed(0)} اختبار متكامل</p>
      </div>

      <button
        type="button"
        onClick={() => onSelect(pkg.slug)}
        disabled={loading}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-[13px] font-extrabold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "جارٍ..." : "اختيار الباقة"}
      </button>
    </div>
  );
}
