import { useState } from "react";
import { createReport, REPORT_REASONS, type ReportTargetType, type ReportReason } from "@/lib/governance/service";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Flag, X, Check } from "lucide-react";
import { validateReportDetails, getInputErrorMessage, checkRateLimit, RATE_LIMITS, INPUT_LIMITS } from "@/lib/security/inputGuard";

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  triggerLabel?: string;
  className?: string;
}

export function ReportDialog({ targetType, targetId, triggerLabel = "إبلاغ", className }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase Auth: useAuth() لا يرمي أبداً — للزائر user = null فنبقى مجهولين.
  const { user } = useAuth();
  const reporterId = user?.id ?? null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    // Anti-spam: rate limit 5 reports per 5 min
    const rl = checkRateLimit(RATE_LIMITS.REPORT.key, RATE_LIMITS.REPORT.max, RATE_LIMITS.REPORT.windowMs);
    if (!rl.allowed) {
      setError(`لقد أرسلت الكثير من البلاغات. انتظر ${Math.ceil((rl.retryAfterMs || 0) / 1000)} ثانية.`);
      setSubmitting(false);
      return;
    }

    // Anti-XSS + char limit for details
    const v = validateReportDetails(details);
    if (!v.ok) {
      setError(getInputErrorMessage(v.error));
      setSubmitting(false);
      return;
    }

    try {
      await createReport({
        targetType,
        targetId,
        reason,
        details: v.value.trim() || undefined,
        reporterId,
      });
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setDetails("");
      }, 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      if (msg.includes("Rate limited")) setError("لقد أرسلت الكثير من البلاغات مؤخراً، حاول لاحقاً");
      else if (msg.includes("Already reported")) setError("لقد أبلغت عن هذا المحتوى مؤخراً");
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground hover:text-foreground ${className || ""}`}
      >
        <Flag className="size-3.5" /> {triggerLabel}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[14px] font-extrabold text-foreground">الإبلاغ عن محتوى</h3>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Check className="size-5" />
            </span>
            <p className="text-[13px] font-bold text-foreground">تم إرسال البلاغ بنجاح</p>
            <p className="text-[11px] text-muted-foreground">سنراجع المحتوى في أقرب وقت</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-[12px] font-bold text-muted-foreground">ما سبب البلاغ؟</p>
              <div className="grid gap-2">
                {(Object.entries(REPORT_REASONS) as [ReportReason, { label: string; description: string }][]).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReason(key)}
                    className={`rounded-xl border p-3 text-right transition ${reason === key ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"}`}
                  >
                    <span className="block text-[12.5px] font-extrabold text-foreground">{meta.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{meta.description}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-muted-foreground">تفاصيل إضافية (اختياري)</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={INPUT_LIMITS.REPORT_DETAILS_MAX}
                  rows={3}
                  placeholder="اشرح بإيجاز سبب البلاغ..."
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary resize-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">{details.length}/{INPUT_LIMITS.REPORT_DETAILS_MAX} — بلا روابط، بلا وسوم</p>
              </div>

              {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-[12.5px] font-bold text-muted-foreground hover:text-foreground">
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-primary px-4 py-2 text-[12.5px] font-extrabold text-primary-foreground disabled:opacity-60"
              >
                {submitting ? "جارٍ الإرسال..." : "إرسال البلاغ"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
