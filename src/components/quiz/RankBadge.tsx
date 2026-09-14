import { getRankDefinition, type RankDefinition } from "@/lib/quiz/ranks"
import type { RankId } from "@/types/quiz"

/**
 * شارة الرتبة (Rank Badge) — تُستعمل في الناف بار، وفي البروفايل العام،
 * وفي شاشة النتائج.
 */
export function RankBadge({
  rank,
  size = "md",
  showLabel = true,
}: {
  rank: RankId | RankDefinition
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}) {
  const definition = typeof rank === "string" ? getRankDefinition(rank) : rank

  const sizeClass =
    size === "lg"
      ? "size-16 text-2xl"
      : size === "sm"
        ? "size-7 text-[11px]"
        : "size-10 text-sm"

  return (
    <span className="inline-flex items-center gap-2" title={`الرتبة ${definition.id} — ${definition.label}`}>
      <span
        className={`${sizeClass} ${definition.chip} grid shrink-0 place-items-center rounded-xl border font-black leading-none shadow-sm`}
        aria-hidden="true"
      >
        {definition.glyph}
      </span>
      {showLabel && (
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] font-bold text-muted-foreground">الرتبة {definition.id}</span>
          <span className={`text-xs font-extrabold ${definition.tone}`}>{definition.label}</span>
        </span>
      )}
    </span>
  )
}
