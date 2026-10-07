// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";

/**
 * بحث قائمة البرغر (MenuSearch).
 *
 * كان البحث حقلين: حقل وسطي في الشريط العلوي بشارة «K»، وأيقونة تنقل إلى
 * /search على الموبايل. الآن:
 *   • حقل واحد فقط داخل قائمة البرغر (الموبايل واللوحي)، وفي أعلى القائمة
 *     ملتصقاً بها (sticky) فلا يغيب عند النزول إلى آخر رابط.
 *   • اختصار الحرف K أُزيل بالكامل — لا مستمع keydown عاماً ولا شارة kbd.
 *   • الشريط العلوي بلا حقل بحث، وبقيت أيقونة /search لسطح المكتب (lg+).
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** يعرض المسار الحالي حتى نتحقق من وجهة الانتقال. */
function LocationProbe() {
  const location = useLocation();
  return <div id="loc">{`${location.pathname}${location.search}`}</div>;
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

async function renderSearch(props: { className?: string } = {}) {
  const { MenuSearch } = await import("@/components/nav/MenuSearch");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <MemoryRouter initialEntries={["/"]}>
        <MenuSearch {...props} />
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

describe("the menu search field", () => {
  it("renders a search input inside a role=search form", async () => {
    const el = await renderSearch();
    expect(input(el), "search input missing").toBeTruthy();
    expect(el.querySelector('form[role="search"]'), "form must expose role=search").toBeTruthy();
    expect(el.querySelector("form")!.getAttribute("aria-label")).toContain("ميزان الرقمية");
  });

  it("labels the input so screen readers announce it", async () => {
    const el = await renderSearch();
    const field = input(el);
    const label = el.querySelector("label");
    expect(label, "a label is required").toBeTruthy();
    expect(label!.getAttribute("for")).toBe(field.id);
    expect(field.id, "input must have an id to pair with the label").toBeTruthy();
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
    const alert = el.querySelector('[role="alert"]');
    expect(alert, "an error must be shown").toBeTruthy();
    expect(input(el).getAttribute("aria-describedby")).toBe(alert!.id);
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

  it("offers a clear button on touch screens where there is no Escape key", async () => {
    const el = await renderSearch();
    expect(
      [...el.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "تفريغ البحث"),
      "no clear button before typing"
    ).toBeUndefined();

    await type(el, "عقد");
    const clear = [...el.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "تفريغ البحث"
    );
    expect(clear, "clear button must appear with text").toBeTruthy();

    await act(async () => {
      clear!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(input(el).value).toBe("");
    expect(document.activeElement).toBe(input(el));
  });
});

describe("the K shortcut is gone", () => {
  it("renders no kbd badge and no shortcut button", async () => {
    const el = await renderSearch();
    expect(el.querySelector("kbd"), "K badge must be removed").toBeNull();
    expect(
      [...el.querySelectorAll("button")].map((b) => b.textContent?.trim()),
      "no button may advertise a hotkey"
    ).not.toContain("K");
  });

  it("registers no global keydown listener", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    await renderSearch();
    const keydownCalls = addSpy.mock.calls.filter(([type]) => type === "keydown");
    expect(keydownCalls, "the field must not hijack the keyboard").toHaveLength(0);
    addSpy.mockRestore();
  });

  it("does not steal focus when k is typed into another field", async () => {
    const el = await renderSearch();
    const other = document.createElement("input");
    document.body.appendChild(other);
    other.focus();

    await press(other, "k");
    await pressOnWindow("k", { ctrlKey: true });
    await pressOnWindow("K");

    expect(document.activeElement, "plain k must stay where it was typed").toBe(other);
    expect(document.activeElement, "K alone must not focus the search").not.toBe(input(el));
    other.remove();
  });

  it("deletes the old hotkey hook instead of leaving it dead", async () => {
    expect(existsSync("src/hooks/useSearchShortcut.ts"), "dead hook must be deleted").toBe(false);
    expect(existsSync("src/components/nav/NavbarSearch.tsx"), "old header field must be deleted").toBe(
      false
    );
  });
});

describe("the burger menu hosts the search", () => {
  const nav = () => readFileSync("src/layouts/PublicNavigation.tsx", "utf8");

  it("places the field inside the mobile menu, above the links", () => {
    const source = nav();
    const menuAt = source.indexOf("site-mobile-menu lg:hidden fixed right-3");
    const searchAt = source.indexOf("<MenuSearch");
    const firstLinkAt = source.indexOf('to="/articles"', menuAt);
    const linksWrapperAt = source.indexOf('<div className="p-2.5 pt-2 space-y-1">');

    expect(menuAt).toBeGreaterThan(-1);
    expect(searchAt, "the menu must render MenuSearch").toBeGreaterThan(menuAt);
    expect(searchAt, "search must come before the links").toBeLessThan(firstLinkAt);
    expect(searchAt, "search must sit outside the links wrapper").toBeLessThan(linksWrapperAt);
  });

  it("sticks the field to the top of the scrollable menu", () => {
    const source = nav();
    expect(source).toContain("sticky top-0 z-10 border-b border-[#f1f5f9]");
    expect(source).toContain('className="max-h-[70vh] overflow-y-auto"');
  });

  it("removes the centered desktop field from the header bar", () => {
    const source = nav();
    expect(source, "the centered wrapper must be gone").not.toContain(
      "hidden md:flex min-w-0 flex-1 justify-center"
    );
    expect(source).not.toContain("<NavbarSearch");
    expect(source).not.toContain("SEARCH_HOTKEY");
    expect(source, "no search form may live in the bar itself").not.toContain(
      'placeholder="ابحث..." maxLength={100}'
    );
  });

  it("keeps a single /search icon link for large screens", () => {
    const source = nav();
    expect(source).toContain('to="/search"');
    expect(source).toContain("hidden lg:grid size-9 place-items-center");
    expect(source).toContain('aria-label="البحث في ميزان الرقمية"');
  });
});

describe("the real header with an open burger menu", () => {
  async function renderHeader() {
    const { Header } = await import("@/layouts/PublicNavigation");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/"]}>
          <Header
            theme="light"
            menuOpen
            onToggleTheme={() => {}}
            onToggleMenu={() => {}}
            onCloseMenu={() => {}}
          />
          <LocationProbe />
        </MemoryRouter>
      );
    });
    return container;
  }

  it("mounts the only search field inside the menu, not in the header bar", async () => {
    const el = await renderHeader();
    const panels = [...el.querySelectorAll(".site-mobile-menu")];
    expect(panels.length, "overlay + dropdown expected").toBe(2);
    const dropdown = panels.find((node) => node.querySelector('input[type="search"]'))!;
    expect(dropdown, "the dropdown must hold the search field").toBeTruthy();
    expect(
      el.querySelector('header input[type="search"]'),
      "the header bar must stay search-free"
    ).toBeNull();
    // لا شارة اختصار داخل القائمة
    expect(dropdown.querySelector("kbd")).toBeNull();
  });

  it("searches from the menu and closes it", async () => {
    const el = await renderHeader();
    const menuInput = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )!.set!;
      setter.call(menuInput, "الفصل 19");
      menuInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      menuInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    expect(location(el)).toBe(`/search?q=${encodeURIComponent("الفصل 19")}`);
  });
});

describe("the prerendered header matches", () => {
  const prerender = () => readFileSync("scripts/prerender.mjs", "utf8");

  it("ships no K badge and no centered search form", () => {
    const html = prerender();
    expect(html).not.toContain(">K</kbd>");
    expect(html).not.toContain("اختصار البحث");
    expect(html).not.toContain("hidden md:flex min-w-0 flex-1 justify-center");
    expect(html).not.toContain('action="/search" method="get"');
  });

  it("keeps the large-screen search icon with the same classes as React", () => {
    const html = prerender();
    expect(html).toContain('href="/search" class="hidden lg:grid size-9 place-items-center');
    expect(html).toContain('aria-label="البحث في ميزان الرقمية"');
    // الشريط بلا حقل بحث قبل التحميل أيضاً
    expect(html).not.toContain('name="q"');
  });
});
