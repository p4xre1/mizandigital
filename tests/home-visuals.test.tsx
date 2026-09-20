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
    for (const step of ["٠١", "٠٢", "٠٣", "٠٤", "٠٥"]) {
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
    for (const bar of ["bg-[#2563eb]", "bg-[#b45309]", "bg-[#10b981]", "bg-[#ef4444]"]) {
      expect(html, bar).toContain(bar);
    }
    // قسم أدوات ميزان برو على سطح كحلي راقٍ (لا خلفية صفراء)
    expect(html).toContain("bg-[#0f172a] dark:bg-[#0b1220]");
    expect(html).not.toContain("bg-[#fffbeb]");
    // أيقونات الأدوات الستّ ليست بلون واحد
    for (const tone of ["bg-[#3b82f6]/15", "bg-[#10b981]/15", "bg-[#f59e0b]/15", "bg-[#ef4444]/15"]) {
      expect(html, tone).toContain(tone);
    }
  });

  it("لا تضع أي نقش أو رمز في الخلفية", () => {
    const container = renderHome();
    const html = container.innerHTML;
    expect(html).not.toContain("pattern-");
    // لا بيانات SVG مضمّنة في طبقات الخلفية (النقش السابق كان data:image/svg+xml)
    const inlineBackgrounds = [...container.querySelectorAll<HTMLElement>("[class]")].filter((el) =>
      (el.getAttribute("class") ?? "").includes("absolute"),
    );
    for (const layer of inlineBackgrounds) {
      expect(layer.className, layer.className).not.toMatch(/pattern|bg-\[url\(/);
    }
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
    expect(css).not.toContain("pattern-zellige");
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
    expect(prerender).toContain('class="rise');
    expect(prerender).toContain("accent-rule");
    expect(prerender).toContain("accent-rule-gold");
    expect(prerender).toContain("hover-lift");
    // قسم أدوات ميزان برو موجود في النسخة الثابتة أيضاً
    expect(prerender).toContain("ما هي أدوات ميزان برو الستّ؟");
    expect(prerender).toContain('href="/pro-tools"');
  });
});

