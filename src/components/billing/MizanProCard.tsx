import { Crown, Check, Zap } from "lucide-react";
import { MIZAN_PRO_PLANS } from "../../../shared/billing/stripe.js";

interface Props {
  onSelect?: (slug: string) => void;
  currentPlan?: string | null;
}

export function MizanProCard({ onSelect, currentPlan }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2" dir="rtl">
      {Object.values(MIZAN_PRO_PLANS).map((plan: any) => {
        const isCurrent = currentPlan === plan.slug;
        const isYearly = plan.interval === "year";
        return (
          <div key={plan.id} className="relative rounded-2xl border border-border bg-card p-6">
            {isYearly && <span className="absolute -top-3 right-6 rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-bold text-foreground">الأفضل قيمة — خصم 32%</span>}
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                {isYearly ? <Crown className="size-5" /> : <Zap className="size-5" />}
              </span>
              <div>
                <h3 className="text-[15px] font-black text-foreground">{plan.name}</h3>
                <p className="text-[11px] text-muted-foreground">{plan.interval === "month" ? "شهري" : "سنوي"}</p>
              </div>
            </div>

            <p className="text-2xl font-black text-foreground" dir="ltr">
              {plan.priceMAD} MAD <span className="text-[12px] font-bold text-muted-foreground">/ {plan.interval === "month" ? "شهر" : "سنة"}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{plan.credits} كريدتس {plan.bonusCredits ? `+ ${plan.bonusCredits} هدية` : ""}</p>

            <ul className="mt-4 space-y-2">
              {plan.features.map((f: string) => (
                <li key={f} className="flex items-center gap-2 text-[12px] text-foreground">
                  <Check className="size-4 text-emerald-600" /> {f}
                </li>
              ))}
            </ul>

            <button
              disabled={isCurrent}
              onClick={() => onSelect?.(plan.slug)}
              className={`mt-5 w-full rounded-xl px-4 py-2.5 text-[13px] font-extrabold ${isCurrent ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"}`}
            >
              {isCurrent ? "الخطة الحالية" : `اختيار ${plan.interval === "month" ? "الشهري" : "السنوي"}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}
