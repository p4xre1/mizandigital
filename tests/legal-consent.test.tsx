// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

/**
 * خانة الموافقة الإلزامية على سياسة الخصوصية.
 *
 * ما نحميه هنا سلوكياً لا شكلياً:
 *   • الخانة موجودة وغير مؤشَّرة مسبقاً (الصندوق المُؤشَّر مسبقاً ليس موافقة).
 *   • لا يُنشأ حساب بدونها — لا بالبريد ولا عبر Google.
 *   • تُلتقط الموافقة *قبل* نداء الشبكة، لأن مسار Google يغادر الصفحة.
 *   • النسخة المسجّلة هي نفس LEGAL_LAST_UPDATED المعروضة في نص السياسة.
 */

const authState = {
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signIn: vi.fn(),
  resetPassword: vi.fn(),
};

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    initialized: true,
    user: null,
    profile: null,
    session: null,
    isAdmin: false,
    isPro: false,
    syncError: null,
    rank: { id: "D", level: 1, label: "مبتدئ", glyph: "D" },
    signIn: authState.signIn,
    signUp: authState.signUp,
    signInWithGoogle: authState.signInWithGoogle,
    resetPassword: authState.resetPassword,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    saveProfile: vi.fn(),
    pushProgress: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      getUser: vi.fn(async () => ({ data: { user: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
      })),
    })),
    rpc: vi.fn(async () => ({ data: [], error: null })),
  },
}));

vi.mock("@/components/seo/AEOHead", () => ({ AEOHead: () => null }));

// React 18 يتطلب هذا العلم كي لا يُحذّر من act(...) في بيئة اختبار.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

async function renderLogin(mode: "signup" | "signin" = "signup") {
  const { default: LoginPage } = await import("@/pages/auth/LoginPage");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <MemoryRouter initialEntries={[`/login?mode=${mode}`]}>
        <LoginPage />
      </MemoryRouter>
    );
  });
  return container;
}

function unmount() {
  if (root) act(() => root!.unmount());
  root = null;
  container?.remove();
  container = null;
}

const checkbox = (el: HTMLElement) =>
  el.querySelector<HTMLInputElement>('input#legalConsent, input[type="checkbox"]');

