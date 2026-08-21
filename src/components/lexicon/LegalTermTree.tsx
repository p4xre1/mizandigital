import { useMemo, useState } from "react"
import { Scale } from "lucide-react"
import type { LegalSource } from "../../types/cms"

interface LegalTermTreeProps {
  termAr: string
  termFr?: string
  legalSources: LegalSource[]
  // called when an article node is clicked, so the parent can scroll to /
  // highlight the matching entry in the detailed list below the tree
  onSelectArticle?: (codeIndex: number, articleIndex: number) => void
}

/**
 * شجرة قانونية بصرية: المصطلح في الجذر، كل قانون/مدونة كفرع رئيسي،
 * وكل فصل/مادة كورقة متفرعة عنه. مبنية بـ SVG صرف حتى تبقى واضحة على
 * الجوال وقابلة للتمرير أفقيا عند كثرة الفصول.
 */
export function LegalTermTree({ termAr, termFr, legalSources, onSelectArticle }: LegalTermTreeProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const layout = useMemo(() => {
    const NODE_W = 128
    const NODE_H = 44
    const CODE_W = 168
    const CODE_H = 52
    const ROOT_W = 176
    const ROOT_H = 56
    const H_GAP = 14
    const LEVEL_GAP = 56

    let cursorX = 0
    const codeBlocks = legalSources.map((source, ci) => {
      const articleXs: number[] = []
      source.articles.forEach(() => {
        articleXs.push(cursorX + NODE_W / 2)
        cursorX += NODE_W + H_GAP
      })
      cursorX += H_GAP // extra gap between code groups
      const first = articleXs[0] ?? 0
      const last = articleXs[articleXs.length - 1] ?? 0
      const codeCenter = (first + last) / 2
      return { source, ci, articleXs, codeCenter }
    })

    const totalWidth = Math.max(cursorX - H_GAP, ROOT_W + 40)
    const rootCenter = totalWidth / 2

    const rootY = 20
    const codeY = rootY + ROOT_H + LEVEL_GAP
    const articleY = codeY + CODE_H + LEVEL_GAP
    const totalHeight = articleY + NODE_H + 20

    return {
      NODE_W, NODE_H, CODE_W, CODE_H, ROOT_W, ROOT_H, LEVEL_GAP,
      totalWidth, totalHeight, rootCenter, rootY, codeY, articleY,
      codeBlocks,
    }
  }, [legalSources])

  if (legalSources.length === 0) return null

  const {
    NODE_W, NODE_H, CODE_W, CODE_H, ROOT_W, ROOT_H, LEVEL_GAP,
    totalWidth, totalHeight, rootCenter, rootY, codeY, articleY,
    codeBlocks,
  } = layout

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3 sm:p-5 overflow-x-auto">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="mx-auto"
        style={{ minWidth: Math.min(totalWidth, 340) }}
      >
        {/* خطوط الوصل: الجذر -> كل قانون */}
        {codeBlocks.map(({ codeCenter, ci }) => (
          <path
            key={`root-line-${ci}`}
            d={`M ${rootCenter} ${rootY + ROOT_H} C ${rootCenter} ${rootY + ROOT_H + LEVEL_GAP / 2}, ${codeCenter} ${codeY - LEVEL_GAP / 2}, ${codeCenter} ${codeY}`}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={1.5}
          />
        ))}

        {/* خطوط الوصل: كل قانون -> فصوله */}
        {codeBlocks.map(({ codeCenter, articleXs, ci }) =>
          articleXs.map((ax, ai) => {
            const key = `${ci}-${ai}`
            const isHot = hovered === key
            return (
              <path
                key={`code-line-${key}`}
                d={`M ${codeCenter} ${codeY + CODE_H} C ${codeCenter} ${codeY + CODE_H + LEVEL_GAP / 2}, ${ax} ${articleY - LEVEL_GAP / 2}, ${ax} ${articleY}`}
                fill="none"
                stroke={isHot ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isHot ? 2 : 1.5}
              />
            )
          })
        )}

        {/* عقدة الجذر: المصطلح */}
        <g>
          <rect
            x={rootCenter - ROOT_W / 2}
            y={rootY}
            width={ROOT_W}
            height={ROOT_H}
            rx={14}
            fill="hsl(var(--primary))"
            fillOpacity={0.12}
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
          />
          <text
            x={rootCenter}
            y={rootY + (termFr ? 24 : 33)}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 15, fontWeight: 700 }}
          >
            {termAr}
          </text>
          {termFr && (
            <text
              x={rootCenter}
              y={rootY + 42}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 10, fontFamily: "monospace", direction: "ltr" }}
             >
          {termFr}
            </text>
          )}
        </g>

        {/* عقد القوانين/المدونات */}
        {codeBlocks.map(({ source, codeCenter, ci }) => (
          <g key={`code-node-${ci}`}>
            <rect
              x={codeCenter - CODE_W / 2}
              y={codeY}
              width={CODE_W}
              height={CODE_H}
              rx={12}
              fill="hsl(var(--card))"
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
            />
            <text
              x={codeCenter}
              y={codeY + 22}
              textAnchor="middle"
              className="fill-foreground"
              style={{ fontSize: 12, fontWeight: 700 }}
            >
              {source.code_short || source.code_ar}
            </text>
            <text
              x={codeCenter}
              y={codeY + 38}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 9 }}
            >
              {source.articles.length} {source.articles.length === 1 ? "فصل" : "فصول"}
            </text>
          </g>
        ))}

        {/* عقد الفصول/المواد */}
        {codeBlocks.map(({ source, articleXs, ci }) =>
          articleXs.map((ax, ai) => {
            const key = `${ci}-${ai}`
            const isHot = hovered === key
            const article = source.articles[ai]
            return (
              <g
                key={`article-node-${key}`}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectArticle?.(ci, ai)}
                style={{ cursor: onSelectArticle ? "pointer" : "default" }}
              >
                <rect
                  x={ax - NODE_W / 2}
                  y={articleY}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={isHot ? "hsl(var(--primary) / 0.14)" : "hsl(var(--secondary) / 0.5)"}
                  stroke={isHot ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth={isHot ? 1.75 : 1}
                />
                <text
                  x={ax}
                  y={articleY + 27}
                  textAnchor="middle"
                  className={isHot ? "fill-primary" : "fill-foreground"}
                  style={{ fontSize: 11, fontWeight: 700 }}
                >
                  {/^\d+([-.]\d+)?$/.test(article.number) ? `الفصل ${article.number}` : article.number}
                </text>
              </g>
            )
          })
        )}
      </svg>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center">
        <Scale size={12} />
        اضغط على أي فصل لعرض نصه القانوني كاملا أسفله
      </p>
    </div>
  )
}

export function legalSourceAnchorId(codeIndex: number, articleIndex: number) {
  return `legal-source-${codeIndex}-${articleIndex}`
}
