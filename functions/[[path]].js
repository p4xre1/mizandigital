const MARKDOWN = `# ميزان الرقمية

منصة مغربية للمعرفة القانونية والأكاديمية لطلبة الحقوق والباحثين.

## الموارد

- القانون المغربي والموارد التشريعية
- ملخصات ودروس ومحاضرات القانون
- المعجم القانوني المغربي
- المستجدات والأخبار القانونية المغربية
- دليل كليات الحقوق بالمغرب
- الأرشيف والموارد التعليمية وملفات PDF
- الندوات والفعاليات الأكاديمية

## التحقق القانوني

ميزان الرقمية منصة تعليمية وبحثية وليست مصدراً رسمياً للتشريع. عند الاستشهاد بنص قانوني يجب التحقق من النص النافذ عبر المصدر الرسمي.

## مصادر رسمية

- بوابة عدالة: https://adala.justice.gov.ma/
- الأمانة العامة للحكومة: https://www.sgg.gov.ma/
- الجريدة الرسمية: https://www.sgg.gov.ma/arabe/JournalOfficiel.aspx
- وزارة التعليم العالي والبحث العلمي والابتكار: https://www.enssup.gov.ma/

## الأقسام

- https://www.mizan.page/articles
- https://www.mizan.page/news
- https://www.mizan.page/lexicon
- https://www.mizan.page/schools
- https://www.mizan.page/archive
- https://www.mizan.page/events
`;

// مجموعات مرجعيات الذكاء الاصطناعي — المصدَر الوحيد هو ملفات
// /reference/*.json الثابتة (يولّدها prebuild). لا نسخة بيانات هنا:
// الأدوات تقرأ الملفات نفسها عبر env.ASSETS، فلا تَنفصل نسخة عن أخرى.
const REFERENCE_DATASETS = [
  "articles",
  "news",
  "lexicon",
  "schools",
  "events",
  "docs",
  "laws",
  "faq",
  "quiz"
];

const MCP_TOOLS = [
  {
    name: "mizan_site_info",
    title: "Mizan site information",
    description: "Returns the public identity, scope and important links of Mizan Digital.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "mizan_resource_links",
    title: "Mizan resource links",
    description: "Returns stable public URLs for Mizan Digital legal and academic resource sections.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "mizan_reference_index",
    title: "Mizan AI reference index",
    description:
      "Lists every AI reference dataset (record counts, JSON/Markdown file URLs, section URLs, URL patterns) plus the legal disclaimer. Start here to browse the full machine-readable content of the platform.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "mizan_reference_search",
    title: "Search Mizan reference data",
    description:
      "Full-text search across the public reference datasets (Arabic, French and English): legal terms with definitions, laws with full text, articles, news, schools, events, study PDFs, FAQ answers and quiz questions. Returns matching records with their canonical page URLs.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search terms, space separated — all terms must appear in the record (1-6 terms)."
        },
        domain: {
          type: "string",
          description:
            "Optional dataset filter: articles, news, lexicon, schools, events, docs, laws, faq, quiz."
        },
        limit: {
          type: "number",
          description: "Maximum results to return (1-50, default 10)."
        }
      },
      required: ["query"],
      additionalProperties: false
    }
  }
];

const MCP_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Method, Mcp-Version"
};

function mcpResult(id, result) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { status: 200, headers: MCP_HEADERS });
}

function mcpError(id, code, message) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), { status: 200, headers: MCP_HEADERS });
}

