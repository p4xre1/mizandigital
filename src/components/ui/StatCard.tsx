import React from "react"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  description?: string
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
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-black text-foreground">{value}</span>
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
              changeType === "positive" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              changeType === "negative" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
              changeType === "neutral" && "bg-muted text-muted-foreground"
            )}
          >
            {changeType === "positive" && <ArrowUpRight className="size-3" />}
            {changeType === "negative" && <ArrowDownRight className="size-3" />}
            {changeType === "neutral" && <Minus className="size-3" />}
            {change}
          </span>
        )}
      </div>

      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
    </div>
  )
}