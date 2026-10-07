/**
 * خريطة الإحالات القانونية — المنطق الخالص.
 *
 * لماذا ملف مستقل عن المكوّن؟
 * ---------------------------
 * الخريطة ليست رسماً: قبل أي رسم هناك قرار «ما العقدة؟ وما الضلع؟ وما معنى
 * هذا الرابط؟». هذه القرارات تُتخذ هنا، مجرّدة عن React وDOM، حتى يمكن اختبارها
 * وحدها (`tests/reference-map.test.ts`) وإعادة استعمالها في السكربتات.
 *
 * القاعدة الحاكمة في هذا الملف
 * ----------------------------
 *   لا يُخترع شيء. الإحالة تُقرأ كما وردت في النص المصدر:
 *     - سمّى الدستورُ الفصلَ المُحالَ إليه برقمه  → `explicit` (إحالة صريحة).
 *     - اكتفى بتخويل المشرّع (يحدد القانون/قانون تنظيمي ...) → `delegation`.
 *   والفرق بينهما ظاهر للمستخدم في الواجهة، لأن الخلط بين «أحال على نص بعينه»
 *   و«أناط الأمر بالمشرّع» هو أصل كثير من الاستدلال الخاطئ في البحث القانوني.
 *
 *   أمّا النص المُنفِّذ الذي لم يسمّه الدستور فلا يُنسب إليه: `targetVerified`
 *   يبقى false، ويربط الرابط بالنص المصدر لا بنص مُفترض.
 */
import type { Entry } from "./model";
import curatedFile from "@/data/reference-map.json";

// ─────────────────────────────────────────────────────────────────────────────
// الأنواع
// ─────────────────────────────────────────────────────────────────────────────

/** أنواع العلاقة بين نصّين. المفاتيح ثابتة لأنها تُخزَّن في قاعدة البيانات. */
export type RelationType =
  | "explicit"
  | "delegation"
  | "procedural"
  | "penal"
  | "hierarchy"
  | "interpretive";

export const RELATION_LABELS: Record<RelationType, string> = {
  explicit: "إحالة صريحة",
  delegation: "تخويل تشريعي",
  procedural: "إسناد مسطري أو قضائي",
  penal: "إحالة زجرية",
  hierarchy: "قاعدة تراتبية",
  interpretive: "صلة تفسيرية أو مكملة",
};

export const RELATION_ORDER: RelationType[] = [
  "explicit",
  "delegation",
  "procedural",
  "penal",
  "hierarchy",
  "interpretive",
];

/** وصف موجز لكل نوع، يظهر في مفتاح الخريطة. */
export const RELATION_HINTS: Record<RelationType, string> = {
  explicit: "سمّى النصُّ النصَّ المُحال إليه: باباً أو فصلاً أو قانوناً بعينه.",
  delegation: "أناط النصُّ الأمرَ بالمشرّع دون أن يسمّي نصّاً بعينه (يحدد القانون…).",
  procedural: "أسند النصُّ إجراءً أو اختصاصاً إلى جهة قضائية أو إدارية.",
  penal: "أوجب النصُّ التجريم أو العقاب، وترك تحديده للقانون.",
  hierarchy: "قرّر النصُّ مرتبة قاعدة بالنسبة لغيرها في التراتبية.",
  interpretive: "صلة تُفهم بقراءة النصّين معاً، لا بإحالة لفظية مباشرة.",
};

export interface Reference {
  id: string;
  /** النص المُحيل (المصدر). */
  fromText: string;
  /** الفصل أو المادة المُحيلة. */
  fromArticle: string;
  /** النص المُحال إليه. */
  toText: string;
  /** الفصل أو المادة أو الموضوع المُحال إليه. */
  toArticle: string;
  /** أهداف إضافية في نفس النص المُحال إليه (مثل: الفصول 96 و97 و98). */
  also?: string[];
  type: RelationType;
  topic: string;
  relationship: string;
  /** اقتباس حرفي من النص المُحيل — دليل الإحالة، لا شرح لها. */
  excerpt: string;
  sourceUrl: string;
  sourceLabel?: string;
  targetUrl?: string;
  /** هل النص المُنفِّذ مُثبت بمصدر رسمي في هذه المادة؟ */
  targetVerified: boolean;
  evidenceUrl?: string;
  evidenceLabel?: string;
  reviewedBy: string;
  reviewedOn: string;
}

