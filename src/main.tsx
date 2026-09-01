import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import App from "./App"
import "./styles/fonts.css"
import "./styles/globals.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element '#root' not found in index.html")
}

const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// الصفحات المُصدَّرة مسبقاً (prerendered — راجع scripts/prerender.mjs) تصل
// للمتصفح ومعها محتوى ثابت جاهز داخل #root من أول لحظة (جيد لمحركات البحث
// وسرعة أول عرض). المشكلة: createRoot() كان يمسح هذا المحتوى بالكامل
// ويعيد بناءه من الصفر بمجرد تحميل main.tsx، فيظهر "ومضان" لحظي (المحتوى
// الثابت يُرى ثم يختفي فجأة) قبل اكتمال تحميل السكريبتات.
// hydrateRoot() يلتحم مع نفس العقد الموجودة في الصفحة بدل مسحها وإعادة
// إدراجها، فتختفي هذه القفزة المرئية. نستعمله فقط عندما يوجد فعلاً محتوى
// مُصدَّر مسبقاً (كما فـ الإنتاج)؛ في وضع التطوير المحلي (#root فارغ) نرجع
// لسلوك createRoot() المعتاد.
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app)
} else {
  createRoot(rootElement).render(app)
}