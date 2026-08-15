import React from "react"

export interface ProgressBarProps {
  progress: number
  label?: string
  sublabel?: string
  showPercentage?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "primary" | "success" | "warning" | "danger" | "dynamic" | "neutral"
  striped?: boolean
  animated?: boolean
  className?: string
  barClassName?: string
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  sublabel,
  showPercentage = true,
  size = "md",
  variant = "primary",
  striped = false,
  animated = false,
  className = "",
  barClassName = "",
}) => {
  // ضبط القيمة بين 0 و 100 لتفادي الأخطاء
  const clampedProgress = Math.min(100, Math.max(0, Number.isNaN(progress) ? 0 : progress))
  const roundedProgress = Math.round(clampedProgress)

  // تحديد ارتفاع الشريط
  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
    xl: "h-6",
  }

  // تحديد ألوان الشريط وفق النمط أو النسبة
  const getVariantClasses = (): string => {
    if (variant === "dynamic") {
      if (clampedProgress >= 80) return "bg-emerald-500 dark:bg-emerald-400"
      if (clampedProgress >= 50) return "bg-amber-500 dark:bg-amber-400"
      return "bg-rose-500 dark:bg-rose-400"
    }

    switch (variant) {
      case "success":
        return "bg-emerald-500 dark:bg-emerald-400"
      case "warning":
        return "bg-amber-500 dark:bg-amber-400"
      case "danger":
        return "bg-rose-500 dark:bg-rose-400"
      case "neutral":
        return "bg-muted-foreground"
      case "primary":
      default:
        return "bg-primary"
    }
  }

  return (
    <div className={cn("w-full space-y-1.5", className)} dir="rtl">
      {/* الترويسة: العنوان والنسبة المئوية */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          {label ? <span className="truncate">{label}</span> : <span />}
          {showPercentage && (
            <span className="font-mono text-xs font-bold text-muted-foreground dir-ltr">
              {roundedProgress}%
            </span>
          )}
        </div>
      )}

      {/* شريط التقدم الرئيسي */}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted/80 border border-border/40 shadow-inner",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            getVariantClasses(),
            striped &&
              "bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]",
            animated && striped && "animate-[shimmer_2s_linear_infinite]",
            barClassName
          )}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={roundedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || "نسبة الإنجاز"}
        />
      </div>

      {/* النص الفرعي التوضيحي إن وجد */}
      {sublabel && (
        <p className="text-[11px] text-muted-foreground leading-none">{sublabel}</p>
      )}
    </div>
  )
}

export default ProgressBar