import { useEffect } from "react"
import { useLocation, useNavigationType } from "react-router-dom"

/**
 * يعيد وضع التمرير إلى أعلى الصفحة عند كل تنقّل بين المسارات.
 *
 * على عكس المواقع التقليدية متعددة الصفحات، لا يفعل React Router هذا تلقائياً:
 * عند الانتقال من صفحة طويلة إلى صفحة جديدة عبر <Link>، يحتفظ المتصفح بموضع
 * التمرير السابق، فتبدو الصفحة الجديدة وكأنها فُتحت من الأسفل بدل الأعلى.
 *
 * نستثني حالة الرجوع للخلف/للأمام (POP) لأن المتصفح يستعيد موضع التمرير
 * الصحيح تلقائياً في هذه الحالة، وهو السلوك المتوقع من المستخدم.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType === "POP") return
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior })
  }, [pathname, navigationType])

  return null
}
