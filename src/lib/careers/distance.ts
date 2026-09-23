/**
 * حساب المسافة بخط مستقيم (Haversine) — محلياً في المتصفح فقط.
 *
 * لماذا Haversine وليس مسافة طريق؟ لأن النظام لا يستدعي أي خدمة خرائط أو
 * ترميز جغرافي (شرط صريح في تصميم الميزة): لا Google Maps، ولا Geocoding،
 * ولا أي طلب شبكة. النتيجة «مسافة تقريبية بخط مستقيم» تُعرض بهذه الصفة
 * نفسها في الواجهة، مع تنبيه صريح أنها ليست مسافة طريق ولا زمن سفر.
 */

import type { GeoPoint } from "./types";

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** هل النقطة صالحة للحساب؟ (إحداثيات رقمية داخل النطاق الجغرافي). */
export function isValidPoint(point: Partial<GeoPoint> | null | undefined): point is GeoPoint {
  if (!point) return false;
  const { latitude, longitude } = point;
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * المسافة بالكيلومترات بين نقطتين على سطح كرة أرضية نصف قطرها المتوسط.
 *
 *   distanceInKm(a, a) === 0
 *   distanceInKm(a, b) > 0  لكل نقطتين مختلفتين
 *
 * النقطة غير الصالحة تُرجع `Number.NaN` — لا صفراً ولا قيمة مضللة: الترتيب
 * يعتمد على فلترة النقاط الصالحة قبل الاستدعاء (انظر rankNearbySchools).
 */
export function distanceInKm(from: GeoPoint, to: GeoPoint): number {
  if (!isValidPoint(from) || !isValidPoint(to)) return Number.NaN;

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const value = EARTH_RADIUS_KM * c;
  // انحراف الفاصلة العائمة يجعل نقطتين متطابقتين تعطيان 1e-13 بدل صفر.
  return value < 1e-6 ? 0 : value;
}

/** تقريب للعرض: كيلومترات صحيحة في المدى القريب، وأكثر خشونة في البعيد. */
export function roundDistanceKm(km: number): number {
  if (!Number.isFinite(km)) return Number.NaN;
  if (km < 10) return Math.round(km * 10) / 10;
  return Math.round(km);
}

/** نصّ عرض المسافة بالعربية مع تنبيه التقريب. */
export function formatDistanceKm(km: number): string {
  const rounded = roundDistanceKm(km);
  if (!Number.isFinite(rounded)) return "غير متاحة";
  return `≈ ${rounded} كم`;
}
