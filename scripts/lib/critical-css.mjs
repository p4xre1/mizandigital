/**
 * critical-css.mjs — يبني «الكتلة الحرجة» (critical CSS) التي تُضمَّن في <head>
 * للمستندات المُهيّأة مسبقاً (prerender) لحماية الهيكل الأولي (الرأس + الواجهة)
 * من إعادة التدفّق عند وصول ملف الأنماط الكامل.
 *
 * لماذا: النمط الكامل يُحمّل غير حاجب للرسم (preload + قَلب بسكربت السمة)، فيرسم
 * المتصفح HTML بلا أنماط أولاً ثم يعيد تنسيقه لحظة وصول الملف — وهذا «انزياح تخطيط»
 * حقيقي (رصده تقرير Agentic Browsing: CLS 0.186). الكتلة الحرجة تُطبَّق من المستند
 * نفسه (بلا طلب إضافي وبلا حجب رسم) فيبقى الموضع/الأبعاد محسومين من أول إطار،
 * وعند وصول النمط الكامل تُطبَّق القيم نفسها فلا انزياح.
 *
 * القواعد المُلزمة:
 *  • لا كتلة يدوية: كل قاعدة تُقتطع من ملف الأنماط المبنى نفسه ⇒ لا انحراف عن
 *    Tailwind/globals عند أي تعديل لاحق.
 *  • الخصائص الهندسية فقط (layout/قياسات/خطوط/تحويلات) — الألوان والظلال والانتقالات
 *    لا تُحرّك أي عنصر، فتضمينها يضخّم المستند بلا فائدة (text/HTML ratio).
 *  • تُحفظ سياق @media/@supports كما هو، وإلا صارت قواعد md:/lg: تسري على الجوال.
 *  • الترتيب الأصلي محفوظ (فما يغلبه لاحقاً داخل الملف يغلب هنا).
 *  • حجم الكتلة محدود (MAX_CRITICAL_BYTES) والتجاوز يُسقط البناء بدل أن يمرّ صامتاً.
 */

/** حد أقصى مقصود لبايتات الكتلة الحرجة (المستند ≈ 41KB، والنسبة النصية تُحرس). */
export const MAX_CRITICAL_BYTES = 8192;

export const CRITICAL_MARKER = "data-mizan-critical-css";

/** بداية الهيكل الأولي في المستندات المُهيّأة مسبقاً. */
const SHELL_START = '<header class="sticky';

/* ── الخصائص التي تُغيّر الموضع/الأبعاد (ما عداها لا يسبب انزياحاً) ───────── */
const GEOMETRY_EXACT = new Set([
  "display", "box-sizing", "position", "top", "right", "bottom", "left",
  "z-index", "float", "clear", "order", "gap", "row-gap", "column-gap",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "flex", "flex-grow", "flex-shrink", "flex-basis", "flex-direction", "flex-wrap", "flex-flow",
  "grid", "grid-template", "grid-template-columns", "grid-template-rows", "grid-template-areas",
  "grid-auto-rows", "grid-auto-columns", "grid-auto-flow", "grid-column", "grid-row", "grid-area",
  "align-items", "align-content", "align-self", "justify-content", "justify-items", "justify-self",
  "place-items", "place-content", "place-self",
  "font-size", "font-family", "font-weight", "font-style", "font-variant", "font-variant-numeric",
  "font-feature-settings", "font-variation-settings", "font-stretch",
  "line-height", "letter-spacing", "word-spacing", "text-align", "text-align-last",
  "text-transform", "text-indent", "text-wrap", "white-space", "word-break", "overflow-wrap",
  "hyphens", "direction", "writing-mode", "vertical-align",
  "transform", "translate", "rotate", "scale", "transform-origin",
  "aspect-ratio", "contain", "contain-intrinsic-size", "content-visibility",
  "object-fit", "object-position", "list-style", "list-style-type", "list-style-position",
  "overflow", "overflow-x", "overflow-y", "visibility",
  "border", "border-width", "border-style", "border-top", "border-right", "border-bottom", "border-left",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
  "border-block", "border-block-width", "border-block-style", "border-inline", "border-inline-width",
  "border-inline-style",
  "inline-size", "block-size", "min-inline-size", "max-inline-size", "min-block-size", "max-block-size",
]);

const GEOMETRY_PREFIX = /^(margin|padding|inset)(-|$)/;

/** هل تُحرّك هذه الخاصية عنصراً (أو تغيّر أبعاده)؟ */
export function isGeometryProp(prop) {
  const name = prop.replace(/^-(webkit|moz|ms|o)-/, "").trim().toLowerCase();
  if (!name || name.startsWith("--")) return false;
  return GEOMETRY_EXACT.has(name) || GEOMETRY_PREFIX.test(name);
}

