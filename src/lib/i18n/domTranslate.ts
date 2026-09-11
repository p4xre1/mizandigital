// src/lib/i18n/domTranslate.ts
//
// ─────────────────────────────────────────────────────────────────────────────
// ترجمة محتوى الصفحة في مكانها (بدل سكربت Google المتوقَّف)
// ─────────────────────────────────────────────────────────────────────────────
// نمرّ على عُقد النص داخل جذر المحتوى، نُخرج نصوصها للترجمة، ثم نكتب
// الترجمة مكانها. الأصول تُحفظ كي نستطيع الاستعادة فوراً دون إعادة تحميل.
//
// هذه الطبقة رقيقة عن قصد: بيئة الاختبار في المستودع node بلا jsdom، لذلك
// كل المنطق القابل للاختبار (تقطيع، سلسلة المزوّدين، تخزين مؤقت) موجود في
// translate.ts و shared/i18n/providers.js، وهنا يبقى التنقّل في DOM فقط.

/** وسوم لا يُترجم محتواها أبداً. */
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "CODE",
  "KBD",
  "SAMP",
  "VAR",
  "TIME",
  "SVG",
  "IFRAME",
  "CANVAS",
])

/** الأرقام والرموز وحدها لا تحتاج ترجمة. */
const TRANSLATABLE_RE = /[^\s\d\p{P}\p{S}]/u

/** نصوص الواجهة التي لا معنى لترجمتها داخل محتوى المقال. */
function isSkippableAncestor(node: Node): boolean {
  let current: Node | null = node
  while (current && current.nodeType !== Node.DOCUMENT_NODE) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element
      const tag = el.tagName
      if (SKIP_TAGS.has(tag)) return true
      if (el.hasAttribute("translate") && el.getAttribute("translate") === "no") return true
      if (el.classList.contains("notranslate")) return true
      if (el.hasAttribute("data-no-translate")) return true
    }
    current = current.parentNode
  }
  return false
}

/**
 * جمع عُقد النص القابلة للترجمة تحت جذر معيّن.
 * @returns عُقد مرتّبة بترتيب المستند
 */
export function collectTranslatableNodes(root: Element): Text[] {
  const out: Text[] = []
  if (typeof Node === "undefined" || typeof NodeFilter === "undefined") return out

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      const value = node.nodeValue || ""
      if (!value.trim()) return NodeFilter.FILTER_REJECT
      if (!TRANSLATABLE_RE.test(value)) return NodeFilter.FILTER_REJECT
      if (isSkippableAncestor(node)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let node = walker.nextNode()
  while (node) {
    out.push(node as Text)
    node = walker.nextNode()
  }
  return out
}

const originals = new WeakMap<Text, string>()
const translatedNodes: Text[] = []

/** كتابة الترجمات مكان النصوص، مع حفظ الأصول للاستعادة. */
export function applyTranslations(nodes: Text[], translations: string[]): void {
  nodes.forEach((node, index) => {
    const translated = translations[index]
    if (typeof translated !== "string" || !translated.trim()) return
    if (!originals.has(node)) originals.set(node, node.nodeValue || "")
    node.nodeValue = translated
    if (!translatedNodes.includes(node)) translatedNodes.push(node)
  })
}

/** إرجاع النص الأصلي لكل ما تُرجم. */
export function restoreOriginals(): void {
  for (const node of translatedNodes) {
    const original = originals.get(node)
    if (typeof original === "string") node.nodeValue = original
  }
  translatedNodes.length = 0
}

export function isTranslated(): boolean {
  return translatedNodes.length > 0
}

/**
 * ضبط الاتجاه واللغة على الجذر.
 *
 * الترجمة من العربية إلى لغة يسارية مع بقاء dir="rtl" تُنتج نصاً مختلط
 * الاتجاه شبه غير مقروء، لذا نقلب الاتجاه على جذر المحتوى وحده (لا على
 * <html> كله) حتى تبقى الترويسة والتذييل والقوائم كما هي.
 */
export function setDirection(root: HTMLElement, lang: string, rtl: boolean): void {
  root.setAttribute("dir", rtl ? "rtl" : "ltr")
  root.setAttribute("lang", lang)
}

/** استعادة اتجاه الجذر الأصلي. */
export function resetDirection(root: HTMLElement, dir: string | null, lang: string | null): void {
  if (dir) root.setAttribute("dir", dir)
  else root.removeAttribute("dir")
  if (lang) root.setAttribute("lang", lang)
  else root.removeAttribute("lang")
}
