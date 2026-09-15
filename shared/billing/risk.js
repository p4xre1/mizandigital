// shared/billing/risk.js
//
// ─────────────────────────────────────────────────────────────────────────────
// إرشادات مخاطر الدفع — دوال نقية بلا شبكة ولا قاعدة بيانات
// ─────────────────────────────────────────────────────────────────────────────
//
// ─ حدود ما يمكن أن نفعله نحن
//
// الدفع يمر عبر صفحة Stripe مستضافة. Mizan لا يرى رقم البطاقة ولا محاولات
// الإدخال ولا عدد مرات الرفض لكل بطاقة. تلك الإشارات لدى Stripe Radar
// (declines_per_ip_hourly و name_count_for_card_weekly وأمثالها) وهي المكان
// الصحيح لها — انظر RADAR_RULES أدناه.
//
// ما نملكه فعلاً:
//   1. decline_code القادم في payment_intent.payment_failed.
//   2. بلد IP من ترويسة CF-IPCountry (مجانية على Cloudflare).
//   3. بلد البطاقة من كائن Stripe.
//   4. سرعة إنشاء جلسات Checkout على مسارنا نحن — وهذا هو سطح
//      anti-carding الحقيقي الذي نتحكّم فيه بالكامل.
//
// RADAR_RULES — تُضاف في لوحة Stripe → Radar → Rules (لا في الكود):
//   Block if :declines_per_ip: > 5
//   Block if :declines_per_email: > 5
//   Request 3D Secure if :card_country: != 'MA'
//   Block if :is_3d_secure: and not :is_3d_secure_authenticated:
//   Review if :risk_level: != 'normal'
// 3DS نفسه يُفرض من Radar/لوحة Stripe، لا من جلسة Checkout.

/**
 * أكواد رفض تُشير إلى بطاقة مسروقة/مفقودة. هذه أقوى إشارة متاحة لنا.
 *
 * ملاحظة من توثيق Stripe: لا تُعرض هذه التفاصيل على المستخدم ("Don't report
 * more detailed information to your customer") — تُسجَّل داخلياً فقط.
 */
export const FRAUD_SIGNAL_DECLINE_CODES = new Set([
  "stolen_card",
  "fraudulent",
  "lost_card",
  "pickup_card",
  "restricted_card",
  "security_violation",
  "merchant_blacklist",
  "revocation_of_authorization",
  "revocation_of_all_authorizations",
])

/**
 * أكواد رفض حميدة شائعة — لا يجب أن تُطلق قفلاً بمفردها، وإلا عاقبنا
 * مستخدماً أخطأ في CVC مرة واحدة.
 */
export const BENIGN_DECLINE_CODES = new Set([
  "incorrect_cvc",
  "invalid_cvc",
  "incorrect_zip",
  "incorrect_address",
  "invalid_expiry_month",
  "invalid_expiry_year",
  "expired_card",
  "insufficient_funds",
  "processing_error",
  "issuer_not_available",
  "testmode_decline",
])

/**
 * يُصنّف كود الرفض.
 *
 * @param {string|null|undefined} code
 * @returns {"fraud"|"benign"|"unknown"}
 */
export function classifyDeclineCode(code) {
  if (!code || typeof code !== "string") return "unknown"
  const c = code.trim().toLowerCase()
  if (FRAUD_SIGNAL_DECLINE_CODES.has(c)) return "fraud"
  if (BENIGN_DECLINE_CODES.has(c)) return "benign"
  return "unknown"
}

/**
 * يقيس تعارض بلد البطاقة مع بلد IP.
 *
 * ── لماذا هذا "إشارة" لا "قرار" ────────────────────────────────────────────
// مغاربة كثيرون يدفعون ببطاقات أجنبية أو يسافرون أو يستعملون VPN. القفل
// التلقائي هنا كان سيرفض عملاء شرعيين بأعداد كبيرة. لذلك تُسجَّل للإرسال
// للمراجعة، ولا تقفل وحدها.
 *
 * @param {object} args
 * @param {string|null} [args.cardCountry] بلد إصدار البطاقة (ISO 3166-1 alpha-2)
 * @param {string|null} [args.ipCountry]   بلد IP من CF-IPCountry
 * @returns {{ mismatch: boolean, severity: "none"|"low"|"high", reason: string }}
 */
