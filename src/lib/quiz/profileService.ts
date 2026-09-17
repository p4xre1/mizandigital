/**
 * lib/quiz/profileService — طبقة توافق (re-export shim)
 * -----------------------------------------------------------------------
 * منطق البروفايلات انتقل إلى `@/lib/profiles/service` بعدما صار Supabase
 * Auth هو مصدر الهوية الوحيد (أُزيل Clerk). هذا الملف يبقى حتى لا تنكسر
 * الاستيرادات القديمة في صفحات البروفايل والاختبارات.
 *
 * لا تضيف منطقاً جديداً هنا — أضفه في lib/profiles/service.ts.
 */

export {
  publishLocalProfile,
  getLocalProfile,
  generateUsernameSuggestions,
  checkUsernameAvailability,
  isUsernameAvailable,
  fetchPublicProfile,
  syncProfileToCloud,
  mapRowToProfile,
} from "@/lib/profiles/service"

export type {
  PublicProfile,
  MyProfile,
  ProfileRow,
  SyncResult,
  AvailabilityResult,
  RankBoardEntry,
} from "@/lib/profiles/service"
