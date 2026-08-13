import { CheckCircle2, X } from "lucide-react";

export function Toast({
  message,
  isVisible,
  onClose,
}: {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-card p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      <p className="text-sm font-extrabold text-foreground">{message}</p>
      <button
        onClick={onClose}
        className="mr-2 text-muted-foreground hover:text-foreground"
      >
        <X size={16} />
      </button>
    </div>
  );
}