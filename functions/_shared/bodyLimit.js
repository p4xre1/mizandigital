// functions/_shared/bodyLimit.js
//
// قراءة جسم الطلب بحد صارم للبايتات، قبل أي تحليل JSON.
// request.json() أو readJsonBody() من guard.js يقرآن الجسم كاملاً أولاً ثم يفحصان
// الحجم، فلا يحميان من طلب بلا Content-Length. هنا نقرأ الأجزاء (chunks) ونقطع
// عند تجاوز الحد، فلا تُخصَّص ذاكرة لجسم ضخم.

/**
 * @param {Request} request
 * @param {number} maxBytes
 * @returns {Promise<{ok: true, text: string} | {ok: false, status: number, error: string}>}
 */
export async function readBoundedText(request, maxBytes) {
  const declared = Number(request.headers.get("Content-Length") || 0)
  if (declared > maxBytes) return { ok: false, status: 413, error: "payload_too_large" }
  // كائن طلب بلا تدفّق (مثلاً محاكاة في الاختبارات): نقرأ عبر text() مع فحص البايتات.
  if (request.body === undefined && typeof request.text === "function") {
    let text
    try {
      text = await request.text()
    } catch {
      return { ok: false, status: 400, error: "unreadable_body" }
    }
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      return { ok: false, status: 413, error: "payload_too_large" }
    }
    return { ok: true, text }
  }
  if (!request.body) return { ok: true, text: "" }

  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => {})
        return { ok: false, status: 413, error: "payload_too_large" }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, status: 400, error: "unreadable_body" }
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
  } catch {
    return { ok: false, status: 400, error: "invalid_encoding" }
  }
}

/**
 * قراءة JSON بحد صارم. تُرجع الكائن المحلَّل أو خطأ جاهزاً للرد.
 * @param {Request} request
 * @param {number} maxBytes
 * @returns {Promise<{ok: true, data: unknown} | {ok: false, status: number, error: string}>}
 */
export async function readBoundedJson(request, maxBytes) {
  const body = await readBoundedText(request, maxBytes)
  if (!body.ok) return body
  try {
    return { ok: true, data: JSON.parse(body.text) }
  } catch {
    return { ok: false, status: 400, error: "invalid_json" }
  }
}