// قراءة ملف مرجعي ثابت (يولّده prebuild في public/reference/) عبر نفس
// شجرة الأصول التي يخدمها الزائر — لا بيانات مضمّنة هنا.
async function fetchReferenceJson(context, request, name) {
  const url = new URL(request.url);
  const assetUrl = `${url.origin}/reference/${name}.json`;
  const res = await context.env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// مقتطف مقروء من أول حقل نصي ذي معنى في السجل.
function referenceSnippet(item) {
  const t =
    item.definition || item.excerpt || item.summary || item.description ||
    item.synopsis || item.content || item.answer || item.question || "";
  const s = String(t).replace(/\s+/g, " ").trim();
  return s.length > 240 ? `${s.slice(0, 240).trimEnd()}…` : s;
}

function referenceTitle(item) {
  return item.title || item.term_ar || item.question || item.name || item.id || "";
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const accept = request.headers.get("Accept") || "";

  // توحيد الروابط: أي مسار (غير الجذر /) ينتهي بـ "/" يُحوَّل 301 لنفس
  // المسار بدون الشرطة المائلة. بدون هذا، Google كيفهرس نفس الصفحة
  // كرابطين مختلفين (مثال: /schools/fsjes-el-jadida و
  // /schools/fsjes-el-jadida/)، فيتوزّع signal الترتيب بينهم بدل ما
  // يتركّز فـ صفحة واحدة قوية.
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
    return Response.redirect(url.toString(), 301);
  }

  if (request.method === "OPTIONS" && url.pathname === "/mcp") {
    return new Response(null, { status: 204, headers: MCP_HEADERS });
  }

  if (url.pathname === "/mcp") {
    if (request.method === "GET") {
      return new Response(JSON.stringify({ name: "Mizan Digital MCP", version: "1.0.0", transport: "streamable-http", readOnly: true }), { status: 200, headers: MCP_HEADERS });
    }
    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return mcpError(null, -32700, "Invalid JSON"); }
      const id = body?.id ?? null;
      const method = body?.method;
      if (method === "ping") return mcpResult(id, {});
      if (method === "initialize") {
        return mcpResult(id, {
          protocolVersion: body?.params?.protocolVersion || "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "mizan-digital", version: "1.0.0" },
          instructions: "Public read-only legal and academic discovery tools. Verify legal claims against official sources."
        });
      }
      if (method === "tools/list") return mcpResult(id, { tools: MCP_TOOLS });
      if (method === "tools/call") {
        const name = body?.params?.name;
        if (name === "mizan_site_info") return mcpResult(id, { content: [{ type: "text", text: MARKDOWN }] });
        if (name === "mizan_resource_links") return mcpResult(id, { content: [{ type: "text", text: JSON.stringify({ articles: "/articles", news: "/news", lexicon: "/lexicon", schools: "/schools", archive: "/archive", events: "/events", sitemap: "/sitemap.xml", llms: "/llms.txt", reference: "/reference/index.json" }) }] });
        if (name === "mizan_reference_index") {
          const data = await fetchReferenceJson(context, request, "index");
          if (!data) return mcpError(id, -32603, "Reference index not available — the site build did not include /reference.");
          return mcpResult(id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
        }
        if (name === "mizan_reference_search") {
          const args = body?.params?.arguments || {};
          const query = String(args.query ?? "").trim().toLowerCase();
          if (!query) return mcpError(id, -32602, "query is required (1-6 space-separated terms, all must match).");
          const terms = query.split(/\s+/).filter(Boolean);
          if (terms.length > 6) return mcpError(id, -32602, "query accepts at most 6 terms.");
          const limit = Math.min(Math.max(parseInt(args.limit ?? 10, 10) || 10, 1), 50);
          const domain = args.domain ? String(args.domain) : null;
          if (domain && !REFERENCE_DATASETS.includes(domain)) {
            return mcpError(id, -32602, `Unknown domain "${domain}". Valid: ${REFERENCE_DATASETS.join(", ")}.`);
          }
          const domains = domain ? [domain] : REFERENCE_DATASETS;
          const results = [];
          for (const d of domains) {
            const data = await fetchReferenceJson(context, request, d);
            if (!data) continue;
            for (const item of data.items || []) {
              const haystack = JSON.stringify(item).toLowerCase();
              if (!terms.every((t) => haystack.includes(t))) continue;
              results.push({
                dataset: d,
                title: referenceTitle(item),
                url: item.url ? `${url.origin}${item.url}` : null,
                snippet: referenceSnippet(item)
              });
              if (results.length >= limit) break;
            }
            if (results.length >= limit) break;
          }
          return mcpResult(id, {
            content: [{ type: "text", text: JSON.stringify({ query, domain: domain || "all", count: results.length, results }, null, 2) }]
          });
        }
        return mcpError(id, -32602, "Unknown tool");
      }
      return mcpError(id, -32601, "Method not found");
    }
    return new Response("Method Not Allowed", { status: 405, headers: MCP_HEADERS });
  }

  if (url.pathname === "/" && accept.toLowerCase().includes("text/markdown")) {
    return new Response(MARKDOWN, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600, must-revalidate",
        "Vary": "Accept",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  const assetResponse = await context.env.ASSETS.fetch(request);

  // مع dist/404.html كل مسار بلا أصل يُخدَج في 404 — مطلوب للنسيان، وخاطئ
  // للمسارات التي يولّدها العميل (بروفايل مستخدم، رابط تحميل، لوحة تحكم،
  // أداة Pro): روابط حقيقية تُشارك في واتساب/لينكد إن. إن لم نجد أصلاً لهذا
  // المسار وعرفنا أنه موجّه تطبيقي، نُسلّم هيكل التطبيق بحالة 200. لا قائمة
  // مسارات مفهرسة هنا: كل ما تحتها صفحات ثابتة مولّدة أو حالات 404 حقيقية.
  const CLIENT_ROUTE_PREFIXES = ["/u/", "/download/", "/admin/", "/pro-tools/"];
  const isClientRoute = (pathname) =>
    CLIENT_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname === "/admin" ||
    pathname === "/pro-tools";

  if (assetResponse.status === 404 && isClientRoute(url.pathname)) {
    const shell = await context.env.ASSETS.fetch(
      new Request(new URL("/app.html", url).href, { method: "GET" })
    );

    if (shell.status === 200) {
      return new Response(shell.body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
          "X-Robots-Tag": "noindex, follow",
        },
      });
    }
  }

  return assetResponse;
}