/** ضلع في الخريطة = إحالة واحدة من عقدة إلى عقدة. */
export interface ReferenceEdge {
  id: string;
  referenceId: string;
  from: string;
  to: string;
  type: RelationType;
  topic: string;
  title: string;
}

export interface ReferenceNode {
  key: string;
  text: string;
  article: string;
  /** معرّفات الأضلاع الخارجة والواردة. */
  outgoing: string[];
  incoming: string[];
}

export interface ReferenceGraph {
  nodes: ReferenceNode[];
  edges: ReferenceEdge[];
  byKey: Record<string, ReferenceNode>;
}

export interface Point {
  x: number;
  y: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// البحث العربي
// ─────────────────────────────────────────────────────────────────────────────

/**
 * تطبيع نص للبحث.
 *
 * لماذا؟ المستخدم يكتب «فصل 5» أو «الفصل ٥» أو «الفَصلُ 5»، والبيانات مكتوبة
 * بصيغة واحدة. بدونه يبحث الطالب عن «الماده 49» بلا ألف ولا تاء مربوطة فلا يجد
 * «المادة 49». التطبيع يوحّد الهمزات والأرقام والتشكيل وتاء التأنيث.
 */
export function normalizeArabic(value: string): string {
  return String(value ?? "")
    .replace(/[\u064B-\u065F\u0670]/g, "") // التشكيل
    .replace(/\u0640/g, "") // التطويل
    .replace(/[\u0622\u0623\u0625\u0627\u0671]/g, "\u0627") // آ أ إ ا ٱ ← ا
    .replace(/\u0649/g, "\u064A") // ى ← ي
    .replace(/\u0629/g, "\u0647") // ة ← ه
    .replace(/\u0624/g, "\u0648") // ؤ ← و
    .replace(/\u0626/g, "\u064A") // ئ ← ي
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // ٠-٩
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // ۰-۹
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

/** هل يحتوي `haystack` على كل كلمة من `query`؟ (بحث بـ AND على الكلمات) */
export function matchesQuery(haystack: string, query: string): boolean {
  const needle = normalizeArabic(query);
  if (!needle) return true;
  const stack = normalizeArabic(haystack);
  return needle.split(" ").every((word) => stack.includes(word));
}

// ─────────────────────────────────────────────────────────────────────────────
// بناء الخريطة
// ─────────────────────────────────────────────────────────────────────────────

/** مفتاح العقدة: النص + الموضع داخله. */
export function nodeKey(text: string, article: string): string {
  return `${text}::${article}`;
}

/**
 * فكّ مفتاح العقدة.
 *
 * الفاصل «::» لا يظهر في أسماء النصوص ولا في أسماء الفصول، والفصل متعمّد:
 * أي فاصل شائع («-» أو «|») قد يقع داخل اسم نص فيكسر التفكيك.
 */
export function splitKey(key: string): { text: string; article: string } {
  const index = key.indexOf("::");
  if (index < 0) return { text: key, article: "" };
  return { text: key.slice(0, index), article: key.slice(index + 2) };
}

/**
 * توسيع الإحالات إلى أضلاع.
 *
 * الفصل 42 يحيل على ثمانية فصول دفعة واحدة. تُخزَّن إحالةً واحدة (فهي جملة
 * واحدة في النص) وتُنشئ ثمانية أضلاع في الخريطة، حتى يرى الطالب كل فصل على حدة
 * حين يبحث عنه، ولا تتكرر الجملة نفسها ثماني مرات في القائمة.
 */
export function toEdges(references: Reference[]): ReferenceEdge[] {
  const edges: ReferenceEdge[] = [];
  for (const reference of references) {
    const targets = [reference.toArticle, ...(reference.also ?? [])];
    const seen = new Set<string>();
    targets.forEach((article, index) => {
      const trimmed = String(article ?? "").trim();
      if (!trimmed) return;
      const to = nodeKey(reference.toText, trimmed);
      if (seen.has(to)) return; // لا ضلع مكرر إن تكرر الهدف في `also`
      seen.add(to);
      edges.push({
        id: `${reference.id}#${index}`,
        referenceId: reference.id,
        from: nodeKey(reference.fromText, reference.fromArticle),
        to,
        type: reference.type,
        topic: reference.topic,
        title: `${reference.fromArticle} ← ${trimmed}`,
      });
    });
  }
  return edges;
}

export function buildGraph(references: Reference[]): ReferenceGraph {
  const edges = toEdges(references);
  const byKey: Record<string, ReferenceNode> = {};
  const touch = (key: string) => {
    if (!byKey[key]) {
      const { text, article } = splitKey(key);
      byKey[key] = { key, text, article, outgoing: [], incoming: [] };
    }
    return byKey[key];
  };
  for (const edge of edges) {
    touch(edge.from).outgoing.push(edge.id);
    touch(edge.to).incoming.push(edge.id);
  }
  const nodes = Object.values(byKey).sort((a, b) =>
    a.text.localeCompare(b.text, "ar") || a.article.localeCompare(b.article, "ar"),
  );
  return { nodes, edges, byKey };
}

// ─────────────────────────────────────────────────────────────────────────────
// الترشيح والإحصاء
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferenceFilter {
  query?: string;
  type?: RelationType | "all";
  text?: string | "all";
  topic?: string | "all";
  /** عقدة مختارة: تُبقي الإحالات المتصلة بها فقط. */
  focus?: string | null;
  /** «صادر» (ما يُحيل عليه) أو «وارد» (ما يُحال عليه). */
  direction?: "all" | "outgoing" | "incoming";
}

/** هل تطابق الإحالة هذا المرشّح؟ */
export function matchesFilter(reference: Reference, filter: ReferenceFilter): boolean {
  if (filter.type && filter.type !== "all" && reference.type !== filter.type) return false;
  if (filter.text && filter.text !== "all" && reference.fromText !== filter.text && reference.toText !== filter.text) return false;
  if (filter.topic && filter.topic !== "all" && reference.topic !== filter.topic) return false;
  const query = filter.query?.trim();
  if (query) {
    const haystack = [
      reference.fromText,
      reference.fromArticle,
      reference.toText,
      reference.toArticle,
      reference.relationship,
      reference.topic,
      reference.excerpt,
      ...(reference.also ?? []),
    ].join(" ");
    if (!matchesQuery(haystack, query)) return false;
  }
  return true;
}

export function filterReferences(references: Reference[], filter: ReferenceFilter): Reference[] {
  const focus = filter.focus;
  if (!focus) return references.filter((reference) => matchesFilter(reference, filter));
  const direction = filter.direction ?? "all";
  const connected = new Set<string>();
  for (const edge of toEdges(references)) {
    if (direction !== "incoming" && edge.from === focus) connected.add(edge.referenceId);
    if (direction !== "outgoing" && edge.to === focus) connected.add(edge.referenceId);
  }
  return references.filter(
    (reference) => connected.has(reference.id) && matchesFilter(reference, filter),
  );
}

export interface ReferenceStats {
  references: number;
  edges: number;
  nodes: number;
  texts: number;
  topics: number;
  verifiedTargets: number;
  byType: Record<RelationType, number>;
}

export function stats(references: Reference[]): ReferenceStats {
  const byType = Object.fromEntries(RELATION_ORDER.map((type) => [type, 0])) as Record<RelationType, number>;
  for (const reference of references) byType[reference.type] = (byType[reference.type] ?? 0) + 1;
  const graph = buildGraph(references);
  return {
    references: references.length,
    edges: graph.edges.length,
    nodes: graph.nodes.length,
    texts: new Set(graph.nodes.map((node) => node.text)).size,
    topics: new Set(references.map((reference) => reference.topic)).size,
    verifiedTargets: references.filter((reference) => reference.targetVerified).length,
    byType,
  };
}

/** جيران عقدة: ما يُحيل عليه وما يُحال عليه. مفيد في لوح التفاصيل. */
export function neighboursOf(edges: ReferenceEdge[], key: string): { outgoing: string[]; incoming: string[] } {
  return {
    outgoing: edges.filter((edge) => edge.from === key).map((edge) => edge.to),
    incoming: edges.filter((edge) => edge.to === key).map((edge) => edge.from),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// التموضع (حتمي، بلا محاكاة فيزيائية)
// ─────────────────────────────────────────────────────────────────────────────

export interface LayoutOptions {
  width?: number;
  height?: number;
  padding?: number;
}

/**
 * تموضع العقد: عناقيد دائرية، عنقود لكل نص قانوني.
 *
 * لماذا تموضع حتمي بدل محاكاة قوى (force-directed)؟
 *   1) النتيجة ثابتة: نفس البيانات تعطي نفس الرسم في كل تحميل وفي كل اختبار،
 *      فلا «تهتز» الخريطة بين زيارتين ولا يختلف التصيير بين الخادم والمتصفح.
 *   2) لا حلقة رسوم متحركة ولا استهلاك دائم للمعالج على الهاتف.
 *   3) يمكن اختباره: هذه الدالة خالصة وتُختبر في tests/reference-map.test.ts.
 * والثمن مقبول: الترتيب تجميعي لا جمالي، والمقصود إظهار البنية لا رسم لوحة.
 */
export function layoutGraph(
  nodes: ReferenceNode[],
  options: LayoutOptions = {},
): Record<string, Point> {
  const width = options.width ?? 900;
  const height = options.height ?? 620;
  const padding = options.padding ?? 70;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = Math.max(60, (width - padding * 2) / 2);
  const radiusY = Math.max(60, (height - padding * 2) / 2);
  const positions: Record<string, Point> = {};

  // عنقود لكل نص قانوني، بترتيب حتمي (لا ترتيب كائن JS).
  const texts = Array.from(new Set(nodes.map((node) => node.text))).sort((a, b) => a.localeCompare(b, "ar"));
  const groups = texts.map((text) => ({ text, nodes: nodes.filter((node) => node.text === text) }));

  if (groups.length === 1) {
    // نص واحد: دائرة واحدة في المنتصف أوضح من عنقود وحيد على المحيط.
    const group = groups[0];
    const ring = Math.min(radiusX, radiusY) * 0.72;
    group.nodes.forEach((node, index) => {
      const angle = (index / Math.max(1, group.nodes.length)) * Math.PI * 2 - Math.PI / 2;
      positions[node.key] = { x: centerX + Math.cos(angle) * ring, y: centerY + Math.sin(angle) * ring };
    });
    return positions;
  }

  const clusterRadius = Math.min(radiusX, radiusY) * 0.34;
  groups.forEach((group, groupIndex) => {
    const angle = (groupIndex / groups.length) * Math.PI * 2 - Math.PI / 2;
    const clusterX = centerX + Math.cos(angle) * radiusX * 0.62;
    const clusterY = centerY + Math.sin(angle) * radiusY * 0.62;
    const inner = Math.max(38, Math.min(clusterRadius, 26 + group.nodes.length * 9));
    group.nodes.forEach((node, index) => {
      if (group.nodes.length === 1) {
        positions[node.key] = { x: clusterX, y: clusterY };
        return;
      }
      const innerAngle = (index / group.nodes.length) * Math.PI * 2 - Math.PI / 2;
      positions[node.key] = {
        x: clusterX + Math.cos(innerAngle) * inner,
        y: clusterY + Math.sin(innerAngle) * inner,
      };
    });
  });
  return positions;
}

/** مسار منحنٍ بين نقطتين (للضلع) — منحنى خفيف يفرّق الأضلاع المتوازية. */
export function edgePath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const curve = Math.min(60, Math.hypot(dx, dy) * 0.18);
  const controlX = midX - dy * (curve / (Math.hypot(dx, dy) || 1)) * 0.5;
  const controlY = midY + dx * (curve / (Math.hypot(dx, dy) || 1)) * 0.5;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// التحويل من وإلى نموذج Entry (قاعدة البيانات)
// ─────────────────────────────────────────────────────────────────────────────

/** حقول `payload` المستعملة في إحالات قاعدة البيانات. */
export const referencePayloadKeys = [
  "from_text",
  "to_text",
  "from_article",
  "to_article",
  "relationship",
  "target_url",
  "relation_type",
  "excerpt",
  "also",
  "target_verified",
] as const;

const isRelationType = (value: string): value is RelationType =>
  (RELATION_ORDER as string[]).includes(value);

/**
 * تحويل مادة `pro_tool_entries` إلى إحالة.
 *
 * المادة القادمة من لوحة التحرير قد تكون ناقصة (مسوّدة، أو مادة كُتبت قبل إضافة
 * الحقول الجديدة). تُعالَج بالافتراضات الآمنة: نص بلا اسم يُسمّى «نص غير مسمّى»
 * بدل أن يُسقط، ونوع علاقة غير معروف يُصنَّف `explicit` بدل أن يُخفى،
 * والاقتباس الفارغ يُترك فارغاً (لا يُخترع).
 */
export function referenceFromEntry(entry: Entry, fallback?: { sourceUrl?: string; reviewedBy?: string; reviewedOn?: string }): Reference {
  const payload = entry.payload ?? {};
  const type = isRelationType(payload.relation_type ?? "") ? (payload.relation_type as RelationType) : "explicit";
  const targetUrl = payload.target_url || entry.source_url || fallback?.sourceUrl || "";
  return {
    id: entry.id,
    fromText: payload.from_text || "نص غير مسمّى",
    fromArticle: payload.from_article || entry.title,
    toText: payload.to_text || "نص غير مسمّى",
    toArticle: payload.to_article || "",
    also: String(payload.also ?? "")
      .split(/[،,\n]/)
      .map((part) => part.trim())
      .filter(Boolean),
    type,
    topic: entry.topic || "غير مصنّف",
    relationship: payload.relationship || "",
    excerpt: payload.excerpt || "",
    sourceUrl: entry.source_url || fallback?.sourceUrl || "",
    sourceLabel: entry.source_reference || "",
    targetUrl,
    targetVerified: payload.target_verified === "true",
    reviewedBy: entry.reviewed_by || fallback?.reviewedBy || "",
    reviewedOn: entry.reviewed_on || fallback?.reviewedOn || "",
  };
}

/** تحويل إحالة إلى مادة قابلة للحفظ في `pro_tool_entries`. */
export function entryFromReference(reference: Reference): Omit<Entry, "id" | "updated_at"> {
  return {
    tool_slug: "references",
    title: `${reference.fromArticle} ← ${reference.toArticle}`.slice(0, 200),
    topic: reference.topic,
    source_url: reference.sourceUrl,
    source_reference: reference.sourceLabel ?? "",
    reviewed_by: reference.reviewedBy,
    reviewed_on: reference.reviewedOn,
    published: true,
    payload: {
      from_text: reference.fromText,
      from_article: reference.fromArticle,
      to_text: reference.toText,
      to_article: reference.toArticle,
      relationship: reference.relationship,
      target_url: reference.targetUrl ?? "",
      relation_type: reference.type,
      excerpt: reference.excerpt,
      also: (reference.also ?? []).join("، "),
      target_verified: reference.targetVerified ? "true" : "false",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// المجموعة المنسّقة (البيانات المراجعة في المستودع)
// ─────────────────────────────────────────────────────────────────────────────

interface CuratedFile {
  meta: {
    title: string;
    corpus: string;
    sourceLabel: string;
    sourceUrl: string;
    altSourceLabel?: string;
    altSourceUrl?: string;
    reviewedBy: string;
    reviewedOn: string;
    method: string;
    limits: string;
  };
  references: Array<Omit<Reference, "sourceUrl" | "reviewedBy" | "reviewedOn"> & { sourceUrl?: string }>;
}

const curated = curatedFile as unknown as CuratedFile;

export const referenceMeta = curated.meta;

/**
 * الإحالات المنسّقة المراجعة والمحفوظة في المستودع.
 *
 * لماذا بيانات ثابتة في المستودع بدل الجدول فقط؟
 *   1) أصلها نص رسمي واحد، ومراجعتها مقابلة نصية تُوثَّق في Git مع كل تعديل،
 *      فيظهر من غيّر ماذا ومتى — وهو بالضبط ما يطلبه شرط «المراجعة».
 *   2) الصفحة تعمل للزائر بلا حساب ودون انتظار طلب شبكة، وتظل تعمل إن تعذّر
 *      الوصول إلى قاعدة البيانات.
 *   3) لوحة التحرير تضيف عليها مواد جديدة من الجدول، فلا تتعطّل إن تعذّر الاتصال.
 */
export const curatedReferences: Reference[] = curated.references.map((item) => ({
  ...item,
  sourceUrl: item.sourceUrl || curated.meta.sourceUrl,
  sourceLabel: curated.meta.sourceLabel,
  reviewedBy: curated.meta.reviewedBy,
  reviewedOn: curated.meta.reviewedOn,
}));

/**
 * دمج الإحالات المنسّقة مع مواد لوحة التحرير.
 *
 * الترتيب: المنسّقة أولاً (مراجعة وموثّقة في Git)، ثم مواد التحرير. الإحالة
 * التي تحمل نفس المعرّف تُستبدل، حتى يستطيع المحرّر تصحيح مادة منسّقة من
 * اللوحة دون تكرارها في الخريطة.
 */
export function mergeReferences(...groups: Reference[][]): Reference[] {
  const byId = new Map<string, Reference>();
  for (const group of groups) {
    for (const reference of group) {
      if (!reference?.id) continue;
      byId.set(reference.id, reference);
    }
  }
  return Array.from(byId.values());
}

/** هل هذا الرابط آمناً للعرض؟ (https فقط، بلا بيانات اعتماد في الرابط) */
export function safeHref(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return undefined;
    if (parsed.username || parsed.password) return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}
