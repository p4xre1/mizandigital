// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";

/**
 * بحث الشريط العلوي: موضعه في الوسط، واختصار K، وأنه يعمل فعلاً.
 *
 * النسخة السابقة كانت حقلاً زخرفياً (بلا state ولا معالج) بعرض w-24 محشوراً
 * بين أزرار اليمين. هذه الاختبارات تثبّت السلوك الجديد.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/seo/AEOHead", () => ({ AEOHead: () => null }));

/** يعرض المسار الحالي حتى نتحقق من وجهة الانتقال. */
function LocationProbe() {
  const location = useLocation();
  return <div id="loc">{`${location.pathname}${location.search}`}</div>;
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

async function renderSearch(props: { className?: string } = {}) {
  const { NavbarSearch } = await import("@/components/nav/NavbarSearch");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <MemoryRouter initialEntries={["/"]}>
        <NavbarSearch {...props} />
        <LocationProbe />
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

const input = (el: HTMLElement) => el.querySelector<HTMLInputElement>('input[type="search"]')!;
const keyButton = (el: HTMLElement) =>
  [...el.querySelectorAll("button")].find((b) => b.textContent?.trim() === "K");
const location = (el: HTMLElement) => el.querySelector("#loc")!.textContent!;

async function type(el: HTMLElement, value: string) {
  const field = input(el);
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!;
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function press(el: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  await act(async () => {
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })
    );
  });
}

async function pressOnWindow(key: string, init: KeyboardEventInit = {}) {
  await act(async () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })
    );
  });
}

