/**
 * خريطة الإحالات القانونية — الواجهة.
 *
 * تصميم هذه الشاشة يحكمه سؤال واحد: كيف يجيب الطالب عن «أين يُحيل هذا النص؟»
 * و«من يُحيل على هذا النص؟» في ثوانٍ، بلا اشتراك وبلا ادّعاء تغطية؟
 *
 * ثلاثة مبادئ تترتب عليه:
 *   1) الرسم ليس بديلاً عن القائمة. الخريطة تُظهر البنية، والقائمة تحمل النصّ
 *      الكامل والاقتباس والمصدر. قارئ الشاشة والأجهزة الصغيرة يصلان إلى نفس
 *      المحتوى من القائمة، والخريطة إضافة لا شرط.
 *   2) لا لون بلا معنى، ولا عقدة بلا مصدر. كل عقدة قابلة للنقر وكل إحالة تفتح
 *      رابطها الرسمي أو تُعلَم صراحةً بأن نصّها المُنفِّذ غير مثبت.
 *   3) الحالة في الرابط (?q=&focus=&type=) لا في ذاكرة المكوّن، فيمكن إرسال
 *      رابط إلى إحالة بعينها والرجوع إليها، ويعمل زر الرجوع في المتصفح كما يتوقع
 *      المستخدم.
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeftRight,
  ExternalLink,
  FileText,
  ListTree,
  Network,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  RELATION_HINTS,
  RELATION_LABELS,
  RELATION_ORDER,
  type Reference,
  type ReferenceNode,
  type RelationType,
  buildGraph,
  edgePath,
  filterReferences,
  layoutGraph,
  nodeKey,
  safeHref,
  stats,
} from "@/lib/pro-tools/referenceMap";
import { buttonClass, cardClass, inputClass } from "./ToolViews";

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
  /** مواد أضافها المحرّرون؛ تُعرض بحسب توفرها ولا تُدمج في المجموعة المنسّقة. */
  remotePending?: boolean;
  signedIn?: boolean;
  onSave?: (reference: Reference) => Promise<void>;
}

