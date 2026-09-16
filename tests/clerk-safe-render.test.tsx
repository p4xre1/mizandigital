import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";


/**
 * Regression test for the Clerk provider crash:
 *   "Uncaught Error: SignedOut can only be used within the <ClerkProvider /> component"
 *
 * كل المكونات العامة يجب أن تُرسم بدون أخطاء حتى لو:
 *  - VITE_CLERK_PUBLISHABLE_KEY غير مضبوط (isClerkEnabled === false)
 *  - ولا يوجد <ClerkProvider> في الشجرة
 */

vi.mock("@/lib/supabase/client", () => ({
  supabase: {},
}));
vi.mock("@/lib/reactions/service", () => ({
  REACTION_META: {
    like: { label: "إعجاب", icon: "👍" },
    helpful: { label: "مفيد", icon: "💡" },
    bookmark: { label: "حفظ", icon: "🔖" },
    fire: { label: "رائع", icon: "🔥" },
    insightful: { label: "مثير", icon: "✨" },
  },
  fetchReactions: vi.fn(async () => []),
}));
vi.mock("@/lib/governance/service", () => ({
  REPORT_REASONS: ["spam"],
  createReport: vi.fn(async () => ({})),
}));
vi.mock("@/lib/onboarding/api", () => ({
  checkOnboardingCompleted: vi.fn(async () => true),
  submitOnboarding: vi.fn(async () => true),
}));

// ملاحظة: نشتق النوع من renderToString نفسه لأن الحزمة فيها نسختين من @types/react
function render(el: Parameters<typeof renderToString>[0]) {
  return renderToString(el);
}

describe("Clerk-safe rendering without VITE_CLERK_PUBLISHABLE_KEY", () => {
  it("isClerkEnabled is false in this env (no key)", async () => {
    const { isClerkEnabled } = await import("@/lib/clerk/config");
    expect(isClerkEnabled).toBe(false);
  });

  it("Header (layouts) renders without ClerkProvider", async () => {
    const { default: Header } = await import("@/layouts/Header");
    expect(() =>
      render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  it("PublicNavigation renders without ClerkProvider", async () => {
    const { Header: PublicNav } = await import("@/layouts/PublicNavigation");
    expect(() =>
      render(
        <MemoryRouter>
          <PublicNav
            theme="light"
            menuOpen={false}
            onToggleTheme={() => {}}
            onToggleMenu={() => {}}
            onCloseMenu={() => {}}
          />
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  it("OnboardingGate renders to null without ClerkProvider", async () => {
    const { OnboardingGate } = await import("@/components/onboarding/OnboardingGate");
    const html = render(
      <MemoryRouter>
        <OnboardingGate />
      </MemoryRouter>
    );
    expect(html).toBe("");
  });

  it("ReactionBar renders without ClerkProvider (anonymous fallback)", async () => {
    const { ReactionBar } = await import("@/components/reactions/ReactionBar");
    expect(() =>
      render(<ReactionBar targetType="article" targetId="demo-1" />)
    ).not.toThrow();
  });

  it("ReportDialog renders without ClerkProvider (anonymous fallback)", async () => {
    const { ReportDialog } = await import("@/components/governance/ReportDialog");
    expect(() =>
      render(<ReportDialog targetType="article" targetId="demo-1" />)
    ).not.toThrow();
  });

  it("SafeClerkAuth returns null when Clerk disabled", async () => {
    const { SafeClerkAuth } = await import("@/components/auth/SafeClerkAuth");
    const html = render(<SafeClerkAuth />);
    // comment placeholder for null render
    expect(html.replace(/<!--.*?-->/g, "")).toBe("");
  });

  it("ClerkErrorBoundary switches to error state on ClerkProvider error", async () => {
    const { ClerkErrorBoundary } = await import("@/components/auth/ClerkErrorBoundary");
    const state = ClerkErrorBoundary.getDerivedStateFromError(
      new Error("SignedOut can only be used within the <ClerkProvider /> component")
    );
    expect(state).toEqual({ hasError: true });
  });
});