async function submit(el: HTMLElement) {
  await act(async () => {
    el.querySelector("form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  });
}

beforeEach(() => {
  unmount();
  vi.clearAllMocks();
});

describe("the search field renders with a K shortcut button", () => {
  it("has a search input, a role=search form and a K button", async () => {
    const el = await renderSearch();
    expect(input(el), "search input missing").toBeTruthy();
    expect(el.querySelector('form[role="search"]'), "form must expose role=search").toBeTruthy();
    const button = keyButton(el);
    expect(button, "K shortcut button missing").toBeTruthy();
    expect(button!.tagName).toBe("BUTTON");
    expect(button!.querySelector("kbd")?.textContent).toBe("K");
    expect(button!.getAttribute("aria-label")).toContain("K");
  });

  it("caps the input at the shared SEARCH_MAX limit", async () => {
    const { INPUT_LIMITS } = await import("@/lib/security/inputGuard");
    const el = await renderSearch();
    expect(input(el).maxLength).toBe(INPUT_LIMITS.SEARCH_MAX);
  });
});

describe("the field actually searches", () => {
  it("navigates to /search?q=… on submit", async () => {
    const el = await renderSearch();
    await type(el, "مدونة الأسرة");
    await submit(el);
    expect(location(el)).toBe(`/search?q=${encodeURIComponent("مدونة الأسرة")}`);
  });

  it("submits on Enter", async () => {
    const el = await renderSearch();
    await type(el, "القانون المدني");
    await press(input(el), "Enter");
    expect(location(el)).toContain("/search?q=");
  });

  it("goes to /search without a q when the query is empty", async () => {
    const el = await renderSearch();
    await type(el, "   ");
    await submit(el);
    expect(location(el)).toBe("/search");
  });

  it("strips markup out of the query rather than passing it through", async () => {
    const el = await renderSearch();
    await type(el, "<script>alert(1)</script>");
    await submit(el);
    const target = location(el);
    expect(target).toContain("/search?q=");
    // لا أقواس زاوية ولا وسم يصل إلى الرابط
    expect(decodeURIComponent(target)).not.toMatch(/[<>]/i);
    expect(decodeURIComponent(target).toLowerCase()).not.toContain("script");
  });

  it("shows an error and stays put when the query is too long", async () => {
    const { INPUT_LIMITS } = await import("@/lib/security/inputGuard");
    const el = await renderSearch();
    // type() يضبط value مباشرةً فيجاوز maxLength كما يحدث في لصق نص طويل
    await type(el, "ك".repeat(INPUT_LIMITS.SEARCH_MAX + 50));
    await submit(el);
    expect(location(el), "must not navigate on invalid input").toBe("/");
    expect(el.querySelector('[role="alert"]'), "an error must be shown").toBeTruthy();
    expect(input(el).getAttribute("aria-describedby")).toBe("navbar-search-error");
  });

  it("clears the error once the user edits the query", async () => {
    const { INPUT_LIMITS } = await import("@/lib/security/inputGuard");
    const el = await renderSearch();
    await type(el, "ك".repeat(INPUT_LIMITS.SEARCH_MAX + 50));
    await submit(el);
    expect(el.querySelector('[role="alert"]')).toBeTruthy();

    await type(el, "عقد");
    expect(el.querySelector('[role="alert"]'), "error should clear on edit").toBeNull();
    await submit(el);
    expect(location(el)).toContain("/search?q=");
  });

  it("Escape clears the query first, then blurs", async () => {
    const el = await renderSearch();
    await type(el, "عقد");
    input(el).focus();
    await press(input(el), "Escape");
    expect(input(el).value, "first Escape should clear").toBe("");

    await press(input(el), "Escape");
    expect(document.activeElement, "second Escape should blur").not.toBe(input(el));
  });
});

describe("the K hotkey", () => {
  it("focuses the field when pressed anywhere on the page", async () => {
    const el = await renderSearch();
    expect(document.activeElement).not.toBe(input(el));
    await pressOnWindow("k");
    expect(document.activeElement, "K must focus the search").toBe(input(el));
  });

  it("accepts uppercase K and Ctrl/Cmd+K", async () => {
    const el = await renderSearch();
    await pressOnWindow("K");
    expect(document.activeElement).toBe(input(el));
    input(el).blur();

    await pressOnWindow("k", { ctrlKey: true });
    expect(document.activeElement).toBe(input(el));
    input(el).blur();

    await pressOnWindow("k", { metaKey: true });
    expect(document.activeElement).toBe(input(el));
  });

  it("does not swallow the letter k typed into another field", async () => {
    const el = await renderSearch();
    const other = document.createElement("input");
    document.body.appendChild(other);
    other.focus();

    // الحدث يُطلق على الحقل الآخر ويصعد إلى window — كما في المتصفح تماماً،
    // فيكون event.target هو الحقل الذي يُكتب فيه.
    await press(other, "k");
    expect(document.activeElement, "plain k while typing must not steal focus").toBe(other);

    // لكن Ctrl+K يعمل حتى أثناء الكتابة في حقل آخر
    await press(other, "k", { ctrlKey: true });
    expect(document.activeElement).toBe(input(el));
    other.remove();
  });

  it("clicking the K button focuses the field", async () => {
    const el = await renderSearch();
    await act(async () => {
      keyButton(el)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.activeElement).toBe(input(el));
  });

  it("selects existing text so it can be replaced immediately", async () => {
    const el = await renderSearch();
    await type(el, "قديم");
    await pressOnWindow("k");
    expect(input(el).selectionStart).toBe(0);
    expect(input(el).selectionEnd).toBe(input(el).value.length);
  });

  it("removes its listener on unmount", async () => {
    const el = await renderSearch();
    const removeSpy = vi.spyOn(window, "removeEventListener");
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeSpy.mockRestore();
    expect(el.isConnected).toBe(false);
  });
});

describe("the navbar places the search in the middle", () => {
  it("wraps it in a flex-1 centered container between nav and actions", async () => {
    const { readFileSync } = await import("node:fs");
    const nav = readFileSync("src/layouts/PublicNavigation.tsx", "utf8");

    // الغلاف الذي يوسّط البحث
    expect(nav).toContain("hidden md:flex min-w-0 flex-1 justify-center");
    expect(nav).toContain("<NavbarSearch");

    // الحقل الزخرفي القديم (بلا state، بعرض ثابت w-24) يجب ألا يبقى.
    // نطابق النص المركّب لا "w-24" وحدها، لأنها جزء من
    // max-w-[calc(100vw-24px)] في قائمة الموبايل.
    expect(nav).not.toContain('placeholder="ابحث..." maxLength={100}');
    expect(nav).not.toMatch(/text-\[13px\] w-24/);

    // البحث يأتي بعد </nav> وقبل مجموعة أزرار اليمين
    const navEnd = nav.indexOf("</nav>");
    const searchAt = nav.indexOf("<NavbarSearch");
    const actionsAt = nav.indexOf('className="flex items-center gap-2 shrink-0"', navEnd);
    expect(navEnd).toBeGreaterThan(-1);
    expect(searchAt).toBeGreaterThan(navEnd);
    expect(actionsAt).toBeGreaterThan(searchAt);
  });

  it("keeps the icon-only search for small screens", async () => {
    const { readFileSync } = await import("node:fs");
    const nav = readFileSync("src/layouts/PublicNavigation.tsx", "utf8");
    expect(nav).toContain('className="grid md:hidden size-9 place-items-center');
  });
});

describe("the prerendered header matches", () => {
  it("carries the centered search and the K badge, and works without JS", async () => {
    const { readFileSync } = await import("node:fs");
    const prerender = readFileSync("scripts/prerender.mjs", "utf8");

    expect(prerender).toContain("hidden md:flex min-w-0 flex-1 justify-center");
    expect(prerender).toContain(">K</kbd>");
    // form حقيقي يعمل قبل الـ hydration
    expect(prerender).toContain('action="/search" method="get"');
    expect(prerender).toContain('name="q"');
    // الحقل القديم المحشور في اليمين زال
    expect(prerender).not.toContain('class="bg-transparent outline-none text-[13px] w-24');
  });
});
