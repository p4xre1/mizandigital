import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AuthContextValue } from "@/lib/auth/AuthProvider";

/**
 * اختبارات الرسم الآمن لمنطقة المصادقة — Supabase Auth (بلا Clerk).
 *
 * القاعدة التي نحميها: كل مكوّن عام يجب أن يُرسم بلا خطأ حتى عندما لا يوجد
 * <AuthProvider> في الشجرة (SSR/prerender، أو اختبارات معزولة). useAuth()
 * يُرجع حالة "زائر" بدل أن يرمي — وهذا هو البديل المباشر لسلوك
 * ClerkErrorBoundary القديم.
 */

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      getUser: vi.fn(async () => ({ data: { user: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })),
    })),
    rpc: vi.fn(async () => ({ data: [], error: null })),
  },
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
  REPORT_REASONS: { spam: { label: "سبام", description: "سبام" } },
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

describe("Supabase-auth rendering without <AuthProvider>", () => {
  it("useAuth() falls back to guest state instead of throwing", async () => {
    const { useAuth } = await import("@/lib/auth/AuthProvider");
    const holder: { value: AuthContextValue | null } = { value: null };
    function Probe() {
      holder.value = useAuth();
      return null;
    }
    expect(() => render(<Probe />)).not.toThrow();
    const value = holder.value as AuthContextValue;
    expect(value.user).toBeNull();
    expect(value.profile).toBeNull();
    expect(value.isAdmin).toBe(false);
    expect(value.rank.id).toBe("D");
    expect(value.initialized).toBe(true);
  });

  it("Header (layouts) renders the Supabase sign-in entry", async () => {
    const { default: Header } = await import("@/layouts/Header");
    const html = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(html).toContain("/login");
  });

  it("PublicNavigation renders without a provider", async () => {
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

  it("AuthControls renders guest buttons (no session yet)", async () => {
    const { AuthControls } = await import("@/components/auth/AuthControls");
    const html = render(
      <MemoryRouter>
        <AuthControls />
      </MemoryRouter>
    );
    // بلا مزوّد: initialized = true و user = null → أزرار الزائر
    expect(html).toContain("دخول");
  });

  it("OnboardingGate renders nothing for a guest", async () => {
    const { OnboardingGate } = await import("@/components/onboarding/OnboardingGate");
    const html = render(
      <MemoryRouter>
        <OnboardingGate />
      </MemoryRouter>
    );
    expect(html).toBe("");
  });

  it("ReactionBar renders with the anonymous fallback", async () => {
    const { ReactionBar } = await import("@/components/reactions/ReactionBar");
    expect(() => render(<ReactionBar targetType="article" targetId="demo-1" />)).not.toThrow();
  });

  it("ReportDialog renders with the anonymous fallback", async () => {
    const { ReportDialog } = await import("@/components/governance/ReportDialog");
    expect(() => render(<ReportDialog targetType="article" targetId="demo-1" />)).not.toThrow();
  });

  it("AuthErrorBoundary switches to the fallback on error", async () => {
    const { AuthErrorBoundary } = await import("@/components/auth/AuthErrorBoundary");
    const state = AuthErrorBoundary.getDerivedStateFromError(new Error("session expired"));
    expect(state).toEqual({ hasError: true });
  });

  it("the LoginPage renders the three Supabase auth modes", async () => {
    const { default: LoginPage } = await import("@/pages/auth/LoginPage");
    const html = render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <LoginPage />
      </MemoryRouter>
    );
    expect(html).toContain("إنشاء حساب ميزان");
    expect(html).toContain("Google");
  });

  it("MyProfilePage renders the signed-out state without a provider", async () => {
    const { MyProfilePage } = await import("@/pages/public/MyProfilePage");
    const html = render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<MyProfilePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(html).toContain("بروفايلك يحتاج حساباً");
    expect(html).toContain("/login");
    // سلم الرتب كامل حتى للزائر
    expect(html).toContain("D");
    expect(html).toContain("SSS");
  });

  it("PublicProfilePage renders safely without a provider", async () => {
    const { PublicProfilePage } = await import("@/pages/public/PublicProfilePage");
    const html = render(
      <MemoryRouter initialEntries={["/u/nobody"]}>
        <Routes>
          <Route path="/u/:username" element={<PublicProfilePage />} />
        </Routes>
      </MemoryRouter>
    );
    // في الرسم الخادمي تبقى الصفحة في حالة التحميل (useEffect لا يعمل)
    // — المهم أنها لا ترمي ولا تحتاج <AuthProvider>.
    expect(html).toContain("جارٍ تحميل البروفايل");
  });

  it("no Clerk code, package or env key is left in the repo", () => {
    const root = process.cwd();
    // الملفات القديمة حُذفت فعلاً
    expect(existsSync(join(root, "src/lib/clerk"))).toBe(false);
    expect(existsSync(join(root, "src/components/auth/SafeClerkAuth.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/components/auth/ClerkErrorBoundary.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/middleware.ts"))).toBe(false);
    expect(existsSync(join(root, "clerk-react"))).toBe(false);
    expect(existsSync(join(root, "functions/_shared/clerk.js"))).toBe(false);

    // ولا أي اعتمادية أو متغيّر بيئة
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain("@clerk/clerk-react");
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain("@clerk/nextjs");
    expect(readFileSync(join(root, ".env.example"), "utf8")).not.toContain("VITE_CLERK_PUBLISHABLE_KEY");
  });
});
