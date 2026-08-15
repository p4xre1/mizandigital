import React, { useEffect } from "react"
import { X, Save, Loader2 } from "lucide-react"

export interface EditItemModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  onSave?: () => void
  saveLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  maxWidth?: string
  customFooter?: React.ReactNode
}

export function EditItemModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSave,
  saveLabel = "حفظ التغييرات",
  cancelLabel = "إلغاء",
  isLoading = false,
  maxWidth = "max-w-lg",
  customFooter,
}: EditItemModalProps) {
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

  // Native form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSave && !isLoading) {
      onSave()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
      onClick={isLoading ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] flex flex-col transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border gap-3">
          <div>
            <h3 id="modal-title" className="font-extrabold text-foreground text-lg">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
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

        {/* Form Wrapper allows pressing Enter inside text inputs */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 px-0.5">{children}</div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-auto">
            {customFooter ? (
              customFooter
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted transition disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                {onSave && (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    {saveLabel}
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditItemModal