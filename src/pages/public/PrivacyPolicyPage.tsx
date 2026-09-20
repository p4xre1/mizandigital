import { AEOHead } from "../../components/seo/AEOHead"
import { LegalSection as Section } from "../../components/legal/LegalSection"
import { LegalBlocks } from "../../components/legal/LegalBlocks"
import { ShieldCheck } from "lucide-react"
import { PRIVACY_POLICY } from "@/content/legal/policies.js"

/**
 * المحتوى يأتي من src/content/legal/policies.js — نفس المصدر الذي يبني منه
 * scripts/prerender.mjs الـ HTML المنشور. لا نسخة ثانية من النص هنا.
 */
export function PrivacyPolicyPage() {
  return (
    <>
      <AEOHead
        title={PRIVACY_POLICY.title}
        description={PRIVACY_POLICY.description}
        directAnswer={PRIVACY_POLICY.directAnswer}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "سياسة الخصوصية", url: "https://www.mizan.page/privacy" },
        ]}
        faq={PRIVACY_POLICY.faq}
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">{PRIVACY_POLICY.heading}</h1>
          <p className="mt-2 text-xs text-muted-foreground">{PRIVACY_POLICY.updatedNote}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={12} /> {PRIVACY_POLICY.badge}
          </div>
        </header>

        <div className="space-y-8">
          {PRIVACY_POLICY.sections.map((section) => (
            <Section key={section.title} title={section.title}>
              <LegalBlocks blocks={section.blocks} />
            </Section>
          ))}
        </div>
      </main>
    </>
  )
}
