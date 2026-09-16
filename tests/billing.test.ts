import { describe, test, expect } from "vitest";
import { MIZAN_PRO_PLANS, CREDIT_PACKAGES, formatPrice, getPlanBySlug, getPackageBySlug } from "../shared/billing/stripe.js";
import { evaluatePaymentRisk, isSuspiciousUserAgent } from "../shared/billing/risk.js";

describe("billing plans", () => {
  test("plans have required fields", () => {
    for (const plan of Object.values(MIZAN_PRO_PLANS)) {
      expect((plan as any).id).toBeTruthy();
      expect((plan as any).priceMAD).toBeGreaterThan(0);
      expect((plan as any).credits).toBeGreaterThan(0);
    }
  });

  test("getPlanBySlug finds monthly and yearly", () => {
    expect(getPlanBySlug("pro_monthly")?.id).toBe("mizan_pro_monthly");
    expect(getPlanBySlug("pro_yearly")?.id).toBe("mizan_pro_yearly");
    expect(getPlanBySlug("nonexistent")).toBeNull();
  });

  test("packages include popular", () => {
    const popular = CREDIT_PACKAGES.filter((p: any) => p.popular);
    expect(popular.length).toBeGreaterThan(0);
  });

  test("formatPrice MAD", () => {
    expect(formatPrice(49, "MAD")).toContain("د.م.");
    expect(formatPrice(5, "USD")).toContain("$");
  });

  test("getPackageBySlug", () => {
    expect(getPackageBySlug("student")?.credits).toBe(350);
    expect(getPackageBySlug("invalid")).toBeNull();
  });
});

describe("risk evaluation", () => {
  test("high amount flagged", () => {
    const result = evaluatePaymentRisk({ amount_mad: 20000, credits_purchased: 100, provider_payment_id: "test" } as any, []);
    expect(result.level).toBe("high");
    expect(result.issues.length).toBeGreaterThan(0);
  });

  test("velocity check", () => {
    const history = Array.from({ length: 12 }, (_, i) => ({ created_at: new Date().toISOString(), provider_payment_id: `id-${i}` }));
    const result = evaluatePaymentRisk({ amount_mad: 49, credits_purchased: 100, provider_payment_id: "new" } as any, history as any);
    expect(result.issues.some((i) => i.code === "velocity_hour")).toBe(true);
  });

  test("duplicate provider ID flagged", () => {
    const history = [{ provider_payment_id: "dup-123", created_at: new Date().toISOString() }];
    const result = evaluatePaymentRisk({ amount_mad: 49, credits_purchased: 100, provider_payment_id: "dup-123" } as any, history as any);
    expect(result.issues.some((i) => i.code === "duplicate_provider_id")).toBe(true);
  });

  test("isSuspiciousUserAgent", () => {
    expect(isSuspiciousUserAgent("")).toBe(true);
    expect(isSuspiciousUserAgent("Mozilla/5.0")).toBe(false);
    expect(isSuspiciousUserAgent("curl/7.0")).toBe(true);
  });
});
