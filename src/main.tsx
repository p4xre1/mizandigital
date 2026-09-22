import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { AuthProvider } from "@/lib/auth/AuthProvider"
import { initAnalytics } from "@/lib/analytics/gtag"
import "./lib/security/globalGuard"
import "./styles/fonts.css"
import "./styles/globals.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element '#root' not found in index.html")
}

/**
 * نقطة الدخول — Supabase Auth فقط.
 *
 * أُزيل Clerk بالكامل (لا ClerkProvider ولا تحميل lazy لحزمة ~225KB).
 * AuthProvider يقرأ الجلسة من مفتاح sb-mizan-auth الموجود أصلاً، فلا حاجة لشاشة
 * إقلاع إضافية: التطبيق يُرسم فوراً ومنطقة المصادقة وحدها هي التي تُظهر
 * هيكلاً ريثما تُحسم الجلسة.
 *
 * initAnalytics() يعمل قبل الرسم مباشرة: يعرّف window.gtag (الذي تستخدمه
 * cookieConsent.ts) ويؤجّل تحميل GA الفعلي إلى وقت الخمول دون تعطيل LCP.
 */
initAnalytics()

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
