/**
 * بطاقة إنفوغرافيك لخريطة الإحالات القانونية — ملخّص بصري قابل للقراءة في ثوانٍ.
 *
 * ما تعرضه: أرقام الخريطة، توزيع أنواع العلاقات، أكثر المواد ارتباطاً، وأكثر
 * أزواج النصوص إحالةً بعضها إلى بعض. كل ذلك محسوب من البيانات نفسها بلا أرقام
 * مكتوبة يدوياً، فتتحدث البطاقة تلقائياً مع أي إضافة.
 *
 * ما لا تفعله: لا تدّعي تغطية شاملة. الإحالات المعروضة هي ما ورد صراحةً في النصوص
 * المعتمدة في المستودع، وأغلب المواد لا تحمل إحالة لفظية، فتبقى خارج الخريطة.
 */
import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import {
  RELATION_LABELS,
  RELATION_ORDER,
  type Reference,
  type RelationType,
  buildGraph,
  safeHref,
  stats,
} from "@/lib/pro-tools/referenceMap";

const TYPE_COLORS: Record<RelationType, string> = {
  explicit: "var(--color-primary, #2f6f4f)",
  delegation: "#7c5cbf",
  procedural: "#1f7a8c",
  penal: "#b3452f",
  hierarchy: "#a8631a",
  interpretive: "#5a6472",
};

interface Props {
  references: Reference[];
  /** يُستدعى بمفتاح العقدة عند النقر على مادة في البطاقة، فتتركّز عليها الخريطة. */
  onFocusNode?: (key: string) => void;
  /** رابط المصدر الرسمي للمجموعة المنسّقة (يظهر في التذييل). */
  sourceUrl?: string;
  sourceLabel?: string;
}

export function ReferenceInfographicCard({ references, onFocusNode, sourceUrl, sourceLabel }: Props) {
  const totals = useMemo(() => stats(references), [references]);
  const graph = useMemo(() => buildGraph(references), [references]);

  const maxType = Math.max(1, ...RELATION_ORDER.map((type) => totals.byType[type] ?? 0));

  const hubs = useMemo(
    () =>
      [...graph.nodes]
        .map((node) => ({ node, degree: node.outgoing.length + node.incoming.length }))
        .sort((a, b) => b.degree - a.degree || a.node.article.localeCompare(b.node.article, "ar"))
        .slice(0, 5),
    [graph],
  );

  const pairs = useMemo(() => {
    const counts = new Map<string, { from: string; to: string; count: number }>();
    for (const reference of references) {
      const key = `${reference.fromText}\u0000${reference.toText}`;
      const current = counts.get(key);
      if (current) current.count += 1;
      else counts.set(key, { from: reference.fromText, to: reference.toText, count: 1 });
    }
    return [...counts.values()]
      .filter((pair) => pair.to && pair.from !== pair.to)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [references]);

  const href = safeHref(sourceUrl);
  const maxPair = Math.max(1, ...pairs.map((pair) => pair.count));

  return (
    <section
      aria-labelledby="reference-infographic-title"
      className="space-y-5 rounded-xl border border-border bg-card p-5"
      dir="rtl"
    >
      <header className="space-y-1">
        <p className="text-base text-foreground/80">ملخّص بصري</p>
        <h2 id="reference-infographic-title" className="text-xl font-bold">
          الخريطة في أرقام
        </h2>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "إحالة", value: totals.references },
          { label: "نصوص", value: totals.texts },
          { label: "مادة في الخريطة", value: totals.nodes },
          { label: "هدفاً مثبتاً بمصدره", value: totals.verifiedTargets },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-muted/40 p-3 text-center">
            <dt className="text-base text-foreground/80">{item.label}</dt>
            <dd className="text-2xl font-bold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-bold">توزيع أنواع العلاقات</h3>
          <ul className="space-y-2">
            {RELATION_ORDER.map((type) => {
              const count = totals.byType[type] ?? 0;
              return (
                <li key={type} className="space-y-1 text-base">
                  <div className="flex justify-between gap-2">
                    <span>{RELATION_LABELS[type]}</span>
                    <span className="tabular-nums text-foreground/80">{count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / maxType) * 100}%`, background: TYPE_COLORS[type] }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold">أكثر المواد ارتباطاً</h3>
          {hubs.length === 0 ? (
            <p className="text-base text-foreground/80">لا توجد إحالات بعد.</p>
          ) : (
            <ol className="space-y-2">
              {hubs.map(({ node, degree }) => (
                <li key={node.key} className="flex items-center justify-between gap-2 text-base">
                  {onFocusNode ? (
                    <button
                      type="button"
                      className="text-right underline-offset-2 hover:underline"
                      onClick={() => onFocusNode(node.key)}
                    >
                      <span className="block font-bold">{node.article}</span>
                      <span className="block text-sm text-foreground/80">{node.text}</span>
                    </button>
                  ) : (
                    <span>
                      <span className="block font-bold">{node.article}</span>
                      <span className="block text-sm text-foreground/80">{node.text}</span>
                    </span>
                  )}
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 tabular-nums">
                    {degree} رابط
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {pairs.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold">أكثر النصوص إحالةً بعضها إلى بعض</h3>
          <ul className="space-y-2">
            {pairs.map((pair) => (
              <li key={`${pair.from}|${pair.to}`} className="space-y-1 text-base">
                <div className="flex justify-between gap-2">
                  <span>
                    {pair.from} ← {pair.to}
                  </span>
                  <span className="tabular-nums text-foreground/80">{pair.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(pair.count / maxPair) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm text-foreground/80">
        <p>
          الأرقام تعكس الإحالات الصريحة والتخويلات المذكورة في النصوص المعتمدة فقط، وليست تغطية شاملة لكل مواد القانون.
        </p>
        {href && (
          <a className="inline-flex items-center gap-1 font-bold text-primary underline" href={href} target="_blank" rel="noopener noreferrer">
            {sourceLabel ?? "المصدر الرسمي"} <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </footer>
    </section>
  );
}

export default ReferenceInfographicCard;
