import React from "react"
import { X, Save, Loader2 } from "lucide-react"

interface EditItemModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSave?: () => void
  saveLabel?: string
  isLoading?: boolean
  maxWidth?: string
}

export default function EditItemModal({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  saveLabel = "حفظ التغييرات",
  isLoading = false,
  maxWidth = "max-w-lg",
}: EditItemModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className={`w-full ${maxWidth} rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h3 className="font-extrabold text-foreground text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">{children}</div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            إلغاء
          </button>
          {onSave && (
            <button
              onClick={onSave}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}