export function assessGeoRisk({ cardCountry, ipCountry } = {}) {
  const norm = (v) => (typeof v === "string" && v.length === 2 ? v.toUpperCase() : null)
  const card = norm(cardCountry)
  const ip = norm(ipCountry)

  if (!card || !ip) {
    return { mismatch: false, severity: "none", reason: "insufficient_data" }
  }
  if (card === ip) {
    return { mismatch: false, severity: "none", reason: "match" }
  }

  // بطاقة مغربية من IP مغربي = الحالة الطبيعية.
  // بطاقة أجنبية من IP مغربي = شائع ومقبول (بطاقات دولية).
  // بطاقة مغربية من IP أجنبي = أقل شيوعاً، يستحق مراجعة.
  const severity = card === "MA" ? "high" : "low"
  return { mismatch: true, severity, reason: `card_${card}_ip_${ip}` }
}

/**
 * يقرّر هل يُقفل الحساب بعد فشل دفع.
 *
// ─ لماذا العتبة تختلف حسب نوع الكود؟
// رفض "stolen_card" واحد كافٍ للشك. أما "insufficient_funds" فثلاث مرات منه
// لا تعني احتيالاً بل تعني مستخدماً بلا رصيد — وقفلُه يضرّنا نحن.
 *
 * @param {object} args
 * @param {string|null} [args.declineCode]
 * @param {number} [args.failureCount] عدد الإخفاقات في النافذة
 * @param {number} [args.threshold=3]
 * @param {number} [args.fraudThreshold=1]
 * @returns {{ shouldLock: boolean, reason: string }}
 */
export function shouldLockAccount({ declineCode = null, failureCount = 0, threshold = 3, fraudThreshold = 1 } = {}) {
  const kind = classifyDeclineCode(declineCode)

  if (kind === "fraud" && failureCount >= Math.max(1, fraudThreshold)) {
    return { shouldLock: true, reason: "suspected_carding" }
  }
  if (kind === "benign") {
    // الأكواد الحميدة لا تقفل أبداً مهما تكررت — تُسجَّل فقط.
    return { shouldLock: false, reason: "benign_decline" }
  }
  if (failureCount >= Math.max(1, threshold)) {
    return { shouldLock: true, reason: "payment_velocity" }
  }
  return { shouldLock: false, reason: "below_threshold" }
}

/**
 * كشف نمط "اختبار البطاقات" على مسارنا.
 *
 * المهاجم يجرّب عشرات البطاقات المسروقة بمبالغ صغيرة. العلامة لدينا ليست
 * البطاقات (لا نراها) بل عدد جلسات Checkout المُنشأة من IP واحد.
 *
 * @param {object} args
 * @param {number} args.sessionsInWindow جلسات checkout أُنشئت من نفس IP في النافذة
 * @param {number} [args.distinctUsers=1] مستخدمون مختلفون على نفس IP
 * @param {number} [args.sessionLimit=5]
 * @param {number} [args.userSpreadLimit=3]
 * @returns {{ suspicious: boolean, reason: string }}
 */
export function detectCardTesting({ sessionsInWindow = 0, distinctUsers = 1, sessionLimit = 5, userSpreadLimit = 3 } = {}) {
  if (sessionsInWindow >= Math.max(1, sessionLimit)) {
    return { suspicious: true, reason: "checkout_session_velocity" }
  }
  if (distinctUsers >= Math.max(2, userSpreadLimit)) {
    return { suspicious: true, reason: "ip_user_spread" }
  }
  return { suspicious: false, reason: "normal" }
}

