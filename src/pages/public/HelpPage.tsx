import { AEOHead } from "../../components/seo/AEOHead"
import HelpChat from "../../components/help/HelpChat"

/** صفحة مساعد الموقع الكاملة. الزر العائم يعرض نفس المحادثة في كل الصفحات. */
export default function HelpPage() {
  return (
    <main dir="rtl" className="mx-auto max-w-3xl px-4 py-12">
      <AEOHead
        title="مساعد ميزان: كيف تستعمل الموقع"
        description="مساعد يشرح كيف تستعمل ميزان الرقمية: الأرشيف، والاختبارات، والمعجم، ودليل الكليات. لا يقدم استشارات قانونية."
        canonicalUrl="https://www.mizan.page/help"
      />

      <h1 className="mb-3 text-3xl font-black">مساعد ميزان</h1>
      <p className="mb-8 text-sm leading-7 text-muted-foreground">
        اسأل عن أي قسم في الموقع وسنرشدك إليه. المساعد يجيب من محتوى الموقع فقط، ولا يقدم استشارة قانونية في
        حالتك الشخصية.
      </p>

      <div className="rounded-2xl border border-border bg-card p-4">
        <HelpChat />
      </div>
    </main>
  )
}
