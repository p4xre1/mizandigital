// shared/i18n/providers.js
//
// ─────────────────────────────────────────────────────────────────────────────
// محرّك الترجمة: سلسلة المزوّدين + تقطيع النص
// ─────────────────────────────────────────────────────────────────────────────
// ملف JS عادي (ليس TypeScript) حتى يُستورد من ثلاثة أماكن دون تكرار:
//   1. functions/api/translate.js  — وسيط Cloudflare (يُشغَّل على الحافة)
//   2. src/lib/i18n/translate.ts   — المتصفح (عند التعذّر عبر الوسيط)
//   3. tests/translate.test.ts     — الاختبارات
//
// لماذا وسيط على نفس النطاق أصلاً؟
//   لأن نداء المزوّدين من المتصفح مباشرةً يصطدم بـ CORS (بعضهم لا يرسل
//   Access-Control-Allow-Origin) وبحدود المعدل لكل IP. الوسيط يحلّ الاثنين
//   ويضيف تخزيناً مؤقتاً عبر Cache API. الاتصال المباشر يبقى احتياطياً.
//
// ⚠️ حدود صادقة:
//   • هذه مزوّدة ترجمة آلية مجانية وبلا مفتاح. حدودها تتغير دون إشعار،
//     ولهذا السلسلة كاملة: إن سقط مزوّد ينتقل الطلب للتالي.
//   • MyMemory يمنح ~5000 حرف/يوم بلا مفتاح، ثم يرفع رسالة تحذير بدلاً
//     من الترجمة — كاشف هذا في parseMymemory.
//   • الترجمة الآلية للنصوص القانونية تفقد دقة المصطلح والإحالة. الأداة
//     في الواجهة معلَّمة على أنها ترجمة آلية غير رسمية.

/** الحد الأقصى لأحرف النص في الطلب الواحد.
 *  نداءات Google وMyMemory وLingva هنا GET: النص العربي يتمدد ~9× بعد
 *  encodeURIComponent (%D8%A7)، وحدّ سطر الطلب في Cloudflare هو 32KB.
 *  1200 حرف ⇒ ~11KB — هامش آمن. */
export const MAX_CHUNK_CHARS = 1200

/** الفاصل الذي نضمّ به عدة نصوص في طلب واحد. سطر جديد عادي لأن
 *  المزوّدين الثلاثة يحافظون على الأسطر الجديدة. */
export const CHUNK_SEPARATOR = "\n"

/**
 * ضمّ النصوص في دفعات لا تتجاوز MAX_CHUNK_CHARS.
 * النص الواحد الأطول من الحد يُجزَّأ على حدود الجمل/المسافات بدل قطعه
 * في منتصف كلمة (قطع الكلمة يُنتج ترجمة مشوّهة).
 *
 * @param {string[]} texts
 * @param {number} [maxChars]
 * @returns {string[][]} كل دفعة = مصفوفة النصوص التي ستُرسل معاً
 */
export function buildChunks(texts, maxChars = MAX_CHUNK_CHARS) {
  const chunks = []
  let current = []
  let size = 0

  for (const raw of texts) {
    const text = typeof raw === "string" ? raw : ""
    if (!text.trim()) continue

    for (const piece of splitLongText(text, maxChars)) {
      const len = piece.length + CHUNK_SEPARATOR.length
      if (current.length > 0 && size + len > maxChars) {
        chunks.push(current)
        current = []
        size = 0
      }
      current.push(piece)
      size += len
    }
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

/**
 * تجزئة نص طويل على حدود الجمل ثم المسافات، بلا قطع في منتصف كلمة.
 * @param {string} text
 * @param {number} maxChars
 * @returns {string[]}
 */
export function splitLongText(text, maxChars = MAX_CHUNK_CHARS) {
  if (text.length <= maxChars) return [text]
  const out = []
  // تقسيم أولي على نهايات الجمل العربية واللاتينية
  const sentences = text.match(/[^.!؟?\n]+[.!؟?\n]*/g) || [text]
  let buffer = ""
  for (const sentence of sentences) {
    if (buffer && buffer.length + sentence.length > maxChars) {
      out.push(buffer.trim())
      buffer = ""
    }
    if (sentence.length > maxChars) {
      // جملة أطول من الحد وحدها → نقطعها على المسافات
      if (buffer.trim()) out.push(buffer.trim())
      buffer = ""
      let word = ""
      for (const w of sentence.split(/(\s+)/)) {
        if (word.length + w.length > maxChars) {
          if (word.trim()) out.push(word.trim())
          word = ""
        }
        word += w
      }
      if (word.trim()) buffer = word
    } else {
      buffer += sentence
    }
  }
  if (buffer.trim()) out.push(buffer.trim())

  // حماية أخيرة: رمز واحد متّصل أطول من الحد (نص بلا مسافات ولا نقط) لا
  // يمكن تقسيمه لغوياً، فنفرض قطعاً صريحاً. بدونه يخرج طلب يتجاوز حدّ
  // طول سطر الطلب عند Cloudflare فيفشل كله.
  const guarded = []
  for (const piece of out) {
    if (piece.length <= maxChars) {
      guarded.push(piece)
    } else {
      for (let i = 0; i < piece.length; i += maxChars) {
        guarded.push(piece.slice(i, i + maxChars))
      }
    }
  }
  return guarded
}

/**
 * تقسيم نتيجة ترجمة دفعة والعودة إلى النصوص الأصلية.
 * إن لم يتطابق عدد الأجزاء مع عدد المدخلات (بعض المزوّدين يدمج الأسطر
 * الفارغة) نُعيد null كي يُعاد الطلب نصّاً نصّاً — أفضل من إرجاع ترجمة
 * مُزاحة على غير نصها.
 *
 * @param {string[]} inputs
 * @param {string} translated
 * @returns {string[] | null}
 */
export function splitChunkResult(inputs, translated) {
  if (typeof translated !== "string") return null
  const parts = translated.split(CHUNK_SEPARATOR)
  if (parts.length !== inputs.length) return null
  const out = parts.map((p, i) => (p.trim() ? p : inputs[i]))
  return out
}

/** مفتاح تخزين مؤقت ثابت. @returns {string} */
export function cacheKey(provider, source, target, text) {
  return `${provider}|${source || "auto"}|${target}|${text}`
}

/** MyMemory لا يقبل "auto" كمصدر. */
export function resolveSource(source) {
  return source && source !== "auto" ? source : "ar"
}

// ─────────────────────────────────────────────────────────────────────────────
// المزوّدون — بالترتيب: الأول هو المُفضَّل
// ─────────────────────────────────────────────────────────────────────────────

/** Google gtx: [[["مترجم","أصل",null,null,10]],null,"ar",...] */
function parseGoogleGtx(data) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null
  let out = ""
  for (const segment of data[0]) {
    if (Array.isArray(segment) && typeof segment[0] === "string") out += segment[0]
  }
  return out.trim() ? out : null
}

/** MyMemory: {responseData:{translatedText}, responseStatus:200|{"200"}} */
function parseMymemory(data) {
  const status = data && data.responseStatus
  const normalized = typeof status === "string" ? parseInt(status, 10) : status
  if (normalized !== 200) return null
  const text = data && data.responseData && data.responseData.translatedText
  if (typeof text !== "string" || !text.trim()) return null
  // عند تجاوز الحصة يُرجع رسالة تحذير بحروف كبيرة بدل الترجمة
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID (TRANSLATION )?LANGUAGE/i.test(text)) return null
  return text
}

