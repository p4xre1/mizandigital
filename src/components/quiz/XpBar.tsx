import type { RankProgress } from "@/lib/quiz/ranks"

/**
 * شريط الخبرة (XP Bar) — يعرض الرتبة الحالية والتقدّم نحو الرتبة الموالية.
 * يُستعمل في البروفايل وفي شاشة نتائج الاختبار.
 */
export function XpBar({
  rankProgress,
  xp,
  credits,
  showNumbers = true,
}: {
  rankProgress: RankProgress
  xp: number
  credits?: number
  showNumbers?: boolean
}) {
  const { rank, next, percent, xpToNext } = rankProgress

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className={`text-sm font-extrabold ${rank.tone}`}>
            {rank.id} - {rank.label}
          </span>
          {next && <span className="text-[11px] font-semibold text-muted-foreground">→ {next.id}</span>}
        </span>
        {showNumbers && (
          <span className="text-[11px] font-bold text-muted-foreground" dir="ltr">
            {xp.toLocaleString("ar-MA")} XP
            {typeof credits === "number" && <> - {credits.toLocaleString("ar-MA")} كريدت</>}
          </span>
        )}
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="نسبة التقدم نحو الرتبة الموالية"
      >
        <div
          className="h-full rounded-full bg-gradient-to-l from-primary to-accent-gold transition-[width] duration-700"
          style={{ width: `${Math.min(100, Math.max(percent, 2))}%` }}
        />
      </div>

      <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
        {next ? `تبقى ${xpToNext.toLocaleString("ar-MA")} نقطة خبرة للوصول إلى الرتبة ${next.id} (${next.label})` : "بلغت أعلى رتبة في ميزان — أحسنت!"}
      </p>
    </div>
  )
}