/**
 * يقرأ بلد IP من ترويسات Cloudflare.
 *
 * CF-IPCountry يضعه Cloudflare على الحافة ولا يستطيع العميل تزويره (يُستبدل
 * دائماً). أما X-Forwarded-For فقابل للتزوير فلا يُعتمد عليه جغرافياً.
 *
 * @param {Headers|{get:(k:string)=>string|null}} headers
 * @returns {string|null} ISO alpha-2 أو null
 */
export function readIpCountry(headers) {
  if (!headers || typeof headers.get !== "function") return null
  const raw = headers.get("CF-IPCountry")
  if (!raw) return null
  const v = String(raw).trim().toUpperCase()
  // Cloudflare يرسل "XX" حين لا يعرف البلد
  if (v.length !== 2 || v === "XX") return null
  return v
}

/**
 * يبني رسالة آمنة للعرض على المستخدم بعد فشل الدفع.
 *
 * لا نُسرّب أبداً أن البطاقة "مسروقة" — لا لصاحب البطاقة الحقيقي ولا
 * للمهاجم. رسالة واحدة محايدة لكل حالات الرفض الأمني.
 *
 * @param {string|null} declineCode
 * @returns {string}
 */
export function userFacingDeclineMessage(declineCode) {
  const kind = classifyDeclineCode(declineCode)
  if (kind === "fraud") {
    return "تعذّر إتمام الدفع. تواصل مع بنكك أو جرّب وسيلة دفع أخرى."
  }
  if (declineCode === "insufficient_funds") {
    return "الرصيد غير كافٍ لإتمام الدفع."
  }
  if (declineCode === "expired_card") {
    return "بطاقتك منتهية الصلاحية."
  }
  return "تعذّر إتمام الدفع. تحقّق من بيانات البطاقة وحاول مجدداً."
}

// Legacy risk evaluation (kept for compatibility)
/**
 * Risk & fraud detection for billing — shared
 * Lightweight heuristics to flag suspicious payments
 */

export const RISK_RULES = {
  maxAmountMAD: 10000,
  maxCreditsPerTx: 10000,
  maxTxPerHour: 10,
  maxTxPerDay: 30,
  suspiciousProviders: [],
};

export function evaluatePaymentRisk(payment, history = []) {
  const issues = [];
  let score = 0;

  if (payment.amount_mad > RISK_RULES.maxAmountMAD) {
    issues.push({ code: "amount_high", message: `Amount too high: ${payment.amount_mad}` });
    score += 60;
  }

  if (payment.credits_purchased > RISK_RULES.maxCreditsPerTx) {
    issues.push({ code: "credits_high", message: `Credits too high: ${payment.credits_purchased}` });
    score += 30;
  }

  // Velocity checks
  const oneHourAgo = Date.now() - 3600 * 1000;
  const recentHour = history.filter((h) => new Date(h.created_at).getTime() > oneHourAgo);
  if (recentHour.length >= RISK_RULES.maxTxPerHour) {
    issues.push({ code: "velocity_hour", message: `Too many tx last hour: ${recentHour.length}` });
    score += 25;
  }

  const oneDayAgo = Date.now() - 86400 * 1000;
  const recentDay = history.filter((h) => new Date(h.created_at).getTime() > oneDayAgo);
  if (recentDay.length >= RISK_RULES.maxTxPerDay) {
    issues.push({ code: "velocity_day", message: `Too many tx last day: ${recentDay.length}` });
    score += 20;
  }

  // Duplicate provider payment ID
  if (history.some((h) => h.provider_payment_id && h.provider_payment_id === payment.provider_payment_id)) {
    issues.push({ code: "duplicate_provider_id", message: "Duplicate provider payment ID" });
    score += 50;
  }

  const level = score >= 50 ? "high" : score >= 25 ? "medium" : "low";

  return { score, level, issues, blocked: score >= 80 };
}

export function isSuspiciousUserAgent(ua) {
  if (!ua) return true;
  const botPatterns = [/bot/i, /crawl/i, /spider/i, /curl/i, /wget/i, /python/i];
  return botPatterns.some((p) => p.test(ua));
}