/* ── قارئ CSS مبسّط: يستخرج القواعد الورقية مع سياق @media/@supports/@layer ── */
const NON_RULE_AT = /^@(font-face|keyframes|-webkit-keyframes|property|counter-style|page|charset|import)\b/i;

function skipBlock(css, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === "\\") i += 1;
        i += 1;
      }
    } else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return css.length;
}

/**
 * @param {string} css
 * @returns {{contexts: string[], selector: string, body: string, index: number}[]}
 */
export function parseCssRules(css) {
  const rules = [];
  const stack = [];
  rules.properties = new Map();
  let i = 0;
  while (i < css.length) {
    // تجاهل المسافات والتعليقات
    if (/\s/.test(css[i])) { i += 1; continue; }
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    if (css[i] === "}") { stack.pop(); i += 1; continue; }
    // اقرأ المقدّمة حتى '{' أو ';' على المستوى العلوي
    let j = i;
    let braceIdx = -1;
    let semiIdx = -1;
    while (j < css.length) {
      const ch = css[j];
      if (ch === '"' || ch === "'") {
        const quote = ch;
        j += 1;
        while (j < css.length && css[j] !== quote) {
          if (css[j] === "\\") j += 1;
          j += 1;
        }
      } else if (ch === "{") { braceIdx = j; break; }
      else if (ch === ";") { semiIdx = j; break; }
      else if (ch === "}") { braceIdx = -1; break; }
      j += 1;
    }
    if (braceIdx === -1) {
      // تعليمة بلا كتلة (@layer …, @charset …) أو نهاية غير متوقعة
      i = semiIdx === -1 ? i + 1 : semiIdx + 1;
      continue;
    }
    const prelude = css.slice(i, braceIdx).trim();
    const end = skipBlock(css, braceIdx);
    if (prelude.startsWith("@")) {
      const propMatch = /^@property\s+(--[\w-]+)\s*$/i.exec(prelude);
      if (propMatch) {
        // تسجيلات @property تلزم لأي var() في القواعد المحفوظة (translate/rotate/scale…)
        rules.properties.set(propMatch[1], css.slice(i, end));
        i = end;
        continue;
      }
      if (NON_RULE_AT.test(prelude)) { i = end; continue; }
      stack.push(prelude);
      i = braceIdx + 1;
      continue;
    }
    rules.push({
      contexts: [...stack],
      selector: prelude,
      body: css.slice(braceIdx + 1, end - 1),
      index: i,
    });
    i = end;
  }
  return rules;
}

/** تقسيم كتلة التعريفات إلى أزواج (خاصية، قيمة) مع تجاهل ما لا يهم. */
export function splitDeclarations(body) {
  const out = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    if (ch === ";" && depth === 0) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const idx = decl.indexOf(":");
      if (idx === -1) return null;
      return { prop: decl.slice(0, idx).trim(), value: decl.slice(idx + 1).trim() };
    })
    .filter((d) => d && d.prop && d.value && !d.prop.startsWith("/*"));
}

/** تمثيل الفئة كما تُكتب في المُحدِّد (CSS.escape المبسّط كما يستعمله Tailwind). */
function escapedClass(token) {
  let out = "";
  for (const ch of token) out += /[A-Za-z0-9_-]/.test(ch) ? ch : `\\${ch}`;
  return out;
}

