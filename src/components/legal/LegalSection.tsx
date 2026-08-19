import type { ReactNode } from "react"

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-base font-extrabold text-foreground">{title}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}