async function setType(el: HTMLElement, id: string, value: string) {
  const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
  await act(async () => {
    // React يتتبع القيمة عبر واصف خاص، فنضبطه بالطريقة الأصلية.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function submitForm(el: HTMLElement) {
  const form = el.querySelector("form")!;
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  unmount();
  authState.signUp.mockResolvedValue({ error: null, needsEmailConfirmation: false });
  authState.signInWithGoogle.mockResolvedValue({ error: null });
  authState.signIn.mockResolvedValue({ error: null });
});

describe("the consent checkbox is rendered and unticked", () => {
  it("appears on the signup form, required and NOT pre-checked", async () => {
    const el = await renderLogin("signup");
    const box = checkbox(el);
    expect(box, "consent checkbox is missing from signup").not.toBeNull();
    expect(box!.checked, "checkbox must not be pre-ticked").toBe(false);
    expect(box!.required, "checkbox must be required").toBe(true);
    expect(box!.type).toBe("checkbox");
  });

  it("links to the privacy policy and the terms", async () => {
    const el = await renderLogin("signup");
    const links = [...el.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(links).toContain("/privacy");
    expect(links).toContain("/terms");
    expect(el.textContent).toContain("سياسة الخصوصية");
    expect(el.textContent).toContain("الشروط والأحكام");
  });

  it("warns that the profile is public by default", async () => {
    const el = await renderLogin("signup");
    expect(el.textContent).toContain("بروفايلاً عاماً");
  });

  it("appears before the Google button in sign-in mode too", async () => {
    // Google قد ينشئ حساباً جديداً حتى من وضع الدخول، فالموافقة مطلوبة هناك.
    const el = await renderLogin("signin");
    const box = checkbox(el);
    expect(box, "Google sign-in must also require consent").not.toBeNull();
    expect(box!.checked).toBe(false);
    const google = [...el.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Google")
    );
    expect(google).toBeTruthy();
  });
});

describe("account creation is blocked without consent", () => {
  it("does not call signUp and shows an error when unticked", async () => {
    const el = await renderLogin("signup");
    await setType(el, "fullName", "أمينة بنعلي");
    await setType(el, "email", "amina@mizan.page");
    await setType(el, "password", "secret123");

    await submitForm(el);

    expect(authState.signUp).not.toHaveBeenCalled();
    expect(el.textContent).toContain("يجب الموافقة على سياسة الخصوصية");
  });

  it("does not start the Google flow when unticked", async () => {
    const el = await renderLogin("signin");
    const google = [...el.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Google")
    )!;
    await click(google);
    expect(authState.signInWithGoogle).not.toHaveBeenCalled();
    expect(el.textContent).toContain("يجب الموافقة على سياسة الخصوصية");
  });

  it("calls signUp once the box is ticked", async () => {
    const el = await renderLogin("signup");
    await setType(el, "email", "amina@mizan.page");
    await setType(el, "password", "secret123");

    await click(checkbox(el)!);
    expect(checkbox(el)!.checked).toBe(true);

    await submitForm(el);

    expect(authState.signUp).toHaveBeenCalledTimes(1);
    expect(authState.signUp.mock.calls[0][0]).toMatchObject({ email: "amina@mizan.page" });
  });

  it("calls Google sign-in once the box is ticked", async () => {
    const el = await renderLogin("signin");
    await click(checkbox(el)!);
    const google = [...el.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Google")
    )!;
    await click(google);
    expect(authState.signInWithGoogle).toHaveBeenCalledTimes(1);
  });
});

describe("consent is recorded with the right version and method", () => {
  it("captures the consent before the network call, with the policy version", async () => {
    const { POLICY_VERSION, CONSENT_STORAGE_KEY, readStoredConsent } = await import(
      "@/lib/legal/consent"
    );
    const { LEGAL_LAST_UPDATED } = await import("@/content/legal/policies.js");
    expect(POLICY_VERSION).toBe(LEGAL_LAST_UPDATED);

    const el = await renderLogin("signup");
    await setType(el, "email", "amina@mizan.page");
    await setType(el, "password", "secret123");
    await click(checkbox(el)!);
    await submitForm(el);

    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    expect(raw, "consent was not persisted").toBeTruthy();
    const record = readStoredConsent();
    expect(record).not.toBeNull();
    expect(record!.policyVersion).toBe(LEGAL_LAST_UPDATED);
    expect(record!.method).toBe("email");
    expect(record!.documents).toEqual(expect.arrayContaining(["privacy", "terms"]));
    expect(Number.isNaN(Date.parse(record!.agreedAt))).toBe(false);
    // لم تُزامَن بعد — المزامنة تحتاج user_id حقيقياً
    expect(record!.synced).toBe(false);
  });

  it("records method=google for the OAuth path", async () => {
    const { readStoredConsent } = await import("@/lib/legal/consent");
    const el = await renderLogin("signin");
    await click(checkbox(el)!);
    const google = [...el.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Google")
    )!;
    await click(google);
    expect(readStoredConsent()!.method).toBe("google");
  });
});

describe("consent is not asked again for the same policy version", () => {
  it("hides the checkbox and shows a recorded-consent note", async () => {
    const { captureConsent, hasCurrentConsent } = await import("@/lib/legal/consent");
    captureConsent("email");
    expect(hasCurrentConsent()).toBe(true);

    const el = await renderLogin("signup");
    expect(checkbox(el), "checkbox should not be re-asked").toBeNull();
    expect(el.textContent).toContain("موافقتك على سياسة الخصوصية مسجّلة");
  });

  it("asks again when the policy version changes", async () => {
    const { CONSENT_STORAGE_KEY, POLICY_VERSION, hasCurrentConsent } = await import(
      "@/lib/legal/consent"
    );
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        policyVersion: "1 يناير 2000",
        agreedAt: new Date().toISOString(),
        method: "email",
        documents: ["privacy", "terms"],
        synced: true,
      })
    );
    expect(hasCurrentConsent(), "stale version must not count").toBe(false);

    const el = await renderLogin("signup");
    const box = checkbox(el);
    expect(box, "must re-ask after a policy update").not.toBeNull();
    expect(box!.checked).toBe(false);
    expect(el.textContent).toContain(POLICY_VERSION);
  });

  it("ignores corrupt stored consent instead of trusting it", async () => {
    const { CONSENT_STORAGE_KEY, readStoredConsent, hasCurrentConsent } = await import(
      "@/lib/legal/consent"
    );
    localStorage.setItem(CONSENT_STORAGE_KEY, "{not json");
    expect(readStoredConsent()).toBeNull();
    expect(hasCurrentConsent()).toBe(false);

    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ policyVersion: "x" }));
    expect(readStoredConsent(), "missing agreedAt must be rejected").toBeNull();
  });

  it("signup is allowed straight away when consent is already on record", async () => {
    const { captureConsent } = await import("@/lib/legal/consent");
    captureConsent("email");

    const el = await renderLogin("signup");
    await setType(el, "email", "amina@mizan.page");
    await setType(el, "password", "secret123");
    await submitForm(el);

    expect(authState.signUp).toHaveBeenCalledTimes(1);
  });
});

