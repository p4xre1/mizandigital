// src/lib/i18n/translate.ts
//
// ─────────────────────────────────────────────────────────────────────────────
// طبقة الترجمة في المتصفح
// ─────────────────────────────────────────────────────────────────────────────
// المسار المفضَّل هو الوسيط على نفس النطاق (/api/translate). إن لم يكن
// متاحاً (استضافة ثابتة بلا Functions، أو تطوير محلي بـ vite preview) نسقط
// إلى نداء المزوّدين مباشرةً — وهذا ينجح فقط مع المزوّدين الذين يرسلون
// ترويسات CORS، ولهذا يبقى احتياطياً لا أساساً.
//
// كل شيء قابل للاختبار هنا دوال صافية؛ الجزء المتعلق بـ DOM معزول في
// دالتين واضحتين (collectTranslatableNodes / applyTranslations) لأن بيئة
// الاختبار في هذا المستودع هي node بلا jsdom.

import { getProviders, buildChunks, splitChunkResult, CHUNK_SEPARATOR } from "../../../shared/i18n/providers.js"
import { SOURCE_LANG } from "./languages"

export interface TranslationResult {
  results: string[]
  provider: string
  cached: boolean
  partial: boolean
}

export interface TranslateError extends Error {
  status?: number
}

/** بصمة قصيرة لنص — تُستعمل كمفتاح تخزين مؤقت محلي. */
export function hashText(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}

// ─────────────────────────────────────────────────────────────────────────────
// تخزين مؤقت محلي
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = "mizan.tr."
/** سقف عدد السجلات — فوقه نمسح الأقدم حتى لا نملأ localStorage. */
const MAX_CACHE_ENTRIES = 3000

interface CacheEntry {
  v: string
  t: number
}

function storage(): Storage | null {
  try {
    const s = window.localStorage
    s.getItem(STORAGE_PREFIX + "__probe")
    return s
  } catch {
    return null
  }
}

function entryKey(target: string, text: string): string {
  return `${STORAGE_PREFIX}${target}.${hashText(text)}`
}

export function cacheGet(target: string, text: string): string | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(entryKey(target, text))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    return typeof parsed?.v === "string" ? parsed.v : null
  } catch {
    return null
  }
}

export function cacheSet(target: string, source: string, translated: string): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(entryKey(target, source), JSON.stringify({ v: translated, t: Date.now() } satisfies CacheEntry))
    pruneCache(store)
  } catch {
    // امتلاء التخزين لا يجب أن يُفشل الترجمة
  }
}

function pruneCache(store: Storage): void {
  const keys: string[] = []
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i)
    if (key && key.startsWith(STORAGE_PREFIX) && key !== STORAGE_PREFIX + "__probe") keys.push(key)
  }
  if (keys.length <= MAX_CACHE_ENTRIES) return
  const timed = keys
    .map((key) => {
      let t = 0
      try {
        t = (JSON.parse(store.getItem(key) || "{}") as CacheEntry).t || 0
      } catch {
        t = 0
      }
      return { key, t }
    })
    .sort((a, b) => a.t - b.t)
  for (const { key } of timed.slice(0, timed.length - MAX_CACHE_ENTRIES)) store.removeItem(key)
}

export function clearTranslationCache(): void {
  const store = storage()
  if (!store) return
  const keys: string[] = []
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key)
  }
  keys.forEach((k) => store.removeItem(k))
}

// ─────────────────────────────────────────────────────────────────────────────
// النقل
// ─────────────────────────────────────────────────────────────────────────────

async function viaProxy(texts: string[], target: string, source: string): Promise<TranslationResult> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, target, source }),
  })
  if (!response.ok) {
    const err = new Error(`فشل الوسيط (${response.status})`) as TranslateError
    err.status = response.status
    throw err
  }
  const data = (await response.json()) as { results: string[]; provider: string; partial?: boolean }
  return { results: data.results, provider: data.provider, cached: false, partial: Boolean(data.partial) }
}

/**
 * احتياطي: نداء المزوّدين من المتصفح مباشرةً.
 * يعمل فقط مع المزوّدين الذين يسمحون بـ CORS.
 */
async function direct(texts: string[], target: string, source: string): Promise<TranslationResult> {
  const providers = getProviders({})
  const results: (string | null)[] = new Array(texts.length).fill(null)
  let usedProvider = ""

  // نعيد ترتيب النصوص حسب موقعها الأصلي لأن الدفعات تُبنى على النصوص
  const indexable = texts.map((text, index) => ({ text, index })).filter((x) => x.text.trim())
  const chunks = buildChunks(indexable.map((x) => x.text))

  let cursor = 0
  for (const chunk of chunks) {
    const owners = indexable.slice(cursor, cursor + chunk.length)
    cursor += chunk.length
    for (const provider of providers) {
      let translated: string | null = null
      try {
        const built = provider.buildRequest(chunk.join(CHUNK_SEPARATOR), source, target)
        const response = await fetch(built.url, built.init ? (built.init as RequestInit) : undefined)
        if (!response.ok) continue
        const data = await response.json()
        const parsed = provider.parseResponse(data)
        if (!parsed) continue
        translated = parsed
      } catch {
        continue
      }
      const parts = splitChunkResult(chunk, translated as string)
      if (parts) {
        usedProvider = usedProvider || provider.id
        parts.forEach((part, i) => {
          const owner = owners[i]
          if (owner) results[owner.index] = part
        })
        break
      }
    }
  }

  return {
    results: results.map((r, i) => r ?? texts[i]),
    provider: usedProvider || "none",
    cached: false,
    partial: results.some((r) => r === null),
  }
}

/**
 * ترجمة مجموعة نصوص، مع استعمال التخزين المؤقت المحلي أولاً.
 * النصوص الفارغة تُعاد كما هي دون استهلاك حصة.
 */
export async function translateTexts(
  texts: string[],
  target: string,
  source: string = SOURCE_LANG
): Promise<TranslationResult> {
  if (!texts.length) return { results: [], provider: "none", cached: true, partial: false }
  if (target === source) return { results: [...texts], provider: "original", cached: true, partial: false }

  // null = يحتاج ترجمة؛ أي قيمة أخرى (حتى فارغة) تُعاد كما هي
  const results: (string | null)[] = texts.map((text) => {
    if (!text.trim()) return text
    return cacheGet(target, text)
  })

  const todo = texts.filter((_, i) => results[i] === null)
  if (todo.length === 0) {
    return { results: results as string[], provider: "cache", cached: true, partial: false }
  }

  let outcome: TranslationResult
  try {
    outcome = await viaProxy(todo, target, source)
  } catch {
    outcome = await direct(todo, target, source)
  }

  let cursor = 0
  const finalResults = results.map((value) => {
    if (value !== null) return value
    const translated = outcome.results[cursor]
    cursor += 1
    const original = todo[cursor - 1]
    if (typeof translated === "string" && translated.trim()) {
      cacheSet(target, original, translated)
      return translated
    }
    return original
  })

  return {
    results: finalResults,
    provider: outcome.provider,
    cached: false,
    partial: outcome.partial,
  }
}
