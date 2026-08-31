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

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const accept = request.headers.get("Accept") || "";

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
        if (name === "mizan_resource_links") return mcpResult(id, { content: [{ type: "text", text: JSON.stringify({ articles: "/articles", news: "/news", lexicon: "/lexicon", schools: "/schools", archive: "/archive", events: "/events", sitemap: "/sitemap.xml", llms: "/llms.txt" }) }] });
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

  return context.env.ASSETS.fetch(request);
}
