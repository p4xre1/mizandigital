import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider } from "@clerk/clerk-react"
import App from "./App"
import { CLERK_PUBLISHABLE_KEY, isClerkEnabled } from "./lib/clerk/config"
import "./styles/fonts.css"
import "./styles/globals.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element '#root' not found in index.html")
}

// ملاحظة إصلاح خلل (زر "دخول" الغائب): كان التطبيق كيرمي Error ويوقف
// التنفيذ بأكمله إذا كان VITE_CLERK_PUBLISHABLE_KEY غير مضبوط فـ بيئة
// النشر — يعني الموقع كامل (الهيدر، التنقل، المحتوى) كيبقى بلا أي رد فعل
// (بلا حتى زر تسجيل الدخول اللي هو المفروض يبان). دابا: نغلّف بـ
// <ClerkProvider> فقط إذا كان المفتاح موجود فعلاً، وإلا كنرندريو
// <App/> مباشرة (Header/PublicNavigation عندها نفس الفحص باش ما
// تحاولش تستعمل مكوّنات Clerk بلا Provider — شوف src/lib/clerk/config.ts).
const app = (
  <StrictMode>
    {isClerkEnabled ? (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY as string}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
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