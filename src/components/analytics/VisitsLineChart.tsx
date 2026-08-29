interface Point {
  label: string
  value: number
}

/** رسم بياني خطي بسيط بدون أي مكتبة خارجية — يعرض تطوّر الزيارات عبر الزمن. */
export function VisitsLineChart({ points, height = 180 }: { points: Point[]; height?: number }) {
  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        لا توجد بيانات كافية بعد لعرض الرسم البياني
      </div>
    )
  }

  const width = 800
  const padding = 24
  const max = Math.max(1, ...points.map((p) => p.value))
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = padding + i * stepX
    const y = height - padding - (p.value / max) * (height - padding * 2)
    return { x, y, ...p }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ")
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`

  // نعرض حداً أقصى ~8 تسميات على المحور الأفقي حتى لا تتزاحم
  const labelEvery = Math.max(1, Math.ceil(coords.length / 8))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" className="text-primary" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-primary" />
        </linearGradient>
      </defs>

      {/* خطوط شبكة أفقية خفيفة */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={padding}
          x2={width - padding}
          y1={padding + f * (height - padding * 2)}
          y2={padding + f * (height - padding * 2)}
          className="stroke-border"
          strokeWidth={1}
        />
      ))}

      <path d={areaPath} fill="url(#visitsFill)" stroke="none" />
      <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={3} className="fill-primary" />
          {i % labelEvery === 0 && (
            <text
              x={c.x}
              y={height - 4}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={11}
            >
              {c.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
