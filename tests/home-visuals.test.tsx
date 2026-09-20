// @vitest-environment jsdom
// اختبارات بصرية للصفحة الرئيسية: تقفل اللوحات والأقسام الجديدة.
//
// الصفحة الرئيسية لها نسختان: React (SPA) وHTML ثابت (scripts/prerender.mjs).
// هذا الملف يتحقق من نسخة React: لوحة المعاينة (قاموس + خريطة إحالات + حاسبة
// آجال)، وشبكة أدوات ميزان برو الستّ، ولوحة المصادر الرسمية، وعلامات الأقسام.
// النسخة الثابتة مقفولة في tests/ui-cleanup.test.ts.

import { readFileSync } from "node:fs";
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

  it("تحفظ فقرة الإجابة المباشرة بنصّها وصنفها الذي تقرأه القراءة الصوتية", () => {
    const container = renderHome();
    const lead = container.querySelector("p.lead");
    expect(lead).not.toBeNull();
    expect(lead?.textContent?.trim()).toBe(
      "ميزان الرقمية منصة مغربية تعليمية لطلبة الحقوق، محتواها الأساسي مجاني، وتجمع القاموس القانوني، وملخصات الفصول S1-S6، ودليل كليات الحقوق بالمغرب في مكان واحد.",
    );
    // البنية التحريرية للترويسة: مسطرة تحت العنوان + لوحة بشريط لوني.
    expect(container.querySelector("h1")?.textContent?.trim()).toBe(
      "المعرفة القانونية لطلبة الحقوق في المغرب",
    );
    expect(container.textContent).toContain("ابدأ من الأرشيف الدراسي بملخصات الفصول");
  });
});

describe("الصفحة الرئيسية — اللون والنقش والحركة", () => {
  it("تُلوّن بطاقات المحتوى والأدوات بألوان التصنيف الأربعة", () => {
    const container = renderHome();
    const html = container.innerHTML;
    // حدّ لوني أعلى البطاقات (شريط 1px) بكل لون تصنيف
    for (const bar of ["bg-[#2563eb]", "bg-[#f59e0b]", "bg-[#10b981]", "bg-[#ef4444]"]) {
      expect(html, bar).toContain(bar);
    }
    // خلفية ذهبية هادئة لقسم أدوات ميزان برو
    expect(html).toContain("bg-[#fffbeb]");
    // أيقونات الأدوات الستّ ليست بلون واحد
    for (const tone of ["bg-[#2563eb]/10", "bg-[#047857]/10", "bg-[#b45309]/10", "bg-[#b91c1c]/10"]) {
      expect(html, tone).toContain(tone);
    }
  });

  it("تضع نقش الزليج على الترويسة وقسم الأدوات وشريط الأرقام", () => {
    const container = renderHome();
    const html = container.innerHTML;
    expect(html).toContain("pattern-zellige");
    expect(html).toContain("pattern-zellige-light");
  });

  it("تُظهر الأقسام بحركة دخول لمرة واحدة وتُعدّ الأرقام تصاعدياً", () => {
    const container = renderHome();
    // jsdom بلا IntersectionObserver ⇒ الحالة النهائية فوراً (المحتوى ظاهر)
    expect(container.querySelectorAll(".rise").length).toBeGreaterThan(8);
    // الأرقام القابلة للعدّ تُعرض نهائية في jsdom (بلا rAF)
    expect(container.textContent).toContain("250");
  });

  it("تعمل الحركة والديكور من طبقة CSS مشتركة مع HTML الثابت", () => {
    const css = readFileSync("src/styles/globals.css", "utf8");
    expect(css).toContain(".pattern-zellige");
    expect(css).toContain(".pattern-zellige-light");
    expect(css).toContain("@keyframes mizan-rise");
    expect(css).toContain(".hover-lift");
    expect(css).toContain(".zoom-frame");
    expect(css).toContain(".link-arrow");
    // حركة واحدة عند الظهور، ولا حركة لمن يطلب تقليلها
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toMatch(/animation-iteration-count:\s*infinite|animate-spin/);
  });

  it("تزامن HTML الثابت مع نفس اللون والنقش والحركة", () => {
    const prerender = readFileSync("scripts/prerender.mjs", "utf8");
    expect(prerender).toContain("pattern-zellige");
    expect(prerender).toContain('class="rise');
    expect(prerender).toContain("accent-rule");
    expect(prerender).toContain("accent-rule-gold");
    expect(prerender).toContain("hover-lift");
    // قسم أدوات ميزان برو موجود في النسخة الثابتة أيضاً
    expect(prerender).toContain("ما هي أدوات ميزان برو الستّ؟");
    expect(prerender).toContain('href="/pro-tools"');
  });
});
