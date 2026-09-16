import type { ReactNode } from "react"
import { tokenizeInline } from "@/content/legal/markup.js"
import type { LegalBlock as Block } from "@/content/legal/policies.js"

/**
 * عارض كتل المحتوى القانوني.
 *
 * يقرأ نفس البيانات التي يقرؤها scripts/prerender.mjs من
 * src/content/legal/policies.js، فيستحيل أن يختلف النص المعروض في المتصفح
 * عن النص المنشور في الـ HTML الثابت.
 */

const TONE_CLASSES: Record<string, string> = {
  sky: "border-sky-500/20 bg-sky-500/5 text-sky-900 dark:text-sky-200",
  rose: "border-rose-500/20 bg-rose-500/5 text-rose-900 dark:text-rose-200",
  amber: "border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200",
  emerald:
    "border-emerald-500/20 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200",
  neutral: "border-border bg-card",
}

type InlineToken = { type: string; value: string; href?: string }

/** نص مضمّن (**عريض**، `معرّف`، [نص](/مسار)) → عناصر React. */
function Inline({ text }: { text: string }): ReactNode {
  return (tokenizeInline(text) as InlineToken[]).map((token, index) => {
    switch (token.type) {
      case "strong":
        return <strong key={index} className="font-bold text-foreground">{token.value}</strong>
      case "code":
        return (
          <code key={index} dir="ltr" className="rounded bg-muted px-1 py-0.5 font-mono text-[0.92em]">
            {token.value}
          </code>
        )
      case "link": {
        const href = token.href ?? "#"
        const className = "underline font-semibold text-primary"
        return href.startsWith("mailto:") ? (
          <a key={index} href={href} dir="ltr" className={className}>
            {token.value}
          </a>
        ) : (
          <a key={index} href={href} className={className}>
            {token.value}
          </a>
        )
      }
      default:
        return <span key={index}>{token.value}</span>
    }
  })
}

export function LegalBlock({ block }: { block: Block }): ReactNode {
  switch (block.kind) {
    case "para":
      return (
        <p className="leading-relaxed">
          <Inline text={block.text} />
        </p>
      )

    case "note":
      return (
        <p className="text-xs font-bold leading-relaxed text-emerald-700 dark:text-emerald-400">
          <Inline text={block.text} />
        </p>
      )

    case "list": {
      const Tag = block.ordered ? "ol" : "ul"
      return (
        <Tag
          className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1.5 pr-5 leading-relaxed`}
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline text={item} />
            </li>
          ))}
        </Tag>
      )
    }

    case "table": {
      const ltr = new Set(block.ltrColumns ?? [])
      return (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50">
              <tr>
                {block.head.map((head) => (
                  <th key={head} className="px-3 py-2.5 font-bold text-foreground">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-border">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      dir={ltr.has(cellIndex) ? "ltr" : undefined}
                      className={`px-3 py-2.5 text-right text-muted-foreground ${
                        ltr.has(cellIndex) ? "font-mono text-[11px] text-foreground" : ""
                      }`}
                    >
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case "group":
      return (
        <div>
          {block.title ? <h4 className="text-sm font-bold text-foreground">{block.title}</h4> : null}
          <div className="mt-1 space-y-2.5 text-xs">
            {block.blocks.map((child, index) => (
              <LegalBlock key={index} block={child} />
            ))}
          </div>
        </div>
      )

    case "callout": {
      const tone = TONE_CLASSES[block.tone ?? "neutral"] ?? TONE_CLASSES.neutral
      return (
        <div className={`rounded-xl border p-3 ${tone}`}>
          {block.title ? <p className="text-xs font-bold">{block.title}</p> : null}
          <div className={`${block.title ? "mt-2" : ""} space-y-2 text-xs leading-relaxed`}>
            {block.blocks.map((child, index) => (
              <LegalBlock key={index} block={child} />
            ))}
          </div>
        </div>
      )
    }

    default:
      return null
  }
}

export function LegalBlocks({ blocks }: { blocks: Block[] }): ReactNode {
  return blocks.map((block, index) => <LegalBlock key={index} block={block} />)
}