/** Lingva: {translation:"..."} */
function parseLingva(data) {
  const text = data && data.translation
  if (typeof text !== "string" || !text.trim()) return null
  if (data && data.error) return null
  return text
}

/**
 * طلب جاهز لـ fetch. `init` اختياري (GET افتراضياً).
 * النوع موحَّد عمداً: بدونه يستنتج TypeScript اتحاداً من الأشكال المختلفة
 * فيعتبر `init` غير موجود في فروع GET.
 * @typedef {{url: string, init?: RequestInit}} ProviderRequest
 */

/**
 * تعريفات المزوّدين. `buildRequest` يُرجع طلباً جاهزاً لـ fetch.
 * @param {{lingvaInstances?: string[], libreUrl?: string, libreKey?: string}} [config]
 */
export function getProviders(config = {}) {
  const lingvaInstances =
    config.lingvaInstances && config.lingvaInstances.length > 0
      ? config.lingvaInstances
      : ["https://lingva.ml", "https://lingva.thedaviddelta.com", "https://translate.plausibility.cloud"]

  const providers = [
    {
      id: "google-gtx",
      label: "Google Translate",
      /** @returns {ProviderRequest} */
      buildRequest(text, source, target) {
        const params = new URLSearchParams({
          client: "gtx",
          sl: source || "auto",
          tl: target,
          dt: "t",
          q: text,
        })
        return { url: `https://translate.googleapis.com/translate_a/single?${params.toString()}` }
      },
      parseResponse: parseGoogleGtx,
    },
    {
      id: "mymemory",
      label: "MyMemory",
      /** @returns {ProviderRequest} */
      buildRequest(text, source, target) {
        const params = new URLSearchParams({
          q: text,
          langpair: `${resolveSource(source)}|${target}`,
        })
        return { url: `https://api.mymemory.translated.net/get?${params.toString()}` }
      },
      parseResponse: parseMymemory,
    },
  ]

  // Lingva: عدة نسخ عامة — نجرّبها بالترتيب حتى تستجيب واحدة
  lingvaInstances.forEach((base, index) => {
    const root = String(base).replace(/\/+$/, "")
    providers.push({
      id: index === 0 ? "lingva" : `lingva-${index}`,
      label: `Lingva (${new URL(root).hostname})`,
      /** @returns {ProviderRequest} */
      buildRequest(text, source, target) {
        const encoded = encodeURIComponent(text).replace(/%20/g, "+")
        return {
          url: `${root}/api/v1/${resolveSource(source)}/${target}/${encoded}`,
        }
      },
      parseResponse: parseLingva,
    })
  })

  // LibreTranslate: اختياري — يُفعَّل فقط عند ضبط LIBRETRANSLATE_URL
  if (config.libreUrl) {
    providers.push({
      id: "libretranslate",
      label: "LibreTranslate (مستضاف ذاتياً)",
      /** @returns {ProviderRequest} */
      buildRequest(text, source, target) {
        return {
          url: String(config.libreUrl).replace(/\/+$/, ""),
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              q: text,
              source: resolveSource(source),
              target,
              format: "text",
              ...(config.libreKey ? { api_key: config.libreKey } : {}),
            }),
          },
        }
      },
      parseResponse: (data) => {
        const text = data && data.translatedText
        return typeof text === "string" && text.trim() ? text : null
      },
    })
  }

  return providers
}
