/**
 * إعداد Clerk المشترك
 * -----------------------------------------------------------------------
 * مصدر واحد للحقيقة حول ما إذا كان Clerk مفعّلاً فعلياً (أي أن
 * VITE_CLERK_PUBLISHABLE_KEY موجود فـ بيئة البناء).
 *
 * سبب وجود هذا الملف: كان main.tsx كيرمي Error فورية إذا كان المفتاح
 * غايب، وهاد الشي كيوقف تشغيل React بأكمله — فما كيبانش الهيدر ولا
 * التنقل ولا حتى زر "دخول" نفسه (الصفحة كتبقى بلا أي تفاعل). أي بيئة
 * نشر (Cloudflare/Netlify/Vercel...) ما فيهاش هاد المتغيّر بيئي مضبوط
 * كانت كافية باش "تخفي" زر تسجيل الدخول بشكل كامل عبر تعطيل الموقع كله.
 *
 * الحل: نتحقق من المفتاح مرة وحدة هنا، ونستعمل هاد العلم فـ:
 *   - main.tsx: باش نغلّف بـ <ClerkProvider> فقط إذا كان المفتاح موجود.
 *   - Header/PublicNavigation: باش ما نرندريوش <SignedIn>/<SignedOut>
 *     (اللي كيحتاجو ClerkProvider فـ الشجرة) إلا إذا كان مفعّلاً فعلاً.
 * هكذا: إذا كان المفتاح موجود ومضبوط بشكل صحيح فـ لوحة تحكم الاستضافة،
 * زر "دخول" غايبان كيبان بشكل طبيعي. وإذا كان غايب لسبب ما، باقي الموقع
 * (التنقل، المحتوى...) كيبقى شغّال بدل ما يتعطل بالكامل.
 */
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined

export const isClerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY)

if (!isClerkEnabled && import.meta.env.DEV) {
  // تحذير فـ بيئة التطوير فقط، بلا ما نوقف تشغيل التطبيق.
  // eslint-disable-next-line no-console
  console.warn(
    "[Clerk] VITE_CLERK_PUBLISHABLE_KEY غير مضبوط — زر تسجيل الدخول لن يظهر حتى تضيف المفتاح فـ .env (أو فـ إعدادات بيئة النشر)."
  )
}
