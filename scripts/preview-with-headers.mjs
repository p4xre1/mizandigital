#!/usr/bin/env node
/**
 * preview-with-headers.mjs — يقدّم dist/ **بالترويسات الحقيقية** المولَّدة في
 * dist/_headers.
 *
 * لماذا هذا الملف؟
 *   `vite dev` و`vite preview` لا يقرآن ملف `_headers` إطلاقاً، فسياسة CSP لا
 *   تُطبَّق محلياً أبداً. ولهذا مرّ عطل الإنتاج (حجب حزمة التطبيق بسبب
 *   'strict-dynamic' + hash بلا integrity) بلا أن يراه أحد في التطوير: الموقع
 *   يعمل محلياً 100% ثم يُحجب كلياً على Cloudflare Pages.
 *
 *   هذا الخادم يقرأ dist/_headers ويطبّق قواعده على كل استجابة، فيصبح العطل
 *   مرئياً في وحدة تحكم المتصفح محلياً — نفس ما يراه الزائر على الإنتاج.
 *
 * استثناءان للعرض المحلي فقط (المعاينة تعمل داخل إطار iframe):
 *   - frame-ancestors تُوسَّع، وX-Frame-Options يُخفَّض — لا علاقة لهما بحجب
 *     السكربتات، وبدونهما لا يمكن معاينة الموقع داخل إطار.
 *   بقيّة التوجيهات (script-src/style-src/connect-src…) تُنسخ حرفياً.
 *
 * التشغيل:  node scripts/preview-with-headers.mjs [منفذ]
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = resolve(rootDir, "dist");
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const HOST = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

/** يقرأ dist/_headers ويحوّله إلى قائمة قواعد {pattern, headers}. */
async function loadHeaderRules() {
  let text;
  try {
    text = await readFile(join(DIST, "_headers"), "utf8");
  } catch {
    console.error("[preview] ✗ dist/_headers غير موجود — شغّل npm run build أولاً");
    process.exit(1);
  }
  const rules = [];
  let current = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    const m = /^\s+([A-Za-z0-9-]+):\s*(.*)$/.exec(line);
    if (m && current) current.headers.push([m[1], m[2]]);
  }
  return rules;
}

/** هل يطابق النمط المسار؟ (يدعم * و/*.ext كما في Cloudflare Pages) */
function patternMatches(pattern, pathname) {
  if (pattern === "/*" || pattern === "/*") return true;
  if (pattern === pathname) return true;
  if (pattern.startsWith("/*.")) return pathname.endsWith(pattern.slice(1));
  if (pattern.endsWith("/*")) return pathname.startsWith(pattern.slice(0, -1));
  return false;
}

const rules = await loadHeaderRules();

function headersFor(pathname) {
  const out = new Map();
  for (const rule of rules) {
    if (!patternMatches(rule.pattern, pathname)) continue;
    for (const [name, value] of rule.headers) out.set(name.toLowerCase(), { name, value });
  }
  // استثناءات المعاينة المحلية (انظر التعليق أعلى الملف).
  out.delete("x-frame-options");
  out.set("x-frame-options", { name: "X-Frame-Options", value: "ALLOWALL" });
  const csp = out.get("content-security-policy");
  if (csp) {
    out.set("content-security-policy", {
      name: csp.name,
      value: csp.value.replace(/frame-ancestors[^;]*/i, "frame-ancestors *"),
    });
  }
  return [...out.values()];
}

/** يحلّ المسار إلى ملف داخل dist (بلا خروج عن الجذر). */
async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname.split("?")[0]);
  const rel = normalize(decoded).replace(/^([.][.](\/|\\|$))+/, "").replace(/^\/+/, "");
  const candidates = [join(DIST, rel)];
  if (rel === "" ) candidates.push(join(DIST, "index.html"));
  if (!extname(rel)) {
    candidates.push(join(DIST, `${rel}.html`), join(DIST, rel, "index.html"));
  }
  for (const candidate of candidates) {
    const full = resolve(candidate);
    if (full !== DIST && !full.startsWith(DIST + sep)) continue;
    try {
      const info = await stat(full);
      if (info.isFile()) return full;
    } catch {
      /* تابع */
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  const file = await resolveFile(pathname);
  const headers = headersFor(pathname);
  if (!file) {
    const notFound = join(DIST, "404.html");
    const body = await readFile(notFound).catch(() => Buffer.from("404"));
    res.writeHead(404, { ...Object.fromEntries(headers.map((h) => [h.name, h.value])), "Content-Type": MIME[".html"] });
    res.end(req.method === "HEAD" ? undefined : body);
    return;
  }
  const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
  const extra = Object.fromEntries(headers.map((h) => [h.name, h.value]));
  const info = await stat(file);
  res.writeHead(200, {
    ...extra,
    "Content-Type": type,
    "Content-Length": info.size,
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[preview] dist/ مع ترويسات الإنتاج على http://${HOST}:${PORT}`);
  const csp = headersFor("/").find((h) => h.name === "Content-Security-Policy");
  console.log(`[preview] ${csp ? csp.value : "لا CSP"}`);
});