describe("the consent store is backed by the database", () => {
  it("the migration defines the table, the RPC and owner-only RLS", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync(
      "supabase/migrations/20260925000000_legal_consents.sql",
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.legal_consents");
    expect(sql).toContain("REFERENCES auth.users(id) ON DELETE CASCADE");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("FUNCTION public.record_legal_consent");
    expect(sql).toContain("user_id = (SELECT auth.uid())");
    // دليل قانوني: لا تعديل ولا حذف من الواجهة
    expect(sql).not.toMatch(/FOR UPDATE[\s\S]{0,80}legal_consents/);
    expect(sql).not.toContain("CREATE POLICY \"legal_consents_owner_delete\"");
    // UPSERT على النسخة، فلا صفوف مكررة
    expect(sql).toContain("ON CONFLICT (user_id, document, policy_version)");
    // لا يلفّق موافقة للحسابات القائمة
    expect(sql).not.toMatch(/INSERT INTO public\.legal_consents[\s\S]{0,200}SELECT[\s\S]{0,200}auth\.users/);
  });

  it("the account-deletion path removes consent rows and the docs say so", async () => {
    const { readFileSync } = await import("node:fs");
    const { DELETED_TABLES } = await import("@/content/legal/policies.js");
    // لم يعد الطرف يحذف الصفوف: صار يسجّل طلب حذف ناعم، وحذف legal_consents
    // يتم عبر ON DELETE CASCADE عند الإخفاء النهائي (user_id → auth.users).
    const deleteFn = readFileSync("functions/api/account/delete.js", "utf8");
    expect(deleteFn).toContain("rpc/request_account_deletion");
    expect(DELETED_TABLES).toContain("legal_consents");
    const consentSql = readFileSync(
      "supabase/migrations/20260925000000_legal_consents.sql",
      "utf8"
    );
    expect(consentSql).toMatch(/user_id\s+uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  });

  it("the RPC name used by the client matches the migration", async () => {
    const { readFileSync } = await import("node:fs");
    const consent = readFileSync("src/lib/legal/consent.ts", "utf8");
    const sql = readFileSync(
      "supabase/migrations/20260925000000_legal_consents.sql",
      "utf8"
    );
    const used = consent.match(/rpc\(\s*"([a-z_]+)"/)?.[1];
    expect(used).toBeTruthy();
    expect(sql).toContain(`FUNCTION public.${used}(`);
  });
});