export function ReferenceMap({ references, remotePending, signedIn = false, onSave }: Props) {
  const [params, setParams] = useSearchParams();
  const [saving, setSaving] = useState("");

  const query = params.get("q") ?? "";
  const type = (params.get("type") ?? "all") as RelationType | "all";
  const text = params.get("text") ?? "all";
  const topic = params.get("topic") ?? "all";
  const focus = params.get("focus");
  const direction = (params.get("dir") ?? "all") as "all" | "outgoing" | "incoming";
  const view = params.get("view") === "list" ? "list" : "map";
  const selectedId = params.get("ref");

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const visible = useMemo(
    () => filterReferences(references, { query, type, text, topic, focus, direction }),
    [references, query, type, text, topic, focus, direction],
  );

  const graph = useMemo(() => buildGraph(visible), [visible]);
  const totals = useMemo(() => stats(references), [references]);

  const texts = useMemo(
    () => Array.from(new Set(references.map((r) => r.fromText))).sort((a, b) => a.localeCompare(b, "ar")),
    [references],
  );
  const topics = useMemo(
    () => Array.from(new Set(references.map((r) => r.topic))).sort((a, b) => a.localeCompare(b, "ar")),
    [references],
  );

  const selected = visible.find((r) => r.id === selectedId) ?? null;
  const focusNode = focus ? graph.byKey[focus] : undefined;
  const activeFilters = Boolean(query || type !== "all" || text !== "all" || topic !== "all" || focus);

  /**
   * عتبة الازدحام: بعد هذا العدد تصبح الخريطة كتلة خطوط لا تُقرأ، فتُعرض بدلاً
   * منها نقاط بداية. الرقم ليس جمالياً بل مقروئي: نحو 40 عقدة في مساحة
   * 920×620 تعني وسطياً نحو 26 بكسلاً بين العقدتين، وأقل من ذلك يختلط
   * النصّان. البحث والقائمة يظلان يعرضان كل النتائج بلا نقصان.
   */
  const CROWD_LIMIT = 40;
  const forceMap = params.get("map") === "1";
  const tooCrowded = graph.nodes.length > CROWD_LIMIT && !focus;
  const topNodes = useMemo(
    () =>
      [...graph.nodes]
        .sort(
          (a, b) =>
            b.outgoing.length + b.incoming.length - (a.outgoing.length + a.incoming.length) ||
            a.article.localeCompare(b.article, "ar"),
        )
        .slice(0, 12),
    [graph],
  );

  return (
    <section className="space-y-5" dir="rtl">
      {/* ── شريط البحث والترشيح ─────────────────────────────────────────── */}
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Search className="size-4" aria-hidden /> ابحث عن نصّ أو فصل أو موضوع
          </h2>
          {activeFilters && (
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground underline"
              onClick={() => setParams(new URLSearchParams({ view }), { replace: true })}
            >
              <RotateCcw className="size-3" aria-hidden /> إزالة كل الترشيحات
            </button>
          )}
        </div>
        <label className="block">
          <span className="sr-only">بحث في الخريطة</span>
          <input
            className={inputClass}
            type="search"
            value={query}
            placeholder="مثال: الفصل 71، الإضراب، نزع الملكية، المحكمة الدستورية"
            onChange={(event) => update({ q: event.target.value, focus: null })}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm">
            نوع العلاقة
            <select className={inputClass} value={type} onChange={(event) => update({ type: event.target.value })}>
              <option value="all">كل الأنواع</option>
              {RELATION_ORDER.map((value) => (
                <option key={value} value={value}>
                  {RELATION_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            النص
            <select className={inputClass} value={text} onChange={(event) => update({ text: event.target.value })}>
              <option value="all">كل النصوص</option>
              {texts.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            الموضوع
            <select className={inputClass} value={topic} onChange={(event) => update({ topic: event.target.value })}>
              <option value="all">كل المواضيع</option>
              {topics.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          {visible.length} من {totals.references} إحالة، و{graph.nodes.length} عقدة، و{graph.edges.length} رابطاً، منها{" "}
          {totals.verifiedTargets} هدفاً مثبتاً بمصدره الرسمي
        </p>
        {remotePending && (
          <p className="text-sm text-muted-foreground">
            المواد التي يضيفها فريق التحرير من لوحة الإدارة غير متاحة في هذه اللحظة. المعروض الآن هو المجموعة
            المنسّقة المحفوظة في الموقع.
          </p>
        )}
      </div>

      {/* ── مفتاح الأنواع ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {RELATION_ORDER.map((value) => (
          <button
            key={value}
            aria-pressed={type === value}
            title={RELATION_HINTS[value]}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm"
            style={type === value ? { borderColor: TYPE_COLORS[value], fontWeight: 700 } : undefined}
            onClick={() => update({ type: type === value ? null : value })}
          >
            <span className="size-3 rounded-full" style={{ background: TYPE_COLORS[value] }} aria-hidden />
            {RELATION_LABELS[value]}
            <span className="text-muted-foreground">({totals.byType[value] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* ── العقدة المختارة ─────────────────────────────────────────────── */}
      {focusNode && (
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{focusNode.text}</p>
              <h3 className="text-lg font-bold">{focusNode.article}</h3>
              <p className="text-sm text-muted-foreground">
                {focusNode.outgoing.length} إحالة صادرة و{focusNode.incoming.length} إحالة واردة
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "outgoing", "incoming"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={direction === value}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm"
                  onClick={() => update({ dir: value === "all" ? null : value })}
                >
                  {value === "all" ? "الكل" : value === "outgoing" ? "الصادر فقط" : "الوارد فقط"}
                </button>
              ))}
              <button className="text-sm text-muted-foreground underline" onClick={() => update({ focus: null })}>
                إلغاء التركيز
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── تبديل العرض ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <button
          aria-pressed={view === "map"}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-bold"
          onClick={() => update({ view: null })}
        >
          <Network className="size-4" aria-hidden /> الخريطة
        </button>
        <button
          aria-pressed={view === "list"}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-bold"
          onClick={() => update({ view: "list" })}
        >
          <ListTree className="size-4" aria-hidden /> القائمة
        </button>
      </div>

      {!visible.length ? (
        <p className={cardClass}>
          لا إحالة مطابقة في المادة المنشورة. عدّل البحث أو أزل الترشيحات؛ ولا تعرض المنصة إحالة لم تُقرأ في نصّها
          الرسمي.
        </p>
      ) : view === "map" && tooCrowded && !forceMap ? (
        <CrowdedMapNotice
          total={graph.nodes.length}
          entries={topNodes}
          onPick={(key) => update({ focus: key })}
          onForce={() => update({ map: "1" })}
        />
      ) : view === "map" ? (
        <MapCanvas
          references={visible}
          selectedId={selectedId}
          focus={focus}
          onSelectNode={(key) => update({ focus: focus === key ? null : key, ref: null })}
          onSelectEdge={(id) => update({ ref: id })}
        />
      ) : null}

      {/* ── الإحالة المختارة ────────────────────────────────────────────── */}
      {selected && (
        <ReferenceCard
          reference={selected}
          onClose={() => update({ ref: null })}
          signedIn={signedIn}
          saving={saving === selected.id}
          onSave={onSave}
          onSaving={() => setSaving(selected.id)}
          onSaved={() => setSaving("")}
        />
      )}

      {/* ── القائمة: النص الكامل دائماً، وهي المسار المتاح لقارئ الشاشة ───── */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <FileText className="size-4" aria-hidden /> الإحالات ({visible.length})
        </h2>
        {visible.map((reference) => (
          <article key={reference.id} className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold">
                {reference.fromArticle} <ArrowLeftRight className="inline size-4" aria-hidden /> {reference.toArticle}
              </p>
              <span
                className="rounded-lg px-2 py-1 text-xs font-bold text-white"
                style={{ background: TYPE_COLORS[reference.type] }}
              >
                {RELATION_LABELS[reference.type]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {reference.fromText === reference.toText
                ? `داخل نفس النص: ${reference.fromText}`
                : `${reference.fromText} ← ${reference.toText}`}
              {"، "}
              {reference.topic}
            </p>
            <p className="leading-8">{reference.relationship}</p>
            {reference.excerpt && (
              <blockquote className="border-r-4 border-border pr-4 text-sm leading-8 text-muted-foreground">
                «{reference.excerpt}»
              </blockquote>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <button className="font-bold text-primary underline" onClick={() => update({ ref: reference.id, focus: nodeKey(reference.fromText, reference.fromArticle) })}>
                تفاصيل الإحالة
              </button>
              <SourceLink href={reference.sourceUrl} label="النص المُحيل (المصدر الرسمي)" />
              {reference.targetVerified && <SourceLink href={reference.targetUrl} label="النص المُحال إليه" />}
              {reference.evidenceUrl && <SourceLink href={reference.evidenceUrl} label={reference.evidenceLabel || "مصدر التأكيد"} />}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * بداية الخريطة حين يكثر عدد العقد.
 *
 * لماذا لا نرسم الكل على أي حال؟ لأن خريطة مزدحمة ليست «أقل جمالاً»: هي
 * معلومة مفقودة. الخطوط تتقاطع فلا يتبين أيُّ نصٍّ أحال على أيٍّ، والمستخدم
 * يظنّ أن ما يراه ضعفٌ في الأداة وهو ضعفٌ في قراءة الرسم لا في البيانات.
 * فالأوْلى أن نطلب منه تحديد مجال — بعقدة، أو ببحث، أو بترشيح — ثم نرسم ما
 * يمكن قراءته. ومن أصرّ على رسم الكل فالخيار له صراحةً (?map=1).
 */
function CrowdedMapNotice({
  total,
  entries,
  onPick,
  onForce,
}: {
  total: number;
  entries: ReferenceNode[];
  onPick: (key: string) => void;
  onForce: () => void;
}) {
  return (
    <div className={cardClass}>
      <h3 className="font-bold">الخريطة أوضح حين تحدد مجالاً</h3>
      <p className="leading-8 text-muted-foreground">
        النتائج الحالية {total} عقدة: رسمها كلها في مساحة واحدة يصنع كتلة خطوط لا يتبين منها أيُّ نصٍّ أحال على أيٍّ.
        ابدأ من عقدة لترى جيرانها، أو استخدم البحث والقائمة فهما يعرضان كل النتائج بلا نقصان.
      </p>
      <div className="flex flex-wrap gap-2">
        {entries.map((node) => (
          <button
            key={node.key}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
            onClick={() => onPick(node.key)}
          >
            {node.article}
            <span className="text-muted-foreground"> ({node.outgoing.length + node.incoming.length})</span>
          </button>
        ))}
      </div>
      <p className="text-sm">
        أو <button className="font-bold text-primary underline" onClick={onForce}>ارسم كل العقد على أي حال</button>
        {" "}إن أردت الصورة الكاملة ولو كانت مزدحمة.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// الرسم
// ─────────────────────────────────────────────────────────────────────────────

function MapCanvas({
  references,
  selectedId,
  focus,
  onSelectNode,
  onSelectEdge,
}: {
  references: Reference[];
  selectedId: string | null;
  focus: string | null | undefined;
  onSelectNode: (key: string) => void;
  onSelectEdge: (id: string) => void;
}) {
  const graph = useMemo(() => buildGraph(references), [references]);
  const positions = useMemo(() => layoutGraph(graph.nodes, { width: 920, height: 620 }), [graph]);
  return (
    <div className={`${cardClass} overflow-x-auto`}>
      <svg
        viewBox="0 0 920 620"
        className="h-[620px] w-full min-w-[680px]"
        role="img"
        aria-label={`خريطة إحالات: ${graph.nodes.length} نصاً أو فصلاً، و${graph.edges.length} رابطاً بينها. النص الكامل لكل إحالة موجود في القائمة أسفل الخريطة.`}
      >
        <g>
          {graph.edges.map((edge) => {
            const a = positions[edge.from];
            const b = positions[edge.to];
            if (!a || !b) return null;
            const active = selectedId === edge.referenceId;
            return (
              <path
                key={edge.id}
                d={edgePath(a, b)}
                fill="none"
                stroke={TYPE_COLORS[edge.type]}
                strokeWidth={active ? 3.5 : 1.6}
                strokeOpacity={active ? 1 : 0.45}
                markerEnd="url(#mizan-ref-arrow)"
              />
            );
          })}
        </g>
        <defs>
          <marker id="mizan-ref-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className="text-muted-foreground" />
          </marker>
        </defs>
        <g>
          {graph.nodes.map((node) => {
            const point = positions[node.key];
            if (!point) return null;
            const isFocus = focus === node.key;
            const degree = node.outgoing.length + node.incoming.length;
            const radius = Math.min(26, 8 + degree * 1.6);
            return (
              <g
                key={node.key}
                role="button"
                tabIndex={0}
                aria-pressed={isFocus}
                aria-label={`${node.text} — ${node.article}. ${node.outgoing.length} إحالة صادرة و${node.incoming.length} إحالة واردة.`}
                className="cursor-pointer focus:outline-none"
                onClick={() => onSelectNode(node.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectNode(node.key);
                  }
                }}
              >
                <title>{`${node.text} — ${node.article}`}</title>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill={isFocus ? "var(--color-primary, #2f6f4f)" : "var(--color-card, #fff)"}
                  stroke={isFocus ? "var(--color-primary, #2f6f4f)" : "var(--color-border, #c9c9c9)"}
                  strokeWidth={isFocus ? 3 : 1.5}
                  className="focus:stroke-primary"
                />
                <text
                  x={point.x}
                  y={point.y + radius + 14}
                  textAnchor="middle"
                  className="fill-current text-[11px]"
                  style={{ fontWeight: isFocus ? 700 : 400 }}
                >
                  {node.article.length > 26 ? `${node.article.slice(0, 25)}…` : node.article}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <p className="text-sm text-muted-foreground">
        انقر عقدة لتركيز الخريطة عليها، وانقر رابطاً لعرض الإحالة. حجم العقدة بقدر عدد إحالاتها. الألوان بحسب نوع
        العلاقة كما في المفتاح أعلاه.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// بطاقة الإحالة
// ─────────────────────────────────────────────────────────────────────────────

function SourceLink({ href, label }: { href?: string; label: string }) {
  const safe = safeHref(href);
  if (!safe) return null;
  return (
    <a className="flex items-center gap-1 font-bold text-primary underline" href={safe} target="_blank" rel="noopener noreferrer">
      <ExternalLink className="size-3" aria-hidden /> {label}
    </a>
  );
}

function ReferenceCard({
  reference,
  onClose,
  signedIn,
  saving,
  onSave,
  onSaving,
  onSaved,
}: {
  reference: Reference;
  onClose: () => void;
  signedIn: boolean;
  saving: boolean;
  onSave?: (reference: Reference) => Promise<void>;
  onSaving: () => void;
  onSaved: () => void;
}) {
  const [message, setMessage] = useState("");
  const targetHref = reference.targetVerified ? safeHref(reference.targetUrl) : undefined;
  return (
    <article className={`${cardClass} border-primary`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">
            {reference.fromArticle} <ArrowLeftRight className="inline size-4" aria-hidden /> {reference.toArticle}
          </h3>
          <p className="text-sm text-muted-foreground">
            {RELATION_LABELS[reference.type]} — {RELATION_HINTS[reference.type]}
          </p>
        </div>
        <button className="text-sm text-muted-foreground underline" onClick={onClose}>
          إغلاق
        </button>
      </div>
      <dl className="grid gap-3 md:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">النص المُحيل</dt>
          <dd className="font-bold">{reference.fromText} — {reference.fromArticle}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">النص المُحال إليه</dt>
          <dd className="font-bold">{reference.toText} — {reference.toArticle}</dd>
        </div>
      </dl>
      <p className="leading-8">{reference.relationship}</p>
      {reference.excerpt && (
        <blockquote className="border-r-4 border-border pr-4 text-sm leading-8">
          «{reference.excerpt}»
          <footer className="mt-1 text-muted-foreground">نصّ الإحالة كما ورد في المصدر الرسمي</footer>
        </blockquote>
      )}
      {!reference.targetVerified && (
        <p className="rounded-lg border border-border bg-muted p-3 text-sm leading-7">
          النص المُحال إليه غير مثبت في هذه المادة: المصدر اكتفى بتخويل المشرّع دون تسمية نصّ بعينه. الرابط أدناه
          يعود إلى النص المُحيل، لا إلى نصّ مُفترض.
        </p>
      )}
      {reference.also && reference.also.length > 0 && (
        <p className="text-sm text-muted-foreground">أهداف أخرى في نفس الإحالة: {reference.also.join("، ")}</p>
      )}
      <div className="flex flex-wrap gap-4 text-sm">
        <SourceLink href={reference.sourceUrl} label="النص المُحيل (المصدر الرسمي)" />
        {targetHref && <SourceLink href={targetHref} label="النص المُحال إليه" />}
        {reference.evidenceUrl && <SourceLink href={reference.evidenceUrl} label={reference.evidenceLabel || "مصدر التأكيد"} />}
      </div>
      <p className="text-sm text-muted-foreground">
        مطابقة المصدر: {reference.reviewedBy} — {reference.reviewedOn}
      </p>
      {onSave && (
        <div className="flex flex-wrap items-center gap-3">
          {signedIn ? (
            <button
              className={buttonClass}
              disabled={saving}
              onClick={async () => {
                onSaving();
                setMessage("");
                try {
                  await onSave(reference);
                  setMessage("أُضيفت الإحالة إلى ملف البحث الخاص بك.");
                } catch {
                  setMessage("تعذر الحفظ. سجّل الدخول ثم أعد المحاولة.");
                } finally {
                  onSaved();
                }
              }}
            >
              {saving ? "جارٍ الحفظ..." : "أضف إلى ملف البحث"}
            </button>
          ) : (
            <Link className="font-bold text-primary underline" to="/login?next=%2Fpro-tools%2Freferences">
              سجّل الدخول مجاناً لحفظ هذه الإحالة في ملفك
            </Link>
          )}
          <span role="status">{message}</span>
        </div>
      )}
    </article>
  );
}

export default ReferenceMap;