/** حالات تفاعل لا تُنتج انزياحاً في أول رسم (تُطبَّق بعد hover/focus فقط). */
const INTERACTION_STATE = /:(hover|focus|focus-visible|focus-within|active|target|visited|checked|disabled|placeholder-shown|autofill|open|user-invalid|user-valid)\b|:has\(|\[aria-(expanded|selected|current|pressed|hidden)=/i;

/** أسماء العناصر التي تظهر فعلاً في الشريحة (لتصفية قواعد العناصر الأساسية). */
function sliceElements(slice) {
  const names = new Set();
  for (const m of slice.matchAll(/<([a-z][a-z0-9-]*)[\s>/]/gi)) names.add(m[1].toLowerCase());
  return names;
}

/** العناصر/الزخارف التي تُبقيها القواعد الأساسية دائماً (سلف مشترك أو شبه عنصر عام). */
const ALWAYS_BASE = new Set(["*", "html", "body", "div", "span", "a", "img", "svg", "path"]);
const DROP_PSEUDO = /::(backdrop|file-selector-button|marker|placeholder|selection|cue)/i;

/**
 * الشريحة المرئية أولاً: الرأس + الكتلة الحاضنة لأول عنوان (h1 ثم h2).
 * التعريف العام: «أقرب سلف قِسمي» (section/article/main/aside) للعنوان الأول،
 * فيغطي الرئيسية (section الواجهة) وصفحات القاموس (article) وكل صفحة لها عنوان
 * مُهيّأ مسبقاً. المستندات بلا عنوان أو بلا رأس تُعيد null (لا شيء نُثبّته).
 */
const SECTIONING = new Set(["section", "article", "main", "aside"]);
const SLICE_CAP = 24000;

export function shellSlice(html) {
  const start = html.indexOf(SHELL_START);
  if (start === -1) return null;
  const headerEnd = html.indexOf("</header>", start);
  if (headerEnd === -1) return null;
  const bodyStart = headerEnd + "</header>".length;

  let anchor = html.indexOf("<h1", bodyStart);
  if (anchor === -1) anchor = html.indexOf("<h2", bodyStart);
  if (anchor === -1) return html.slice(start, bodyStart);

  // مكدّس العناصر المفتوحة بين نهاية الرأس والعنوان، لاختيار «أقرب سلف قِسمي».
  const open = [];
  const tagRe = /<(\/)?([a-z][a-z0-9-]*)\b[^>]*>/gi;
  tagRe.lastIndex = bodyStart;
  let m;
  while ((m = tagRe.exec(html)) && m.index < anchor) {
    const closing = m[1] === "/";
    const name = m[2].toLowerCase();
    if (closing) {
      const idx = open.lastIndexOf(name);
      if (idx !== -1) open.splice(idx, 1);
    } else if (!/\/>$/.test(m[0])) {
      open.push(name);
    }
  }
  let owner = -1;
  for (let i = open.length - 1; i >= 0; i -= 1) {
    if (SECTIONING.has(open[i])) {
      owner = i;
      break;
    }
  }
  if (owner === -1) return html.slice(start, Math.min(bodyStart + 2000, html.length));

  // امداد حتى إغلاق ذلك العنصر (بعمق مطابق).
  const ownerName = open[owner];
  const openRe = new RegExp(`<${ownerName}\\b[^>]*>`, "gi");
  const closeRe = new RegExp(`</${ownerName}>`, "gi");
  const anchorIdx = html.indexOf(`<${ownerName}`, bodyStart);
  let depth = 0;
  let cursor = anchorIdx;
  let end = html.length;
  while (cursor < html.length) {
    openRe.lastIndex = cursor;
    closeRe.lastIndex = cursor;
    const nextOpen = openRe.exec(html);
    const nextClose = closeRe.exec(html);
    if (!nextClose) break;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      cursor = nextOpen.index + nextOpen[0].length;
    } else {
      depth -= 1;
      cursor = nextClose.index + nextClose[0].length;
      if (depth === 0) {
        end = cursor;
        break;
      }
    }
  }

  let slice = html.slice(start, end);
  if (slice.length > SLICE_CAP) {
    // اقتطاع نظيف: نقف عند آخر وسم مكتمل قبل السقف (الأصناف فقط تهمّنا)
    const cut = slice.lastIndexOf(">", SLICE_CAP);
    slice = slice.slice(0, cut === -1 ? SLICE_CAP : cut + 1);
  }
  return slice;
}

/** كل أصناف (classes) الشريحة + أصناف <body>. */
function shellClasses(slice, html) {
  const tokens = new Set();
  for (const m of slice.matchAll(/class="([^"]*)"/g)) {
    for (const token of m[1].split(/\s+/)) if (token) tokens.add(token);
  }
  const bodyTag = /<body([^>]*)>/.exec(html);
  if (bodyTag) {
    for (const m of bodyTag[1].matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) if (token) tokens.add(token);
    }
  }
  return tokens;
}

/**
 * يبني نص الكتلة الحرجة.
 * @param {{html: string, cssText: string}} input
 * @returns {{css: string, bytes: number, rules: number, classes: number}}
 */
