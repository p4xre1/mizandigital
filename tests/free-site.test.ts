import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { onRequestPost as createCreditCheckout } from "../functions/api/payments/create.js";
import { onRequestPost as createBillingCheckout } from "../functions/api/billing/checkout.js";
import { onRequestPost as createProCheckout } from "../functions/api/billing/pro-checkout.js";

const read = (path: string) => readFileSync(path, "utf8");

describe("free and ad-free site", () => {
  it.each([
    ["credit packages", createCreditCheckout],
    ["billing checkout", createBillingCheckout],
    ["Pro subscriptions", createProCheckout],
  ])("rejects new %s checkouts without taking payment", async (_name, handler) => {
    const response = await handler();
    expect(response.status).toBe(410);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toMatchObject({ error: "payments_disabled" });
  });

  it("describes every plan as free and removes public payment routes", () => {
    const pricing = read("src/pages/public/PricingPage.tsx");
    const routes = read("src/routes/AppRoutes.tsx");
    expect(pricing).toContain("مجانية بالكامل");
    expect(pricing).toContain("تصفح الموارد والأدوات التعليمية المتاحة للجميع.");
    expect(pricing).not.toMatch(/priceRange|priceCurrency|(?:0|49|99|199|399)\s*(?:د\.م|MAD)/);
    expect(pricing).not.toContain("pro-checkout");
    expect(routes).toContain('path="/payments" element={<Navigate to="/pricing" replace />}');
    expect(routes).not.toContain('path="/payments" element={<PaymentsPage');
  });

  it("removes ad placeholders and ad-based download delays", () => {
    for (const path of ["src/pages/public/DownloadGatePage.tsx", "src/pages/public/PdfDownloadPage.tsx"]) {
      const source = read(path);
      expect(source).not.toContain("مساحة إعلانية");
      expect(source).not.toContain("WAIT_SECONDS");
    }
  });

  it("keeps published legal tools available without a subscription", () => {
    const migration = read("supabase/migrations/20260928000001_free_everything_no_ads.sql");
    expect(migration).toContain("TO anon, authenticated");
    expect(migration).toContain("USING (published AND public.can_use_pro_tool(tool_slug))");
    expect(migration).not.toMatch(/subscription_status\s+IN|is_pro\s*=\s*true/i);
  });
});
