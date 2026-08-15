import React from "react"
import { FolderOpen, Plus, LucideIcon } from "lucide-react"

export interface EmptyStateProps {
  icon?: LucideIcon | React.ElementType
  title: string
  description?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  actionIcon?: LucideIcon | React.ElementType
  customAction?: React.ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  customAction,
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 ${
        compact ? "p-6" : "p-10 md:p-12"
      } text-center animate-in fade-in duration-200 ${className}`}
      dir="rtl"
    >
      {/* Icon Wrapper */}
      <div className="mb-4 grid size-12 md:size-14 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm shrink-0">
        <Icon className="size-6 md:size-7" />
      </div>

      {/* Title */}
      <h3 className="text-base md:text-lg font-extrabold text-foreground">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="mt-1.5 text-xs md:text-sm text-muted-foreground max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {/* Action Area */}
      {customAction ? (
        <div className="mt-5">{customAction}</div>
      ) : (
        actionLabel &&
        onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 active:scale-95 shadow-sm shadow-primary/20"
          >
            <ActionIcon className="size-4" />
            <span>{actionLabel}</span>
          </button>
        )
      )}
    </div>
  )
}

export default EmptyState