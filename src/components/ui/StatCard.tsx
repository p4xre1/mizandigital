import React from "react"
import { ArrowUpRight, ArrowDownRight, Minus, HelpCircle } from "lucide-react"

export interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ElementType
  change?: string | number
  changeType?: "positive" | "negative" | "neutral"
  changePeriod?: string
  description?: string
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info"
  loading?: boolean
  progress?: number
  tooltip?: string
  badgeText?: string
  onClick?: () => void
  href?: string
  className?: string
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = "neutral",
  changePeriod,
  description,
  variant = "default",
  loading = false,
  progress,
  tooltip,
  badgeText,
  onClick,
  href,
  className = "",
}: StatCardProps) {
  // تحديد ألوان الأيقونة والخلفيات المخصصة للنطاق
  const variantStyles = {
    default: "bg-primary/10 text-primary border-primary/20",
    primary: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    info: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  }

  const isClickable = Boolean(onClick || href)
  const Component = href ? "a" : "div"

  // حالة التحميل (Skeleton Loader)
  if (loading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3",
          className
        )}
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded-md bg-muted" />
          <div className="size-9 rounded-xl bg-muted" />
        </div>
        <div className="h-7 w-32 rounded-lg bg-muted" />
        <div className="h-2.5 w-full rounded-full bg-muted" />
      </div>
    )
  }

  return (
    <Component
      href={href}
      onClick={onClick}
      className={cn(
        "group relative block rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 space-y-3",
        isClickable && "hover:border-primary/50 hover:shadow-md cursor-pointer active:scale-[0.99]",
        className
      )}
      dir="rtl"
    >
      {/* الترويسة الأفقية: العنوان والأيقونة */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </span>
          {tooltip && (
            <div className="group/tooltip relative flex items-center">
              <HelpCircle className="size-3.5 text-muted-foreground/60 hover:text-muted-foreground transition cursor-help" />
              <div className="absolute bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tooltip:block z-50 whitespace-nowrap rounded-lg bg-popover px-2.5 py-1 text-[11px] text-popover-foreground shadow-md border border-border">
                {tooltip}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {badgeText && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {badgeText}
            </span>
          )}
          {Icon && (
            <div
              className={cn(
                "grid size-9 place-items-center rounded-xl border transition-transform duration-300 group-hover:scale-110",
                variantStyles[variant]
              )}
            >
              <Icon className="size-4" />
            </div>
          )}
        </div>
      </div>

      {/* القيمة الرئيسية ومؤشر التغير */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-black tracking-tight text-foreground font-mono dir-ltr text-right">
          {value}
        </span>

        {change !== undefined && (
          <div className="flex flex-col items-end">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold dir-ltr",
                changeType === "positive" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                changeType === "negative" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                changeType === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {changeType === "positive" && <ArrowUpRight className="size-3" />}
              {changeType === "negative" && <ArrowDownRight className="size-3" />}
              {changeType === "neutral" && <Minus className="size-3" />}
              <span>{change}</span>
            </span>
            {changePeriod && (
              <span className="text-[10px] text-muted-foreground/80 mt-0.5">
                {changePeriod}
              </span>
            )}
          </div>
        )}
      </div>

      {/* شريط التقدم المدمج (إن وجد) */}
      {typeof progress === "number" && (
        <div className="space-y-1 pt-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* الوصف الإضافي */}
      {description && (
        <p className="text-[11px] leading-relaxed text-muted-foreground pt-0.5">
          {description}
        </p>
      )}
    </Component>
  )
}