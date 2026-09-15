import { useEffect, useState } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { fetchGuidelines, type CommunityGuideline } from "@/lib/governance/service";
import { Shield, BookOpen, MessageSquare, Scale, Loader2 } from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  general: Shield,
  content: BookOpen,
  quiz: Scale,
  comments: MessageSquare,
  legal: Scale,
};

export function GuidelinesPage() {
  const [guidelines, setGuidelines] = useState<CommunityGuideline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuidelines()
      .then(setGuidelines)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container-wide py-10" dir="rtl">
      <SEOHead
        title="إرشادات المجتمع — ميزان الرقمية"
        description="إرشادات المجتمع لميزان الرقمية: الاحترام، الدقة القانونية، منع السبام، ونزاهة الاختبارات."
        canonicalUrl="https://www.mizan.page/guidelines"
      />

      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-black text-foreground">إرشادات المجتمع</h1>
        <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
          ميزان الرقمية مجتمع طلابي مهني يهدف إلى تسهيل الولوج إلى المعرفة القانونية. هذه الإرشادات تضمن بيئة محترمة وآمنة للجميع.
        </p>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {guidelines.map((g) => {
              const Icon = ICONS[g.category] || Shield;
              return (
                <div key={g.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="flex-1">
                      <h2 className="text-[14px] font-extrabold text-foreground">{g.title}</h2>
                      <p className="mt-1.5 text-[12.5px] leading-7 text-muted-foreground">{g.content}</p>
                      <span className="mt-2 inline-block rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">{g.category}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <h3 className="text-[13px] font-extrabold text-foreground">الإبلاغ عن مخالفة</h3>
          <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
            إذا صادفت محتوى يخالف هذه الإرشادات، استعمل زر “إبلاغ” الموجود في كل مقال، تعليق، أو مصطلح. تتم مراجعة البلاغات من طرف الإدارة خلال 24-48 ساعة.
          </p>
        </div>
      </div>
    </main>
  );
}
