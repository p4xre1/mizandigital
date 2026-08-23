// أنواع تصريحية لدعم واجهة WebMCP التصريحية (Declarative API) — معيار تجريبي
// من Chrome (146+) يسمح لوكلاء الذكاء الاصطناعي باكتشاف واستدعاء "أدوات"
// معرَّفة عبر سمات HTML على عناصر <form>. هذه السمات غير مدعومة بعد في كل
// المتصفحات، وتُتجاهل بأمان تام في المتصفحات التي لا تعرفها.
// المرجع: https://developer.chrome.com/docs/ai/webmcp/declarative-api

import "react"

declare module "react" {
  interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
    /** اسم الأداة كما يظهر لوكيل الذكاء الاصطناعي (WebMCP) */
    toolname?: string
    /** وصف نصي لما تقوم به الأداة، يستخدمه الوكيل لتحديد وقت استدعائها */
    tooldescription?: string
    /** يسمح للوكيل بإرسال النموذج تلقائياً دون تدخل يدوي (للأدوات منخفضة المخاطر فقط) */
    toolautosubmit?: boolean
  }

  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    /** وصف الحقل ضمن مخطط الأداة (input schema) */
    toolparamdescription?: string
  }

  interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
    toolparamdescription?: string
    toolparamtitle?: string
  }
}

// الواجهة البرمجية الإلزامية (Imperative API) لتسجيل أدوات WebMCP عبر JavaScript
interface WebMCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties?: Record<string, { type: string; description?: string; enum?: string[] }>
    required?: string[]
  }
  execute: (params: Record<string, unknown>) => unknown | Promise<unknown>
  annotations?: Record<string, string>
}

interface ModelContext {
  registerTool: (tool: WebMCPTool) => void
  unregisterTool: (name: string) => void
}

interface Navigator {
  modelContext?: ModelContext
}
