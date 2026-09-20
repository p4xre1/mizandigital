// @vitest-environment jsdom
// اختبارات بصرية للصفحة الرئيسية: تقفل اللوحات والأقسام الجديدة.
//
// الصفحة الرئيسية لها نسختان: React (SPA) وHTML ثابت (scripts/prerender.mjs).
// هذا الملف يتحقق من نسخة React: لوحة المعاينة (قاموس + خريطة إحالات + حاسبة
// آجال)، وشبكة أدوات ميزان برو الستّ، ولوحة المصادر الرسمية، وعلامات الأقسام.
// النسخة الثابتة مقفولة في tests/ui-cleanup.test.ts.

import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import { HomePage } from "../src/pages/public/HomePage";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const containers: HTMLDivElement[] = [];
const roots: Root[] = [];

function renderHome(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
  });
  containers.push(container);
  roots.push(root);
  return container;
}

afterEach(() => {
  roots.splice(0).forEach((root) => act(() => root.unmount()));
  containers.splice(0).forEach((container) => container.remove());
});

describe("الصفحة الرئيسية — التصميم والبصريات", () => {
  it("تعرض لوحة معاينة من المنصة بأقسامها الثلاثة", () => {
    const container = renderHome();
    const text = container.textContent ?? "";
    expect(text).toContain("معاينة من المنصة");
    expect(text).toContain("مثال توضيحي");
    expect(text).toContain("القاموس القانوني");
    expect(text).toContain("خريطة الإحالات");
    expect(text).toContain("حاسبة الآجال");
    // النتيجة المعروضة هي نفسها التي يحسبها محرّك الآجال (أيام تقويمية).
    expect(text).toContain("2026-01-25");
    expect(text).toContain("2026-02-04");
  });

  it("تعرض شبكة أدوات ميزان برو الستّ مع رابط القسم", () => {
    const container = renderHome();
    const text = container.textContent ?? "";
    for (const title of [
      "قانون عبر الزمن",
      "من الواقعة إلى الحل",
      "خريطة الإحالات القانونية",
      "راقب النصّ",
      "حاسبة الآجال المسطرية",
      "ملف البحث القانوني",
    ]) {
      expect(text, title).toContain(title);
    }
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/pro-tools");
  });

  it("تحيل إلى المصادر الرسمية بروابط خارجية آمنة", () => {
    const container = renderHome();
    const official = [...container.querySelectorAll("a")].filter((a) =>
      (a.getAttribute("href") ?? "").includes("gov.ma"),
    );
    expect(official.map((a) => a.getAttribute("href"))).toEqual([
      "https://www.sgg.gov.ma",
      "https://adala.justice.gov.ma",
    ]);
    for (const link of official) {
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("target")).toBe("_blank");
    }
  });

  it("ترقّم الأقسام وتُبقي إيقاعاً واحداً للعناوين", () => {
    const container = renderHome();
    const text = container.textContent ?? "";
    for (const step of ["٠١", "٠٢", "٠٣", "٠٤"]) {
      expect(text, step).toContain(step);
    }
    // h1 واحد في الصفحة، وبعده h2 فقط (لا قفز في التسلسل).
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelectorAll("h3").length).toBeGreaterThan(0);
  });

  it("لا تعرض روابط فرعية فارغة في الترويسة", () => {
    const container = renderHome();
    const heroLinks = [...container.querySelectorAll("a")].filter((a) => {
      const href = a.getAttribute("href");
      return href === "/lexicon" || href === "/archive" || href === "/articles" || href === "/news";
    });
    expect(heroLinks.length).toBeGreaterThanOrEqual(4);
  });
});
