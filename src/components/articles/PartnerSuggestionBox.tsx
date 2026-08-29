import { GraduationCap, ArrowLeft } from "lucide-react"

interface PartnerSuggestionBoxProps {
  href: string
  title: string
  description: string
  ctaLabel: string
}

/**
 * صندوق اقتراح لشريك خارجي (مثلاً WadifaPublic.ma) يُعرض أسفل محتوى المقال.
 * مصمَّم ليكون واضحاً كاقتراح/رابط خارجي (وليس جزءاً من محتوى المقال نفسه)،
 * حتى لا يلتبس على القارئ بأنه من تأليف Mizan Digital.
 */
export function PartnerSuggestionBox({ href, title, description, ctaLabel }: PartnerSuggestionBoxProps) {
  return (
    <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
          <GraduationCap size={18} />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600/80">اقتراح من شريك خارجي</p>
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-500 hover:underline"
          >
            <span>{ctaLabel}</span>
            <ArrowLeft size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}