export function buildCriticalCss({ html, cssText }) {
  const slice = shellSlice(html);
  if (!slice) return { css: "", bytes: 0, rules: 0, classes: 0 };
  const classes = shellClasses(slice, html);
  const escaped = [...classes].map(escapedClass);
  const elements = sliceElements(slice);

  const rules = parseCssRules(cssText);
  /** قواعد العناصر: تُبقى فقط إن كان عنصرها موجوداً في الشريحة فعلاً. */
  const baseApplies = (selector) =>
    selector.split(",").some((part) => {
      const sel = part.trim();
      if (DROP_PSEUDO.test(sel)) return false;
      if (/^\*(::|:|$)/.test(sel) || /^::?(before|after)$/i.test(sel)) return true;
      if (/^:(root|host)/i.test(sel)) return true;
      const tag = /^([a-z][a-z0-9-]*)/i.exec(sel);
      if (!tag) return false;
      const name = tag[1].toLowerCase();
      return ALWAYS_BASE.has(name) || elements.has(name);
    });

  const kept = [];
  const plainProps = new Set();
  const isSupports = (rule) => (rule.contexts ?? []).some((c) => /^@supports\b/i.test(c));

  for (const rule of rules) {
    if (INTERACTION_STATE.test(rule.selector)) continue;
    const isBaseline = !/[.#]/.test(rule.selector);
    let matches;
    if (isBaseline) matches = baseApplies(rule.selector);
    else matches = escaped.some((cls) => rule.selector.includes(`.${cls}`));
    // #root مستثنى صراحةً: لا أنماط هندسية عليه
    if (!matches) continue;
    const decls = splitDeclarations(rule.body).filter((d) => isGeometryProp(d.prop));
    if (!decls.length) continue;
    if (!isSupports(rule)) for (const d of decls) plainProps.add(`${rule.selector}|${d.prop}`);
    kept.push({ ...rule, decls });
  }

  // احتياطات @supports مكرّرة: إن كانت القاعدة نفسها (مُحدِّد + خاصية) موجودة خارجها فحذفها آمن.
  for (const rule of kept) {
    if (!isSupports(rule)) continue;
    rule.decls = rule.decls.filter((d) => !plainProps.has(`${rule.selector}|${d.prop}`));
  }
  const finalKept = kept.filter((r) => r.decls.length);

  // متغيّرات :root المطلوبة فعلاً (--spacing مثلاً) + ما تشير إليه من متغيّرات
  const needed = new Set();
  const collectVars = (value) => {
    for (const m of value.matchAll(/var\(\s*(--[\w-]+)/g)) needed.add(m[1]);
  };
  for (const rule of finalKept) for (const d of rule.decls) collectVars(d.value);

  const definitions = new Map();
  for (const rule of rules) {
    if (!/^:root(\s*,\s*:host)?$/.test(rule.selector.split(",").map((s) => s.trim()).join(","))) {
      if (!rule.selector.split(",").some((s) => s.trim() === ":root")) continue;
    }
    for (const d of splitDeclarations(rule.body)) {
      if (d.prop.startsWith("--")) definitions.set(d.prop, d.value);
    }
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const name of [...needed]) {
      const value = definitions.get(name);
      if (!value) continue;
      for (const m of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
        if (!needed.has(m[1])) { needed.add(m[1]); grew = true; }
      }
    }
  }
  const rootVars = [...needed]
    .map((name) => (definitions.has(name) ? `${name}:${definitions.get(name)}` : null))
    .filter(Boolean);
  const rootBlock = rootVars.length ? `:root{${rootVars.join(";")}}` : "";
  const propertyBlocks = [...needed]
    .map((name) => rules.properties.get(name))
    .filter(Boolean)
    .join("");

  // الإخراج: كل القواعد بترتيبها الأصلي، مع دمج ما يتشارك سياق @media نفسه
  // لتقليل تكرار المقدّمة، وإسقاط @media print (لا رسم ولا انزياح فيه).
  const ordered = [...finalKept].sort((a, b) => a.index - b.index);
  const chunks = [];
  let pending = null;
  const flush = () => {
    if (!pending) return;
    chunks.push({ index: pending.index, text: wrap(pending.contexts, pending.rules.join("")) });
    pending = null;
  };
  for (const rule of ordered) {
    const contexts = (rule.contexts ?? []).filter((c) => !/^@layer\b/i.test(c));
    if (contexts.some((c) => /^@media\s+print\b/i.test(c))) continue;
    const body = `${rule.selector}{${rule.decls.map((d) => `${d.prop}:${d.value}`).join(";")}}`;
    const sameContext =
      pending &&
      pending.contexts.length === contexts.length &&
      pending.contexts.every((c, i) => c === contexts[i]);
    if (sameContext) pending.rules.push(body);
    else {
      flush();
      pending = { index: rule.index, contexts, rules: [body] };
    }
  }
  flush();

  const chunksOut = [];
  if (rootBlock) chunksOut.push({ index: -1, text: rootBlock });
  if (propertyBlocks) chunksOut.push({ index: -1, text: propertyBlocks });
  for (const c of chunks) chunksOut.push(c);
  chunksOut.sort((a, b) => a.index - b.index);
  const css = chunksOut.map((c) => c.text).join("");
  return { css, bytes: Buffer.byteLength(css, "utf8"), rules: finalKept.length, classes: classes.size };
}

function wrap(contexts, rule) {
  let out = rule;
  for (let i = contexts.length - 1; i >= 0; i -= 1) out = `${contexts[i]}{${out}}`;
  return out;
}

/** وسم <style> جاهز للإدراج (يُدرج قبل رابط preload للنمط). */
export function criticalStyleTag(css) {
  return `<style ${CRITICAL_MARKER}>${css}</style>`;
}

/**
 * بايتات النص المرئي في مستند (نفس حساب text/HTML ratio المستعمل في التدقيق):
 * تُحذف كتل script/style ثم الوسوم، ويُقلَّص الفراغ.
 */
export function htmlTextBytes(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return Buffer.byteLength(text, "utf8");
}
