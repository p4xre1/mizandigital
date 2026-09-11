import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider } from "@clerk/clerk-react"
import App from "./App"
import "./styles/fonts.css"
import "./styles/globals.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element '#root' not found in index.html")
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key (VITE_CLERK_PUBLISHABLE_KEY)")
}

const app = (
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>
)

// ملاحظة مهمة (Sep 2026): كنا نستعملو hydrateRoot() هنا على أساس أن
// المحتوى المُصدَّر مسبقاً (prerendered — راجع scripts/prerender.mjs) يطابق
// شكل شجرة React الحقيقية، فيتفادى React إعادة البناء من الصفر.
// المشكل: staticBody فـ prerender.mjs مصمم خصيصاً لمحركات البحث/الروبوتات
// (HTML دلالي بسيط: <main><article><h1>...</h1>) وهو مختلف بنيوياً بالكامل
// عن شجرة React الحقيقية (عناصر، className، تداخل مختلف تماماً). هاد
// الاختلاف كان كيخلي hydrateRoot() يفشل فـ كل صفحة (React errors #418/#423
// فـ الكونسول)، وReact كيتفاعل مع الفشل بمسح الشجرة المزيفة وإعادة البناء
// من جديد على أي حال — يعني الومضان اللي كنا كنحاولو نتفاداوه كان لسه واقع،
// بزيادة عملية hydration فاشلة قبلها (كتأثر على TBT وCumulative Layout Shift).
// الحل: createRoot() بسيط ومباشر، كيبني الشجرة الصحيحة من أول مرة بلا محاولة
// مطابقة فاشلة. المحتوى الثابت يبقى مفيد للروبوتات اللي ما كتخدمش JavaScript
// (GPTBot, ClaudeBot...) لأنهم كيقراو HTML الخام مباشرة بلا ما ينتظرو React.
createRoot(rootElement).render(app)