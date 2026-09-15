import { Crown, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function ProUpgradeCard() {
  return (
    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-l from-amber-500/10 via-card to-primary/10 p-6" dir="rtl">
      <div className="flex items-start gap-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-amber-500 text-white">
          <Crown className="size-6" />
        </span>
        <div className="flex-1">
          <h3 className="text-[16px] font-black text-foreground">ارتقِ إلى ميزان برو</h3>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">شجرة القوانين المتقدمة، تحديات حصرية، ودعم مباشر من الفريق.</p>
          <div className="mt-4 flex gap-2">
            <Link to="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12.5px] font-extrabold text-primary-foreground hover:opacity-90">
              عرض الخطط <ArrowLeft className="size-4" />
            </Link>
            <Link to="/payments" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-[12.5px] font-bold text-foreground hover:border-primary/40">
              شراء كريدتس
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
