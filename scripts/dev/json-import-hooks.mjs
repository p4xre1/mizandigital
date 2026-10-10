// scripts/dev/json-import-hooks.mjs
//
// خطاف محمِّل Node (وضع تطوير فقط): يسمح باستيراد ملفات JSON بدون سمة
// `with { type: "json" }` — تماماً كما تفعل بيئة Cloudflare (workerd) وحزمة
// المتصفح عبر Vite. الكود المشترك بين الثلاثة (مجلد shared/) يستورد ملفات
// البيانات هكذا، ولا نضيف السمة إليه حتى لا نخاطر بحزمة الإنتاج.
//
// يُسجَّل من scripts/dev/api-bridge.mjs ويؤثر على الاستيرادات الأصلية فقط.

import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

/** @param {string} url @param {object} context @param {Function} nextLoad */
export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".json")) {
    try {
      const text = await readFile(fileURLToPath(url), "utf-8")
      // نمرر النص عبر JSON.parse بدل تضمينه حرفياً، فيبقى أي محتوى آمناً.
      return {
        format: "module",
        source: `export default JSON.parse(${JSON.stringify(text)});`,
        shortCircuit: true,
      }
    } catch {
      // ملف غير موجود أو غير مقروء: نترك الخطأ القياسي يظهر.
    }
  }
  return nextLoad(url, context)
}
