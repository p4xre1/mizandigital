import { useEffect } from "react"

interface UseWebMCPToolOptions {
  name: string
  description: string
  properties: Record<string, { type: string; description?: string; enum?: string[] }>
  required?: string[]
  execute: (params: Record<string, any>) => unknown | Promise<unknown>
  /** أداة للقراءة فقط (بحث/تصفية) لا تُجري أي تعديل على البيانات */
  readOnly?: boolean
}

/**
 * يسجّل "أداة WebMCP" (WebMCP Tool) تجريبية تتيح لوكلاء الذكاء الاصطناعي
 * (Chrome 146+ فقط حالياً، خلف علم تجريبي) استدعاء وظيفة تفاعلية في الصفحة
 * مباشرة (كالبحث في المعجم القانوني أو تصفية الأرشيف) دون الحاجة لمحاكاة
 * نقرات المستخدم. الهوك آمن تماماً على كل المتصفحات الأخرى: يتحقق أولاً من
 * وجود navigator.modelContext، وإن لم يكن مدعوماً لا يفعل شيئاً إطلاقاً.
 *
 * المرجع الرسمي: https://developer.chrome.com/docs/ai/webmcp
 */
export function useWebMCPTool({
  name,
  description,
  properties,
  required = [],
  execute,
  readOnly = true,
}: UseWebMCPToolOptions) {
  useEffect(() => {
    const modelContext = (navigator as any).modelContext
    if (!modelContext || typeof modelContext.registerTool !== "function") {
      // المتصفح الحالي لا يدعم WebMCP بعد — لا شيء يُنفَّذ
      return
    }

    modelContext.registerTool({
      name,
      description,
      inputSchema: {
        type: "object",
        properties,
        required,
      },
      annotations: readOnly ? { readOnlyHint: "true" } : undefined,
      execute,
    })

    return () => {
      try {
        modelContext.unregisterTool?.(name)
      } catch {
        // تجاهل أي خطأ عند إلغاء التسجيل (مثلاً إن كانت الأداة غير مسجَّلة أصلاً)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])
}
