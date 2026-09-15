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
