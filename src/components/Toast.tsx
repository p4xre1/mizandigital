import React, { useEffect, useState } from "react"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react"

export interface ToastProps {
  message: string
  description?: string
  type?: "success" | "error" | "warning" | "info" | "loading"
  isVisible: boolean
  onClose: () => void
  duration?: number // بالملي ثانية (مثلاً 4000) - استخدم 0 لمنع الإغلاق التلقائي
  position?:
    | "bottom-left"
    | "bottom-right"
    | "top-left"
    | "top-right"
    | "bottom-center"
    | "top-center"
  action?: {
    label: string
    onClick: () => void
  }
  showProgress?: boolean
  className?: string
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export function Toast({
  message,
  description,
  type = "success",
  isVisible,
  onClose,
  duration = 4000,
  position = "bottom-left",
  action,
  showProgress = true,
  className = "",
}: ToastProps) {
  const [progress, setProgress] = useState(100)

  // التكفل بآلية المؤقت والتراجع التدريجي لشريط التقدم
  useEffect(() => {
    if (!isVisible || duration <= 0 || type === "loading") return

    setProgress(100)
    const intervalTime = 50
    const step = (intervalTime / duration) * 100

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(progressTimer)
          return 0
        }
        return prev - step
      })
    }, intervalTime)

    const dismissTimer = setTimeout(() => {
      onClose()
    }, duration)

    return () => {
      clearTimeout(dismissTimer)
      clearInterval(progressTimer)
    }
  }, [isVisible, duration, type, onClose])

  if (!isVisible) return null

  // إعدادات الأيقونات والألوان حسب نوع الإشعار
  const variantStyles = {
    success: {
      icon: CheckCircle2,
      iconClass: "text-emerald-500 dark:text-emerald-400",
      borderClass: "border-emerald-500/20 dark:border-emerald-500/30",
      progressClass: "bg-emerald-500",
    },
    error: {
      icon: XCircle,
      iconClass: "text-rose-500 dark:text-rose-400",
      borderClass: "border-rose-500/20 dark:border-rose-500/30",
      progressClass: "bg-rose-500",
    },
    warning: {
      icon: AlertTriangle,
      iconClass: "text-amber-500 dark:text-amber-400",
      borderClass: "border-amber-500/20 dark:border-amber-500/30",
      progressClass: "bg-amber-500",
    },
    info: {
      icon: Info,
      iconClass: "text-blue-500 dark:text-blue-400",
      borderClass: "border-blue-500/20 dark:border-blue-500/30",
      progressClass: "bg-blue-500",
    },
    loading: {
      icon: Loader2,
      iconClass: "text-primary animate-spin",
      borderClass: "border-primary/20",
      progressClass: "bg-primary",
    },
  }

  // إعدادات موضع الإشعار في الشاشة
  const positionClasses = {
    "bottom-left": "bottom-6 left-6",
    "bottom-right": "bottom-6 right-6",
    "top-left": "top-6 left-6",
    "top-right": "top-6 right-6",
    "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
    "top-center": "top-6 left-1/2 -translate-x-1/2",
  }

  const currentVariant = variantStyles[type]
  const Icon = currentVariant.icon

  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className={cn(
        "fixed z-50 min-w-[300px] max-w-md overflow-hidden rounded-2xl border bg-card/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4",
        currentVariant.borderClass,
        positionClasses[position],
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* أيقونة الحالة */}
        <Icon className={cn("size-5 shrink-0 mt-0.5", currentVariant.iconClass)} />

        {/* محتوى الإشعار */}
        <div className="flex-1 space-y-1">
          <p className="text-xs font-bold leading-snug text-foreground">{message}</p>
          {description && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}

          {/* زر إجرائي مدمج إن وجد */}
          {action && (
            <button
              type="button"
              onClick={() => {
                action.onClick()
                onClose()
              }}
              className="mt-1.5 inline-flex items-center text-xs font-black text-primary hover:underline"
            >
              {action.label}
            </button>
          )}
        </div>

        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground transition"
          aria-label="إغلاق الإشعار"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* شريط التقدم السفلي */}
      {showProgress && duration > 0 && type !== "loading" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 w-full bg-muted/50">
          <div
            className={cn("h-full transition-all duration-75 ease-linear", currentVariant.progressClass)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default Toast