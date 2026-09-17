/**
 * ترميز موحّد لمحتوى الصفحات القانونية.
 *
 * السبب: prerender.mjs سكربت Node عادي (بلا محمّل TS)، بينما الصفحات
 * مكتوبة بـ TSX. سابقاً كان لكل طرف نسخته من النص — فكان /privacy المنشور
 * يعرض فقرة عامة من 3 جمل بينما التطبيق يعرض السياسة الكاملة. هنا مصدر
 * واحد يستهلكه الطرفان، فيستحيل أن يختلفا.
 *
 * صيغة النص المضمّن (inline):
 *   **عريض**      → <strong>
 *   `معرّف`       → <code dir="ltr">  (المعرّفات دائماً لاتينية)
 *   [نص](/مسار)   → <a href>
 */

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** يقسّم نصاً إلى مقاطع: text | strong | code | link */
export function tokenizeInline(text) {
  const out = [];
  let last = 0;
  for (const match of String(text).matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ type: "text", value: text.slice(last, index) });
    const raw = match[0];
    if (raw.startsWith("**")) {
      out.push({ type: "strong", value: raw.slice(2, -2) });
    } else if (raw.startsWith("`")) {
      out.push({ type: "code", value: raw.slice(1, -1) });
    } else {
      const parsed = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      out.push({ type: "link", value: parsed?.[1] ?? raw, href: parsed?.[2] ?? "#" });
    }
    last = index + raw.length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** نص مضمّن → HTML (يستهلكه prerender.mjs) */
export function inlineToHtml(text) {
  return tokenizeInline(text)
    .map((token) => {
      switch (token.type) {
        case "strong":
          return `<strong>${escapeHtml(token.value)}</strong>`;
        case "code":
          return `<code dir="ltr">${escapeHtml(token.value)}</code>`;
        case "link": {
          const dir = token.href.startsWith("mailto:") ? ' dir="ltr"' : "";
          return `<a href="${escapeHtml(token.href)}"${dir}>${escapeHtml(token.value)}</a>`;
        }
        default:
          return escapeHtml(token.value);
      }
    })
    .join("");
}

/**
 * كتلة → HTML.
 * أنواع الكتل:
 *   { kind: "para", text }
 *   { kind: "list", ordered?, items: string[] }
 *   { kind: "table", head: string[], rows: string[][], ltrColumns?: number[] }
 *   { kind: "group", title?, blocks: Block[] }
 *   { kind: "callout", tone, title?, blocks: Block[] }
 *   { kind: "note", text }   // سطر صغير بارز
 */
export function blockToHtml(block) {
  switch (block.kind) {
    case "para":
      return `<p>${inlineToHtml(block.text)}</p>`;

    case "note":
      return `<p class="legal-note">${inlineToHtml(block.text)}</p>`;

    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const items = block.items.map((item) => `<li>${inlineToHtml(item)}</li>`).join("\n");
      return `<${tag}>\n${items}\n</${tag}>`;
    }

    case "table": {
      const ltr = new Set(block.ltrColumns ?? []);
      const head = block.head.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
      const rows = block.rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell, i) => `<td${ltr.has(i) ? ' dir="ltr"' : ""}>${inlineToHtml(cell)}</td>`)
              .join("")}</tr>`
        )
        .join("\n");
      return `<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${rows}\n</tbody>\n</table>`;
    }

    case "group": {
      // عنوان فرعي + كتل (يُمثّل مجموعات h4 في صفحة الخصوصية)
      const title = block.title ? `<h3>${inlineToHtml(block.title)}</h3>` : "";
      const body = (block.blocks ?? []).map(blockToHtml).join("\n");
      return `<div class="legal-group">\n${title}\n${body}\n</div>`;
    }

    case "callout": {
      const title = block.title ? `<h3>${inlineToHtml(block.title)}</h3>` : "";
      const body = (block.blocks ?? []).map(blockToHtml).join("\n");
      return `<div class="legal-callout" data-tone="${escapeHtml(block.tone ?? "neutral")}">\n${title}\n${body}\n</div>`;
    }

    default:
      return "";
  }
}

export function blocksToHtml(blocks) {
  return (blocks ?? []).map(blockToHtml).join("\n");
}

/** قسم كامل → HTML (عنوان + كتل) */
export function sectionToHtml(section) {
  return `<section>\n<h2>${escapeHtml(section.title)}</h2>\n${blocksToHtml(section.blocks)}\n</section>`;
}

/** سياسة كاملة → HTML جاهز للحقن في <div id="root"> */
export function policyToHtml(policy) {
  const badge = policy.badge ? `<p class="legal-badge">${inlineToHtml(policy.badge)}</p>` : "";
  const updated = policy.updatedNote ? `<p class="legal-updated">${escapeHtml(policy.updatedNote)}</p>` : "";
  const sections = policy.sections.map(sectionToHtml).join("\n");
  return `<main dir="rtl" lang="ar-MA">\n<article>\n<h1>${escapeHtml(policy.heading)}</h1>\n${updated}\n${badge}\n${sections}\n</article>\n</main>`;
}
