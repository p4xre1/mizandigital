/**
 * اختبارات خريطة الإحالات — المنطق الخالص ومجموعة البيانات المنسّقة.
 *
 * ما يُختبر هنا ليس الرسم، بل القرارات التي يبنى عليها الرسم: ما العقدة،
 * وما الضلع، وهل الترشيح يُرجع الإحالة الصحيحة، وهل البيانات المنشورة تستوفي
 * شرط المصدر. الرسم بلا هذه القرارات مجرد أشكال.
 */
import { describe, expect, it } from "vitest";
import {
  RELATION_ORDER,
  type Reference,
  buildGraph,
  curatedReferences,
  edgePath,
  entryFromReference,
  filterReferences,
  layoutGraph,
  matchesQuery,
  mergeReferences,
  neighboursOf,
  nodeKey,
  normalizeArabic,
  referenceFromEntry,
  safeHref,
  splitKey,
  stats,
  toEdges,
} from "../src/lib/pro-tools/referenceMap";
import type { Entry } from "../src/lib/pro-tools/model";

const reference = (overrides: Partial<Reference> = {}): Reference => ({
  id: "r1",
  fromText: "الدستور المغربي (2011)",
  fromArticle: "الفصل 42",
  toText: "الدستور المغربي (2011)",
  toArticle: "الفصل 51",
  type: "explicit",
  topic: "المؤسسات الدستورية",
  relationship: "إحالة داخلية",
  excerpt: "توقع الظهائر بالعطف من قبل رئيس الحكومة، ماعدا تلك المنصوص عليها في الفصول 41 و44.",
  sourceUrl: "https://example.org/constitution",
  targetUrl: "https://example.org/constitution",
  targetVerified: true,
  reviewedBy: "مراجع",
  reviewedOn: "2026-01-01",
  ...overrides,
});

describe("البحث العربي", () => {
  it("يوحّد الهمزات والتاء المربوطة والأرقام العربية والتشكيل", () => {
    expect(normalizeArabic("الفَصلُ ٥")).toBe(normalizeArabic("الفصل 5"));
    expect(normalizeArabic("المـادة ٤٩")).toBe(normalizeArabic("الماده 49"));
    expect(normalizeArabic("مدونة الأسرة")).toBe(normalizeArabic("مدونة الاسره"));
  });

  it("يطابق كل كلمات البحث (AND) ويقبل الفراغ بوصفه بلا ترشيح", () => {
    expect(matchesQuery("الفصل 71 من الدستور", "الفصل 71")).toBe(true);
    expect(matchesQuery("الفصل 71 من الدستور", "الفصل 99")).toBe(false);
    expect(matchesQuery("أي نص", "   ")).toBe(true);
  });

  it("لا يطابق بحثاً فارغاً بعد التطبيع إن كان حروف تنصيص فقط", () => {
    expect(matchesQuery("الفصل 5", "«»")).toBe(false);
  });
});

describe("مفاتيح العقد", () => {
  it("يبني المفتاح ويفكّه دون أن يكسره فاصل داخل اسم النص", () => {
    const key = nodeKey("قانون المسطرة الجنائية", "الفصل 1");
    expect(splitKey(key)).toEqual({ text: "قانون المسطرة الجنائية", article: "الفصل 1" });
  });

  it("يتحمّل مفتاحاً بلا فاصل بدل أن يرمي استثناءً", () => {
    expect(splitKey("بلا-فاصل")).toEqual({ text: "بلا-فاصل", article: "" });
  });
});

describe("بناء الخريطة", () => {
  it("يوسّع الأهداف المتعددة إلى أضلاع مستقلة", () => {
    const edges = toEdges([reference({ also: ["الفصل 96", "الفصل 97", "الفصل 98"] })]);
    expect(edges).toHaveLength(4);
    expect(edges.map((edge) => edge.to)).toEqual([
      nodeKey("الدستور المغربي (2011)", "الفصل 51"),
      nodeKey("الدستور المغربي (2011)", "الفصل 96"),
      nodeKey("الدستور المغربي (2011)", "الفصل 97"),
      nodeKey("الدستور المغربي (2011)", "الفصل 98"),
    ]);
  });

  it("لا يكرّر الضلع إن تكرر الهدف في also", () => {
    const edges = toEdges([reference({ also: ["الفصل 51"] })]);
    expect(edges).toHaveLength(1);
  });

  it("يحسب الصادر والوارد لكل عقدة", () => {
    const graph = buildGraph([
      reference({ id: "a", fromArticle: "الفصل 10", toArticle: "الفصل 7" }),
      reference({ id: "b", fromArticle: "الفصل 69", toArticle: "الفصل 10" }),
    ]);
    const node = graph.byKey[nodeKey("الدستور المغربي (2011)", "الفصل 10")];
    expect(node.outgoing).toHaveLength(1);
    expect(node.incoming).toHaveLength(1);
    expect(neighboursOf(graph.edges, node.key).incoming).toEqual([nodeKey("الدستور المغربي (2011)", "الفصل 69")]);
  });
});

