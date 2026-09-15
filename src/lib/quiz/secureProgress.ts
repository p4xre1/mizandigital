/**
 * حماية التقدم المحلي من التلاعب — secureProgress
 *
 * المشكلة: localStorage قابل للكتابة بسهولة عبر DevTools:
 *   localStorage.setItem('mizan:quiz:progress:v2', JSON.stringify({xp: 99999, credits: 99999}))
 *
 * الحل (دفاعي متعدد الطبقات):
 *   1) توقيع خفيف بـ HMAC-like (ليس تشفيراً حقيقياً — المفتاح في كود العميل —
 *      لكنه يرفع كلفة التلاعب ويكشف التعديل العرضي)
 *   2) حدود قصوى للـ XP/Credits في كل عملية
 *   3) التحقق من التسلسل الزمني للمحاولات
 *   4) عند وجود جلسة، الخادم هو مصدر الحقيقة — localStorage مجرد cache
 */

const CHECKSUM_KEY = "mizan:quiz:progress:checksum:v1";

// مفتاح توقيع بسيط — ليس سراً حقيقياً، لكنه ليس ثابتاً تماماً عبر البناء
// نستخدم navigator.userAgent + location.host كجزء من المفتاح لجعل التوقيع
// خاصاً بالجهاز إلى حد ما (لا يمنع التلاعب المتعمد، لكن يكشف النسخ/اللصق)
function getDeviceSalt(): string {
  if (typeof window === "undefined") return "server";
  try {
    const ua = window.navigator.userAgent.slice(0, 80);
    const host = window.location.host;
    return `${ua}|${host}|mizan-v2`;
  } catch {
    return "mizan-fallback-v2";
  }
}

// دالة هاش بسيطة وسريعة (djb2 variant) — ليست تشفيراً، فقط كشف تلاعب
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // تحويل إلى hex موجب
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function computeChecksum(data: string): string {
  const salt = getDeviceSalt();
  // طبقتان من الهاش مع الملح
  const first = simpleHash(data + salt);
  const second = simpleHash(salt + data + first);
  return `${first}-${second}`;
}

export function signProgress(progressJson: string): string {
  return computeChecksum(progressJson);
}

export function verifyProgress(progressJson: string, checksum: string | null): boolean {
  if (!checksum) return false;
  const expected = computeChecksum(progressJson);
  return expected === checksum;
}

// حدود الأمان
export const SECURITY_LIMITS = {
  maxXpPerAttempt: 3000,
  maxCreditsPerAttempt: 500,
  maxTotalXp: 100000,
  maxTotalCredits: 100000,
  maxAttempts: 100,
  maxXpJump: 3000, // أقصى قفزة في تحديث واحد
} as const;

export interface ValidationIssue {
  code: string;
  message: string;
  severity: "warn" | "error";
}

export function validateProgressIntegrity(
  progress: { xp: number; credits: number; attempts: Array<{ xpEarned: number; creditsEarned: number; total: number; correct: number }> },
  previousXp?: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (progress.xp < 0 || progress.xp > SECURITY_LIMITS.maxTotalXp) {
    issues.push({ code: "xp_out_of_range", message: `XP خارج النطاق: ${progress.xp}`, severity: "error" });
  }
  if (progress.credits < 0 || progress.credits > SECURITY_LIMITS.maxTotalCredits) {
    issues.push({ code: "credits_out_of_range", message: `Credits خارج النطاق: ${progress.credits}`, severity: "error" });
  }
  if (progress.attempts.length > SECURITY_LIMITS.maxAttempts) {
    issues.push({ code: "too_many_attempts", message: "عدد المحاولات كبير جداً", severity: "warn" });
  }

  if (previousXp !== undefined) {
    const diff = progress.xp - previousXp;
    if (diff > SECURITY_LIMITS.maxXpJump) {
      issues.push({ code: "xp_jump", message: `قفزة XP كبيرة: +${diff}`, severity: "error" });
    }
    if (diff < 0 && Math.abs(diff) > 1000) {
      issues.push({ code: "xp_drop", message: `انخفاض XP كبير: ${diff}`, severity: "warn" });
    }
  }

  for (const attempt of progress.attempts.slice(-10)) {
    if (attempt.xpEarned > SECURITY_LIMITS.maxXpPerAttempt) {
      issues.push({ code: "attempt_xp_high", message: `محاولة بـ XP عالي: ${attempt.xpEarned}`, severity: "error" });
    }
    if (attempt.creditsEarned > SECURITY_LIMITS.maxCreditsPerAttempt) {
      issues.push({ code: "attempt_credits_high", message: `محاولة بكريدتس عالي: ${attempt.creditsEarned}`, severity: "error" });
    }
    if (attempt.correct > attempt.total) {
      issues.push({ code: "correct_gt_total", message: "عدد الصحيح أكبر من الإجمالي", severity: "error" });
    }
  }

  return issues;
}

// تخزين واسترجاع checksum
export function saveChecksum(progressJson: string): void {
  if (typeof window === "undefined") return;
  try {
    const checksum = signProgress(progressJson);
    window.localStorage.setItem(CHECKSUM_KEY, checksum);
  } catch {
    /* ignore */
  }
}

export function getStoredChecksum(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CHECKSUM_KEY);
  } catch {
    return null;
  }
}

export function clearChecksum(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CHECKSUM_KEY);
  } catch {
    /* ignore */
  }
}
