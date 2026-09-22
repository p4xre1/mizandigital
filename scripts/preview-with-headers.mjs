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
 * أمان المسارات:
 *   لا يُبنى أي مسار ملفات من عنوان الطلب إطلاقاً. عند الإقلاع يُبنى فهرس
 *   (Map) من مسارات URL إلى ملفات dist/ الفعلية عبر readdir، والطلب يُستعمل
 *   **مفتاح بحث** في هذا الفهرس فقط. فلا حقن مسارات ولا `..` ولا ترميزات
 *   مزدوجة — وهو أيضاً ما يجعل التدقيق الأمني (CodeQL js/path-injection) هادئاً.
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
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
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

/**
 * يفهرس كل ملفات dist/ مرة واحدة عند الإقلاع:
 *   "/index.html" → ملف، و"/" و"/index" كذلك، و"/about.html" → ملف، و"/about"…
 * القيم كلّها مأخوذة من الشجرة على القرص، فلا تدخل بيانات الطلب في أي مسار.
 */
async function buildIndex() {
  const index = new Map();
  let files = 0;

  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      files += 1;
      const rel = relative(DIST, full).split(sep).join("/");
      index.set(`/${rel}`, full);
      if (rel.endsWith("/index.html")) {
        const base = rel.slice(0, -"index.html".length); // ينتهي بـ "/"
        index.set(`/${base}`.replace(/\/+$/, "/") || "/", full);
      } else if (rel.endsWith(".html")) {
        index.set(`/${rel.slice(0, -".html".length)}`, full);
      }
    }
  };

  await walk(DIST).catch(() => {
    console.error("[preview] ✗ dist/ غير موجود — شغّل npm run build أولاً");
    process.exit(1);
  });

  // "/index.html" نفسه يُخدم على "/" أيضاً
  const home = index.get("/index.html");
  if (home) index.set("/", home);

  return { index, files };
}

/** هل يطابق النمط المسار؟ (يدعم * و/*.ext كما في Cloudflare Pages) */
function patternMatches(pattern, pathname) {
  if (pattern === "/*") return true;
  if (pattern === pathname) return true;
  if (pattern.startsWith("/*.")) return pathname.endsWith(pattern.slice(1));
  if (pattern.endsWith("/*")) return pathname.startsWith(pattern.slice(0, -1));
  return false;
}

const rules = await loadHeaderRules();
const { index, files } = await buildIndex();
const notFoundFile = index.get("/404.html");

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

/** مفتاح البحث: مسار URL مُطبَّع فقط — لا يُستعمل كمسار ملفات. */
function lookupKey(rawPathname) {
  let pathname = rawPathname.split("?")[0].split("#")[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return null; // ترميز معطوب
  }
  if (!pathname.startsWith("/")) return null;
  // توحيد الشرائح: //a/./b → /a/b (بلا أي معنى للمسار على القرص)
  const segments = [];
  for (const segment of pathname.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") return null;
    segments.push(segment);
  }
  const normalized = "/" + segments.join("/");
  return normalized === "/" ? "/" : normalized.replace(/\/+$/, "");
}

const server = createServer(async (req, res) => {
  const key = lookupKey(req.url || "/");
  const file = key === null ? undefined : index.get(key);
  const headers = Object.fromEntries(headersFor(key ?? "/").map((h) => [h.name, h.value]));

  if (!file) {
    let body = Buffer.from("404");
    if (notFoundFile) body = await readFile(notFoundFile).catch(() => body);
    res.writeHead(404, { ...headers, "Content-Type": MIME[".html"] });
    res.end(req.method === "HEAD" ? undefined : body);
    return;
  }

  // فحسب احتياطي: الملف مسجَّل في الفهرس مسبقاً، ومع ذلك نتحقق أنه داخل dist/.
  if (file !== DIST && !file.startsWith(DIST + sep)) {
    res.writeHead(403, headers);
    res.end("403");
    return;
  }

  const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { ...headers, "Content-Type": type });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[preview] dist/ (${files} ملفاً) مع ترويسات الإنتاج على http://${HOST}:${PORT}`);
  const csp = headersFor("/").find((h) => h.name === "Content-Security-Policy");
  console.log(`[preview] ${csp ? csp.value : "لا CSP"}`);
});
