import React, { useEffect } from "react"
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react"

export interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: React.ReactNode
  itemName?: string
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  maxWidth?: string
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  description = "هل أنت تأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.",
  itemName,
  confirmLabel = "تأكيد الحذف",
  cancelLabel = "إلغاء",
  isLoading = false,
  maxWidth = "max-w-md",
}: ConfirmDeleteModalProps) {
  // ESC key handler & body scroll lock
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose, isLoading])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
      onClick={isLoading ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-desc"
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h3 id="delete-modal-title" className="font-extrabold text-foreground text-base">
                {title}
              </h3>
              {itemName && (
                <span className="inline-block mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  {itemName}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition disabled:opacity-50"
            aria-label="إغلاق النافذة"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body / Description */}
        <div id="delete-modal-desc" className="py-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
          {description}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-50 shadow-sm shadow-rose-600/20"
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDeleteModal