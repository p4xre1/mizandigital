import { readFileSync, readdirSync, existsSync } from "node:fs";
import { test, expect } from "vitest";

/**
 * طبقة المرجعيات /reference — كل JSON في src/data (والـ CMS وقت النشر)
 * يصبح مرجعاً نظيفاً للذكاء الاصطناعي:
 *   index.json/.md + لكل مجموعة بيانات <name>.json (مهيكّل) + <name>.md (مقروء)
 * + أداوتا MCP (mizan_reference_index / mizan_reference_search) تقرأان
 * الملفات نفسها. الشرط الأساسي: كل رابط في المرجع يقابل صفحة موجودة.
 */

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const DATASETS = ["articles", "news", "lexicon", "schools", "events", "docs", "laws", "faq", "quiz"];

test("المولّد ضمن سلسلة prebuild (يلتحق ببقية مولّدات البيانات)", () => {
  const pkg = JSON.parse(read("package.json"));
  expect(pkg.scripts.prebuild).toContain("node scripts/generate-reference.mjs");
});

test("المخرجات الملتزمة صالحة: index + 9 مجموعات × (json+md)", () => {
  const index = JSON.parse(read("public/reference/index.json"));
  expect(index.name).toBe("Mizan Digital AI Reference");
  expect(index.domain).toBe("https://www.mizan.page");
  expect(index.datasets).toHaveLength(9);
  expect(index.totalRecords).toBe(
    index.datasets.reduce((acc: number, d: { count: number }) => acc + d.count, 0)
  );
  for (const name of DATASETS) {
    const jsonFile = `public/reference/${name}.json`;
    expect(existsSync(new URL(`../${jsonFile}`, import.meta.url)), `${name}.json مفقود`).toBe(true);
    expect(existsSync(new URL(`../public/reference/${name}.md`, import.meta.url)), `${name}.md مفقود`).toBe(true);
    const data = JSON.parse(read(jsonFile));
    expect(data.count, `count ≠ items.length في ${name}`).toBe(data.items.length);
  }
  expect(existsSync(new URL("../public/reference/index.md", import.meta.url))).toBe(true);
});

test("كل سجل يملك رابطاً داخلياً قانونياً (لا مطلقات كاذبة ولا مسارات محلية)", () => {
  for (const name of DATASETS) {
    const data = JSON.parse(read(`public/reference/${name}.json`));
    for (const item of data.items as Array<{ url?: string }>) {
      expect(typeof item.url, `سجل بلا url في ${name}`).toBe("string");
      expect(item.url!.startsWith("/"), `url لا يبدأ بـ / في ${name}: ${item.url}`).toBe(true);
      expect(item.url).not.toMatch(/localhost|127\.0\.0\.1|src\/data|\.\.\//);
      // لا رابط مزدوج: الرابط في المرجع يُبنى من slug واحد
      expect((item.url!.match(/\//g) || []).length).toBeLessThanOrEqual(3);
    }
  }
});

test("روابط المرجع تطابق صفحات dist الفعلية (لا 404 في المرجع)", () => {
  const distExists = (p: string) =>
    existsSync(new URL(`../dist/${p}.html`, import.meta.url)) ||
    existsSync(new URL(`../dist/${p}/index.html`, import.meta.url));
  const missing: string[] = [];
  for (const name of DATASETS) {
    const data = JSON.parse(read(`public/reference/${name}.json`));
    for (const item of data.items as Array<{ url?: string; title?: string }>) {
      if (item.url && !distExists(item.url)) missing.push(`${name} → ${item.url} (${item.title ?? ""})`);
    }
  }
  expect(missing, `روابط بلا صفحة ثابتة:\n${missing.slice(0, 10).join("\n")}`).toEqual([]);
});

test("المولّد: جلب CMS غير قاتل + مجموعة laws بنص كامل", () => {
  const src = read("scripts/generate-reference.mjs");
  expect(src).toContain("fetchPublishedCmsContent");
  expect(src).toMatch(/_?if \(!cmsOk\)/);
  // laws: حقل content (عمود النص) يُنقل إلى المرجع
  expect(src).toMatch(/content:\s*joinBody\(l\.content\)/);
  // ترتيب slugs للأرشيف مطابق للسكربتات الأخرى (docs ثم pdfs ثم laws)
  expect(src).toContain("pdfTaken");
});

test("معرّفات المصطلحات لا تتكرر في المرجع (فصل التكرار بالمعرّف)", () => {
  const data = JSON.parse(read("public/reference/lexicon.json"));
  const slugs = (data.items as Array<{ slug: string }>).map((t) => t.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
});

test("MCP: الأداة الجديدتان في الدالة وفي server-card (مزامنة كاملة)", async () => {
  const fn = read("functions/[[path]].js");
  expect(fn).toContain('name: "mizan_reference_index"');
  expect(fn).toContain('name: "mizan_reference_search"');
  expect(fn).toContain("REFERENCE_DATASETS");
  expect(fn).toContain("mizan_reference_search");

  const card = JSON.parse(read("public/.well-known/mcp/server-card.json"));
  const cardTools = (card.tools as Array<{ name: string }>).map((t) => t.name);
  for (const t of ["mizan_site_info", "mizan_resource_links", "mizan_reference_index", "mizan_reference_search"]) {
    expect(cardTools, `أداة ${t} مفقودة من server-card`).toContain(t);
  }
});

/* ── فحص وظيفي حقيقي: نداءات JSON-RPC كاملة على onRequest ──────────────── */

// خادم أصول وهمي يخدم ملفات public/reference من القرص (نفس سلوك env.ASSETS)
function makeContext(pathname: string, body?: unknown) {
  const origin = "https://www.mizan.page";
  return {
    request: new Request(`${origin}${pathname}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
    env: {
      ASSETS: {
        fetch: async (req: Request) => {
          const u = new URL(req.url);
          if (u.pathname.startsWith("/reference/") && u.pathname.endsWith(".json")) {
            try {
              const text = read(`public${u.pathname}`);
              return new Response(text, { status: 200, headers: { "Content-Type": "application/json" } });
            } catch {
              return new Response("not found", { status: 404 });
            }
          }
          return new Response("not found", { status: 404 });
        },
      },
    },
  };
}

const mcpCall = async (body: unknown) => {
  const { onRequest } = await import("../functions/[[path]].js");
  const res = await onRequest(makeContext("/mcp", body) as never);
  return res.json() as Promise<any>;
};

test("MCP (وظيفي): tools/list تعرض الأدوات الأربعة", async () => {
  const r = await mcpCall({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  const names = (r.result.tools as Array<{ name: string }>).map((t) => t.name);
  expect(names).toEqual(
    expect.arrayContaining([
      "mizan_site_info",
      "mizan_resource_links",
      "mizan_reference_index",
      "mizan_reference_search",
    ])
  );
});

test("MCP (وظيفي): mizan_reference_index يعيد الفهرس الكامل", async () => {
  const r = await mcpCall({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "mizan_reference_index", arguments: {} },
  });
  const text = r.result.content[0].text as string;
  const index = JSON.parse(text);
  expect(index.name).toBe("Mizan Digital AI Reference");
  expect(index.datasets).toHaveLength(9);
});

test("MCP (وظيفي): بحث عربي في المعجم يعيد مصطلحات برابط قانوني", async () => {
  const r = await mcpCall({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "mizan_reference_search",
      arguments: { query: "قانون مدني", domain: "lexicon", limit: 5 },
    },
  });
  const out = JSON.parse(r.result.content[0].text as string);
  expect(out.count).toBeGreaterThan(0);
  expect(out.count).toBeLessThanOrEqual(5);
  for (const hit of out.results) {
    expect(hit.dataset).toBe("lexicon");
    expect(hit.url).toMatch(/^https:\/\/www\.mizan\.page\/lexicon\//);
    expect(hit.snippet.length).toBeGreaterThan(0);
  }
});

test("MCP (وظيفي): بحث بكلمة فرنسية يعمل (تعدد اللغات)", async () => {
  const r = await mcpCall({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "mizan_reference_search",
      arguments: { query: "personne morale", domain: "lexicon" },
    },
  });
  const out = JSON.parse(r.result.content[0].text as string);
  expect(out.count).toBeGreaterThan(0);
  expect(out.results[0].title).toContain("الشخص المعنوي");
});

test("MCP (وظيفي): مدخلات غير صالحة تُرفض بأخطاء JSON-RPC", async () => {
  const noQuery = await mcpCall({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "mizan_reference_search", arguments: {} },
  });
  expect(noQuery.error?.code).toBe(-32602);

  const badDomain = await mcpCall({
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: { name: "mizan_reference_search", arguments: { query: "قانون", domain: "nope" } },
  });
  expect(badDomain.error?.code).toBe(-32602);
  expect(badDomain.error.message).toContain("Unknown domain");

  const longQuery = await mcpCall({
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: { name: "mizan_reference_search", arguments: { query: "و " + "قانون ".repeat(7) } },
  });
  expect(longQuery.error?.code).toBe(-32602);
});

test("الفهارس المعلنة تشير إلى طبقة المرجعيات (اتساق الإعلان)", () => {
  const catalog = JSON.parse(read("public/.well-known/ai-catalog.json"));
  expect(
    catalog.entries.some((e: { identifier: string }) => e.identifier === "urn:air:mizan.page:reference:hub")
  ).toBe(true);

  const openapi = JSON.parse(read("public/.well-known/openapi.json"));
  expect(openapi.paths["/reference/index.json"]).toBeTruthy();
  expect(openapi.paths["/reference/{dataset}.json"]).toBeTruthy();
  expect(openapi.paths["/mcp"]).toBeTruthy();

  const apiCatalog = JSON.parse(read("public/.well-known/api-catalog"));
  expect(apiCatalog.resources.some((r: { path: string }) => r.path === "/reference/index.json")).toBe(true);

  expect(read("public/ai-sitemap.xml")).toContain("/reference/index.json");
  expect(read("public/robots.txt")).toContain("https://www.mizan.page/reference/index.json");

  // كلا ملفي llms يُعلنان الطبقة
  expect(read("scripts/lib/llms-content.mjs")).toContain("/reference/index.json");
  expect(read("scripts/generate-llms-enhanced.mjs")).toContain("/reference/index.json");
});
