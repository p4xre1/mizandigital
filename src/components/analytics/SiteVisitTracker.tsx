import { useLocation } from "react-router-dom"
import { useTrackView } from "@/hooks/useTrackView"

/**
 * يُسجَّل زيارة حقيقية لكل تنقّل بين صفحات الموقع (بدون استثناء الزيارات
 * المتكررة لنفس الجلسة) لحساب "إجمالي زيارات الموقع" بدقة. يُوضع مرة واحدة
 * داخل PublicLayout حتى يعمل على كل الصفحات العامة تلقائياً.
 */
export function SiteVisitTracker() {
  const location = useLocation()
  useTrackView("page", location.pathname, { dedupePerSession: false })
  return null
}