describe("الترشيح", () => {
  const set = [
    reference({ id: "a", type: "explicit", topic: "الحريات", fromArticle: "الفصل 28", toArticle: "الفصل 165" }),
    reference({ id: "b", type: "delegation", topic: "العمل البرلماني", fromArticle: "الفصل 67", toArticle: "لجان تقصي الحقائق", toText: "قانون تنظيمي" }),
  ];

  it("يرشّح بالنوع والموضوع والنص", () => {
    expect(filterReferences(set, { type: "delegation" }).map((r) => r.id)).toEqual(["b"]);
    expect(filterReferences(set, { topic: "الحريات" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterReferences(set, { text: "قانون تنظيمي" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("يرشّح بالعقدة المركَّز عليها وباتجاه العلاقة", () => {
    const focus = nodeKey("الدستور المغربي (2011)", "الفصل 165");
    expect(filterReferences(set, { focus }).map((r) => r.id)).toEqual(["a"]);
    expect(filterReferences(set, { focus, direction: "incoming" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterReferences(set, { focus, direction: "outgoing" })).toEqual([]);
  });

  it("يبحث في الاقتباس ونص الشرح أيضاً", () => {
    const found = filterReferences([reference({ excerpt: "حق الإضراب مضمون" })], { query: "الإضراب" });
    expect(found).toHaveLength(1);
  });
});

describe("التموضع", () => {
  it("حتمي: نفس العقد تعطي نفس الإحداثيات في كل مرة", () => {
    const graph = buildGraph(curatedReferences.slice(0, 12));
    const first = layoutGraph(graph.nodes);
    const second = layoutGraph(graph.nodes);
    expect(second).toEqual(first);
  });

  it("يضع كل العقد داخل حدود الرسم", () => {
    const graph = buildGraph(curatedReferences);
    const positions = layoutGraph(graph.nodes, { width: 900, height: 600, padding: 60 });
    for (const point of Object.values(positions)) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(900);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(600);
    }
  });

  it("يعطي كل عقدة موضعاً، فلا عقدة بلا إحداثيات", () => {
    const graph = buildGraph(curatedReferences);
    const positions = layoutGraph(graph.nodes);
    expect(Object.keys(positions)).toHaveLength(graph.nodes.length);
  });

  it("يبني مساراً منحنياً صالحاً، ويتحمّل نقطتين متطابقتين", () => {
    expect(edgePath({ x: 0, y: 0 }, { x: 100, y: 100 })).toMatch(/^M 0\.0 0\.0 Q .* 100\.0 100\.0$/);
    expect(() => edgePath({ x: 10, y: 10 }, { x: 10, y: 10 })).not.toThrow();
  });
});

describe("التحويل من وإلى Entry", () => {
  it("يدعم الدورة الكاملة دون فقدان الحقول", () => {
    const source = reference({ also: ["الفصل 96"], targetVerified: false });
    const back = referenceFromEntry({ ...entryFromReference(source), id: "x", updated_at: "2026-01-01" } as Entry);
    expect(back.fromArticle).toBe(source.fromArticle);
    expect(back.toArticle).toBe(source.toArticle);
    expect(back.type).toBe(source.type);
    expect(back.also).toEqual(["الفصل 96"]);
    expect(back.targetVerified).toBe(false);
  });

  it("يعالج مادة ناقصة من لوحة التحرير بدل أن يسقطها", () => {
    const entry = {
      id: "e1",
      tool_slug: "references",
      title: "إحالة",
      topic: "",
      source_url: "https://example.org/x",
      source_reference: "",
      reviewed_by: "",
      reviewed_on: null,
      published: true,
      payload: { from_article: "الفصل 1", to_article: "الفصل 2", relationship: "شرح", target_url: "https://example.org/2" },
      updated_at: "2026-01-01",
    } as unknown as Entry;
    const parsed = referenceFromEntry(entry, { sourceUrl: "https://example.org/fallback", reviewedBy: "فريق", reviewedOn: "2026-02-02" });
    expect(parsed.fromText).toBe("نص غير مسمّى");
    expect(parsed.type).toBe("explicit");
    expect(parsed.reviewedBy).toBe("فريق");
    expect(parsed.targetVerified).toBe(false);
  });
});

describe("الروابط", () => {
  it("يقبل HTTPS فقط ويرفض المخططات الخطرة وبيانات الاعتماد", () => {
    expect(safeHref("https://example.org/a")).toBe("https://example.org/a");
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "http://example.org", "https://u:p@example.org", "not a url", ""]) {
      expect(safeHref(bad), bad).toBeUndefined();
    }
  });
});

describe("الدمج والإحصاء", () => {
  it("يتيح لمادة التحرير أن تتقدّم على المادة المنسّقة بنفس المعرّف", () => {
    const custom = reference({ id: "c2011-a29-strike", relationship: "شرح موسّع" });
    const merged = mergeReferences(curatedReferences, [custom]);
    expect(merged.filter((r) => r.id === "c2011-a29-strike")).toHaveLength(1);
    expect(merged.find((r) => r.id === "c2011-a29-strike")?.relationship).toBe("شرح موسّع");
  });

  it("يحسب الأضلاع والعقد والأنواع", () => {
    const totals = stats(curatedReferences);
    expect(totals.references).toBe(curatedReferences.length);
    expect(totals.edges).toBeGreaterThan(totals.references); // لأن some إحالات متعددة الأهداف
    expect(totals.nodes).toBeGreaterThan(0);
    expect(Object.keys(totals.byType).sort()).toEqual([...RELATION_ORDER].sort());
  });
});

describe("المجموعة المنسّقة المنشورة", () => {
  it("لا إحالة بلا مصدر ولا اقتباس", () => {
    for (const item of curatedReferences) {
      expect(item.sourceUrl, item.id).toMatch(/^https:\/\//);
      expect(item.excerpt.length, item.id).toBeGreaterThan(20);
      expect(item.relationship.length, item.id).toBeGreaterThan(20);
      expect(RELATION_ORDER, item.id).toContain(item.type);
    }
  });

  it("كل هدف مؤكد له رابط https، وكل هدف غير مؤكد معلوم هكذا صراحةً", () => {
    for (const item of curatedReferences) {
      if (item.targetVerified) expect(item.targetUrl, item.id).toMatch(/^https:\/\//);
      else expect(item.targetVerified, item.id).toBe(false);
    }
  });

  it("لا معرّف مكرر، ولا إحالة مكررة", () => {
    const ids = curatedReferences.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    const pairs = curatedReferences.map((item) => `${item.fromArticle}|${item.toArticle}|${item.type}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("مراجعتها موثّقة بتاريخ لا يتجاوز اليوم", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const item of curatedReferences) {
      expect(item.reviewedBy.length, item.id).toBeGreaterThan(0);
      expect(item.reviewedOn <= today, item.id).toBe(true);
    }
  });

  it("تبني خريطة متصلة: لكل ضلع طرفان موجودان في العقد", () => {
    const graph = buildGraph(curatedReferences);
    for (const edge of graph.edges) {
      expect(graph.byKey[edge.from], edge.id).toBeDefined();
      expect(graph.byKey[edge.to], edge.id).toBeDefined();
    }
  });
});