describe("الصفحة الرئيسية — إيقاع المسافات", () => {
  it("تستعمل حاوية واحدة وعرضاً واحداً للنصوص", () => {
    const src = readFileSync("src/pages/public/HomePage.tsx", "utf8");
    const widths = [...src.matchAll(/max-w-\[(\d+)px\]/g)].map((m) => Number(m[1]));
    // المسموح: حاوية المحتوى 1200، مقاس النصّ 680، شبكة الأسعار 1060،
    // عمود «لماذا نحن» 1000، ومسطرة الزخرفة 220.
    const allowed = new Set([1200, 680, 1060, 1000, 220]);
    for (const width of widths) {
      expect(allowed.has(width), `عرض غير مسموح: ${width}px`).toBe(true);
    }
    expect(widths.filter((w) => w === 1200).length).toBeGreaterThanOrEqual(6);
    // لا عروض عشوائية من الجولات السابقة
    for (const stale of ["max-w-[1280px]", "max-w-[1120px]", "max-w-[900px]", "max-w-[640px]", "max-w-[620px]", "max-w-[600px]"]) {
      expect(src, stale).not.toContain(stale);
    }
  });

  it("تعطي الأقسام تنفّساً موحّداً ومتدرّجاً", () => {
    const src = readFileSync("src/pages/public/HomePage.tsx", "utf8");
    const paddings = [...src.matchAll(/<section[^>]*?py-(\d+)(?:\s+md:py-(\d+))?/g)].map((m) => [m[1], m[2]]);
    expect(paddings.length).toBeGreaterThanOrEqual(5);
    for (const [mobile, desktop] of paddings) {
      // لا تنفّس أقلّ من py-12 على الجوّال، والأقسام الكبيرة تزيد على الشاشة الكبيرة
      expect(Number(mobile), `py-${mobile}`).toBeGreaterThanOrEqual(12);
      if (desktop) expect(Number(desktop), `md:py-${desktop}`).toBeGreaterThan(Number(mobile));
    }
    // الأقسام الرئيسية تتنفّس 16→24، وشريط برو 14→20، وشريط الأرقام 12→16
    expect(src).toContain("py-16 md:py-24");
    expect(src).toContain("py-14 md:py-20");
    expect(src).toContain("py-12 md:py-16");
  });

  it("توحّد فواصل الشبكات ورؤوس الأقسام", () => {
    const src = readFileSync("src/pages/public/HomePage.tsx", "utf8");
    // كل شبكة بطاقات لها فاصل موسّع على الشاشة الكبيرة
    const cardGrids = [...src.matchAll(/grid[^"]*?gap-4 md:gap-6/g)];
    expect(cardGrids.length).toBeGreaterThanOrEqual(4);
    // رأس قسم بمسافة موحّدة تحته
    expect(src).toContain("mb-10 md:mb-14");
    expect(src).toContain("mt-3 text-[13px]");
    // المسافة بين الكتل داخل القسم واحدة
    expect(src).not.toContain('className="mt-12"');
  });

  it("تزامن النسخة الثابتة مع نفس الإيقاع", () => {
    const prerender = readFileSync("scripts/prerender.mjs", "utf8");
    expect(prerender).toContain("max-w-[1200px] px-6 py-14 md:py-20");
    expect(prerender).not.toContain("max-w-[1120px]");
    expect(prerender).not.toContain("max-w-[1120px]");
    // مقاسات النصوص الطويلة في الثابت من نفس السلّم (1000/680) —
    // ويُسمح بمرشّح 640px للشريط الختامي كنصّ مركزي قصير.
    for (const stale of ["max-w-[900px]", "max-w-[800px]", "max-w-[600px]"]) {
      expect(prerender, stale).not.toContain(stale);
    }
    expect(prerender).toContain("gap-12 lg:gap-14");
  });
});

describe("سيكولوجيا صفحة الهبوط", () => {
  it("تضع دعوة أساسية واحدة فقط في الترويسة تقود إلى الأرشيف", () => {
    const container = renderHome();
    const hero = container.querySelector("h1")?.closest("div")?.parentElement as HTMLElement;
    const ctaTexts = [...container.querySelectorAll("a")].map((a) => a.textContent?.trim() ?? "");
    expect(ctaTexts.some((label) => label.includes("ابدأ المراجعة — مجاناً"))).toBe(true);
    // الزرّ الأساسي يشير إلى الأرشيف (مهمّة الطالب الأولى)
    const primary = [...container.querySelectorAll("a")].find((a) =>
      (a.textContent ?? "").includes("ابدأ المراجعة"),
    );
    expect(primary?.getAttribute("href")).toBe("/archive");
    // الزرّ الثانوي يذكر الجهد المنخفض (٣ دقائق) بدل كلام عام
    expect(ctaTexts.some((label) => label.includes("قِس مستواك في ٣ دقائق"))).toBe(true);
    expect(hero).toBeTruthy();
  });

  it("تبني الثقة بحقائق قابلة للتحقّق بلا أرقام مُختلقة", () => {
    const container = renderHome();
    const text = container.textContent ?? "";
    for (const fact of ["محتوى أساسي مجاني", "بلا إعلانات", "مصادر رسمية محالة", "ملخصات S1-S6"]) {
      expect(text, fact).toContain(fact);
    }
    // دليل الثقة القديم (المُختلق) لا يعود
    for (const invented of ["500+", "4.9", "آلاف الطلبة", "الأكثر اختياراً", "الأكثر تحميلاً"]) {
      expect(text, invented).not.toContain(invented);
    }
  });

  it("تُقسّم البداية إلى ثلاث خطوات متتابعة قابلة للنقر", () => {
    const container = renderHome();
    const text = container.textContent ?? "";
    for (const step of ["افتح فصلك الدراسي", "راجع المصطلحات", "اختبر نفسك"]) {
      expect(text, step).toContain(step);
    }
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/archive");
    expect(hrefs).toContain("/lexicon");
    expect(hrefs).toContain("/quiz");
    // الاحتياط: بلا حساب، بلا إعلانات، وليست استشارة قانونية
    expect(text).toContain("بلا حساب للقراءة");
    expect(text).toContain("ليست استشارة قانونية");
  });

  it("تُنهي الصفحة بدعوة واحدة واضحة بعد الأسئلة الشائعة", () => {
    const container = renderHome();
    const text = container.textContent ?? "";
    expect(text).toContain("ابدأ من الفصل الذي تدرسه اليوم");
    expect(text).toContain("تصفّح الأرشيف الدراسي");
    // آخر رابط رئيسي في الصفحة يقود إلى الأرشيف
    const links = [...container.querySelectorAll("a")];
    const closing = links.filter((a) => (a.textContent ?? "").includes("تصفّح الأرشيف الدراسي"));
    expect(closing.length).toBeGreaterThanOrEqual(1);
    expect(closing[closing.length - 1]?.getAttribute("href")).toBe("/archive");
  });

  it("ترتّب المحتوى بالمهمّة الأهمّ أولاً (موضع الصدارة)", () => {
    const container = renderHome();
    const hero = container.querySelector("h1")?.closest("div")?.parentElement as HTMLElement;
    const firstQuickLink = hero?.querySelector("a[href='/archive']");
    expect(firstQuickLink).not.toBeNull();
    const quickHrefs = [...(hero?.querySelectorAll("a") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((href) => ["/archive", "/lexicon", "/articles", "/news"].includes(href ?? ""));
    expect(quickHrefs[0]).toBe("/archive");
  });

  it("تزامن النسخة الثابتة مع نفس عناصر السيكولوجيا", () => {
    const prerender = readFileSync("scripts/prerender.mjs", "utf8");
    expect(prerender).toContain("ابدأ المراجعة — مجاناً");
    expect(prerender).toContain('href="/archive"');
    expect(prerender).toContain("كيف تبدأ في ثلاث خطوات قبل الامتحان؟");
    expect(prerender).toContain("ابدأ من الفصل الذي تدرسه اليوم");
    expect(prerender).toContain("المحتوى الأساسي مجاني وبلا حساب");
    // لا أرقام مُختلقة في النسخة الثابتة
    for (const invented of ["500+", "4.9", "آلاف الطلبة"]) {
      expect(prerender, invented).not.toContain(invented);
    }
  });
});

describe("الصفحة الرئيسية — التدرّجات المهنية", () => {
  const css = () => readFileSync("src/styles/globals.css", "utf8");

  /** كل قاعدة في ملف الأنماط تحتوي تدرّجاً، مع اسم المُحدِّد. */
  function gradientRules() {
    return css()
      .split("}")
      .filter((block) => /gradient\(/.test(block))
      .map((block) => {
        const head = block.split("{")[0];
        const selector =
          head
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("."))
            .pop() ?? "";
        return { selector, block };
      });
  }

  it("تحصر كل تدرّج في طبقة grad-* ومساطر الأقسام، بألوان الهوية وحدها", () => {
    const rules = gradientRules();
    // الطبقة الحالية: grad-hero، grad-band، grad-accent، grad-card، grad-soft،
    // الزرّ الأساسي، وأربع مساطر أقسام (أزرق/ذهبي/أخضر/أحمر).
    expect(rules.length).toBeGreaterThanOrEqual(10);

    // ألوان مسموحة فقط: أزرق الهوية، المحايدات، الكحلي، وألوان المساطر.
    const allowed = new Set([
      "#2563eb", "#3b82f6", "#1d4ed8", "#1e40af", "#1e3a8a",
      "#ffffff", "#f8fafc", "#f1f5f9",
      "#0f172a", "#0b1220", "#101c33", "#1e293b", "#172033",
      "#b45309", "#047857", "#b91c1c",
    ]);
    const allowedRgb = [
      "rgb(37 99 235 /", // أزرق الهوية
      "rgb(180 83 9 /", "rgb(4 120 87 /", "rgb(185 28 28 /", // مساطر الأقسام
    ];

    for (const { selector, block } of rules) {
      expect(selector, `مُحدِّد خارج الطبقة: ${selector}`).toMatch(
        /^\.(?:dark\s+\.)?(?:grad-[\w-]+|btn-accent)(?::hover|:focus-visible)?$|^\.accent-rule(?:-\w+)?::after$/,
      );
      // تدرّج خطي/شعاعي فقط: لا مخروطي ولا متكرّر ولا ملفات صور
      expect(block, selector).not.toMatch(/conic-gradient|repeating-|url\(/);
      for (const hex of block.match(/#[0-9a-fA-F]{3,8}/g) ?? []) {
        expect(allowed.has(hex.toLowerCase()), `${selector}: ${hex}`).toBe(true);
      }
      for (const rgb of block.match(/rgba?\([^)]*\)/g) ?? []) {
        expect(
          allowedRgb.some((token) => rgb.replace(/\s+/g, " ").startsWith(token)),
          `${selector}: ${rgb}`,
        ).toBe(true);
      }
      // ولا ألوان خارج هوية ميزان بالاسم
      expect(block, selector).not.toMatch(/violet|fuchsia|purple|indigo|amber|orange|pink|teal/);
    }
  });

  it("تُبقي التدرّجات ساكنة: بلا حركة ولا نبض ولا نصّ متدرّج", () => {
    for (const { selector, block } of gradientRules()) {
      expect(block, selector).not.toMatch(/animation|transition/);
    }
    // وقاعدة عامة على كل الملف: لا نصّ مقصوص بتدرّج ولا حركة لا نهائية
    expect(css()).not.toMatch(/bg-clip-text|background-clip:\s*text/);
    expect(css()).not.toMatch(/animation-iteration-count:\s*infinite/);
  });

  it("تُعمّم الطبقة على الأسطح الرئيسية في الصفحة الحيّة والثابتة", () => {
    const src = readFileSync("src/pages/public/HomePage.tsx", "utf8");
    const prerender = readFileSync("scripts/prerender.mjs", "utf8");
    // الرأس والبطاقات والأزرار والشريط الكحلي والقسم الختامي
    for (const cls of ["grad-hero", "grad-card", "grad-soft", "grad-band", "btn-accent"]) {
      expect(src, `حيّ: ${cls}`).toContain(cls);
      expect(prerender, `ثابت: ${cls}`).toContain(cls);
    }
    // شريط الأرقام في الصفحة الحيّة فقط (لا نظير ثابت له)
    expect(src).toContain("grad-accent");
    // والطبقة كلها معرّفة في ملف الأنماط المُشترك لا في السطور
    for (const cls of ["grad-hero", "grad-band", "grad-accent", "grad-card", "grad-soft"]) {
      expect(css(), cls).toContain(`.${cls}`);
    }
    expect(css()).toContain(".dark .grad-hero");
  });

  it("لا تُدخل التدرّج إلى قسم الأسعار ولا إلى بطاقات الفواتير", () => {
    const src = readFileSync("src/pages/public/HomePage.tsx", "utf8");
    const pricing = src.slice(src.indexOf("الأسعار - خطط مرنة"), src.indexOf("لماذا نحن"));
    expect(pricing).not.toMatch(/grad-|btn-accent/);
    // والحرس المؤسسي القديم ما زال قائماً: لا أصناف تدرّج من Tailwind
    expect(src).not.toMatch(/bg-gradient-|bg-\[(radial|linear)-gradient/);
  });
});
