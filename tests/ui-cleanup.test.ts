import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : /\.(tsx?|jsx?|json)$/.test(path) ? [path] : [];
  });
}

describe("clean UI presentation", () => {
  it("keeps UI copy free of bullet separators without changing password masking", () => {
    for (const path of ["src/pages", "src/components", "src/layouts", "src/data", "src/content", "shared/i18n"].flatMap(filesIn)) {
      const copy = read(path).split("\n")
        .filter((line) => !/^\s*(\*|\/\/)/.test(line))
        .join("\n").replace('placeholder="••••••••"', "");
      expect(copy, path).not.toMatch(/[•·⚫◼▪]|&(?:bull|middot);|&#(?:8226|183);/);
    }
    expect(read("src/pages/auth/LoginPage.tsx")).toContain('placeholder="••••••••"');
  });

  it("does not wrap page-header labels in a pill", () => {
    const labels = [
      ["src/pages/public/LexiconPage.tsx", "المعجم الموحد للمصطلحات - {terms.length} مصطلح قانوني"],
      ["src/pages/public/ArchivePage.tsx", "المرفق الأكاديمي الموحد"],
      ["src/pages/public/EventsPage.tsx", "الأجندة الأكاديمية الموحدة"],
    ] as const;
    for (const [path, text] of labels) {
      const src = read(path);
      // الشارة الدائرية حول عنوان الصفحة تزول، والنصّ يبقى في مكانه
      expect(src, path).not.toContain("rounded-full bg-primary/10");
      expect(src, path).toContain(text);
    }
  });

  it("does not wrap page counters in a pill", () => {
    const counters = [
      ["src/pages/public/ArticlesPage.tsx", "{filteredItems.length} مقال"],
      ["src/pages/public/NewsPage.tsx", "{filteredItems.length} خبر"],
      ["src/pages/public/SchoolsPage.tsx", "{allSchools.length} كلية - {cities.length} مدينة"],
    ] as const;
    for (const [path, text] of counters) {
      const src = read(path);
      // الشارة الدائرية تزول والأيقونة معها، والنصّ وحده يبقى
      expect(src, path).not.toContain("rounded-full bg-[#eff6ff]");
      expect(src, path).toContain(text);
    }
    // وعلامة قسم الأسعار في الرئيسية صارت بنفس نمط بقية علامات الأقسام
    const home = read("src/pages/public/HomePage.tsx");
    expect(home).toContain('<SectionLabel step="٠٥" tone="blue">الأسعار - خطط مرنة</SectionLabel>');
  });

  it("does not wrap the FAQ heading in a pill or a circle icon", () => {
    const homeFaq = read("src/components/home/HomeFaqSection.tsx");
    const faqPage = read("src/pages/public/FAQPage.tsx");
    // كلاهما بلا أيقونة دائرية وبلا شارة دائرية حول العنوان
    for (const [path, src] of [
      ["HomeFaqSection", homeFaq],
      ["FAQPage", faqPage],
    ] as const) {
      expect(src, path).not.toContain("HelpCircle");
      // شارة العنوان (خلفية وحدّ بلون الهوية) لا تعود — مع بقاء أزرار
      // الأسئلة على شكلها الحبّي المعتاد في الموقع.
      expect(src, path).not.toMatch(/rounded-full bg-primary\/10/);
      expect(src, path).not.toMatch(/border-primary\/20/);
    }
    // والنصّ باقٍ في الموضعين
    expect(homeFaq).toContain("الأسئلة الشائعة");
    expect(homeFaq).toContain('id="home-faq-heading"');
    expect(faqPage).toContain(">الأسئلة الشائعة</h1>");
    expect(faqPage).toContain("تجمع هذه الصفحة أكثر الأسئلة");
  });

  it("does not put a «best value» badge on any plan card", () => {
    for (const path of ["src/pages/public", "src/components"].flatMap(filesIn)) {
      expect(read(path), path).not.toContain("الأفضل قيمة");
    }
    const home = read("src/pages/public/HomePage.tsx");
    const pricing = home.slice(home.indexOf("الأسعار - خطط مرنة"), home.indexOf("لماذا نحن"));
    // بلا شارة ترويجية على بطاقة الخطة
    expect(pricing).not.toContain("rounded-full border border-border bg-muted");
    // ويزول معها الإزاحة التي كانت تُفسح لها، فيبقى رأس البطاقتين على محاذاة واحدة
    expect(pricing).not.toContain("gap-3 mt-1");
    expect(pricing.split('className="flex items-center gap-3"').length - 1).toBeGreaterThanOrEqual(2);
  });

  it("does not decorate sign-up with an AI sparkle or powered-by-AI label", () => {
    const login = read("src/pages/auth/LoginPage.tsx");
    expect(login).not.toMatch(/Sparkles|powered\s+by\s+AI/i);
    expect(login).toContain("إنشاء الحساب والبروفايل");
  });

  it("uses solid backgrounds and standard borders on pricing cards", () => {
    for (const path of [
      "src/components/billing/MizanProCard.tsx",
      "src/components/billing/ProUpgradeCard.tsx",
      "src/components/payments/PackageCard.tsx",
    ]) {
      const card = read(path);
      expect(card, path).toContain("border border-border bg-card");
      expect(card, path).not.toMatch(/gradient|shadow|ring-2|animate-|glow/);
    }
    const home = read("src/pages/public/HomePage.tsx");
    const pricing = home.slice(home.indexOf("الأسعار - خطط مرنة"), home.indexOf("لماذا نحن"));
    expect(pricing).not.toMatch(/gradient|shadow|animate-|glow|md:-mt-/);
    expect(pricing).toContain('text-foreground">سنوي');
    expect(read("src/pages/public/PaymentsPage.tsx")).not.toContain("bg-gradient");
  });
});

/**
 * المظهر المؤسسي على الموقع العام.
 *
 * الجولة السابقة منعت الشرائط اللونية في بطاقات الأسعار فقط، وكانت بقية
 * الصفحات تحمل ملامح القالب: تدرّجات بنفسجية، وهالات ضبابية، وظلال ملوّنة،
 * ونقاط نابضة لا نهائية، وأيقونات «Sparkles» التي صارت علامة على واجهات
 * الذكاء الاصطناعي. هذه القواعد تمنع رجوعها.
 *
 * المستثنى الوحيد: تدرّجات تعتيم الصور (`from-black/…`) لأنها شرط قراءة
 * النص الأبيض فوق صورة، وسكيلتون التحميل (`animate-pulse` مع خلفية محايدة)
 * ومؤشّرات الدوران (`animate-spin`).
 */
const SURFACE_DIRS = ["src/pages/public", "src/layouts", "src/components"];
const surfaceFiles = SURFACE_DIRS.flatMap(filesIn).filter((path) => !path.includes("/admin/"));

function codeLines(path: string): string[] {
  return read(path)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !/^(\*|\/\/|\{\/\*)/.test(line));
}

describe("institutional look on the public site", () => {
  it("does not use gradients except image legibility scrims", () => {
    for (const path of surfaceFiles) {
      for (const line of codeLines(path)) {
        if (!/bg-(gradient|\[(radial|linear)-gradient)/.test(line)) continue;
        expect(line, `${path}: ${line.slice(0, 90)}`).toContain("from-black/");
      }
    }
  });

  it("keeps one accent colour — no violet/fuchsia/purple/indigo classes", () => {
    for (const path of surfaceFiles) {
      const copy = codeLines(path).join("\n");
      expect(copy, path).not.toMatch(/\b(?:from|to|via|bg|text|border|ring)-(?:violet|fuchsia|purple|indigo)-/);
    }
  });

  it("does not use glow shadows, glass blur, or clipped gradient text", () => {
    for (const path of surfaceFiles) {
      const copy = codeLines(path).join("\n");
      expect(copy, path).not.toMatch(/shadow-\[/);
      expect(copy, path).not.toMatch(/backdrop-blur/);
      expect(copy, path).not.toMatch(/bg-clip-text/);
    }
  });

  it("does not ship AI-style iconography (Sparkles / magic wand)", () => {
    for (const path of surfaceFiles) {
      expect(codeLines(path).join("\n"), path).not.toMatch(/Sparkles|Wand2/);
    }
  });

  it("keeps looping animation for loading states only", () => {
    for (const path of surfaceFiles) {
      const lines = codeLines(path);
      lines.forEach((line, index) => {
        expect(line, `${path}: ${line.slice(0, 90)}`).not.toMatch(/animate-(?:bounce|ping|float)\b/);
        // مسموح: كشف أحادي عند الظهور (fadeUp/fadeIn) — ممنوع: أي حركة أخرى بالاسم.
        if (/animate-\[/.test(line)) {
          expect(line, `${path}: ${line.slice(0, 90)}`).toMatch(/animate-\[fade(?:Up|In)/);
        }
        if (!/animate-pulse/.test(line)) return;
        // نبض التحميل مسموح إذا كان السطر أو جواره سكيلتوناً بخلفية محايدة.
        const window = lines.slice(Math.max(0, index - 8), index + 9).join("\n");
        expect(window, `${path}: ${line.slice(0, 90)}`).toMatch(/bg-muted|bg-\[#f1f5f9\]/);
      });
    }
  });

  it("does not use emoji as interface decoration", () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2728}\u{26A1}\u{2B50}\u{2705}\u{274C}\u{2757}\u{2764}]/u;
    for (const path of surfaceFiles) {
      expect(emoji.test(read(path)), path).toBe(false);
    }
  });

  it("makes no AI claim anywhere in the shared meta copy", () => {
    const copy = read("shared/seo/meta-copy.js");
    expect(copy).not.toContain("الذكاء الاصطناعي");
    expect(copy).not.toMatch(/GPT|ChatGPT|LLM/);
  });

  it("keeps the homepage hero free of template filler and invented proof", () => {
    const home = read("src/pages/public/HomePage.tsx");
    expect(home).not.toContain("Online Learning");
    expect(home).not.toContain("500+");
    expect(home).not.toContain("طالب مستفيد");
    expect(home).not.toMatch(/4\.9/);
    expect(home).not.toMatch(/blur-\[/);
    expect(home).toContain("المعرفة القانونية لطلبة الحقوق في المغرب");
  });

  it("keeps the prerendered hero on the same rules", () => {
    const prerender = read("scripts/prerender.mjs");
    expect(prerender).not.toContain("Online Learning");
    expect(prerender).not.toContain("500+");
    expect(prerender).not.toMatch(/4\.9/);
    expect(prerender).not.toMatch(/blur-\[/);
    expect(prerender).not.toContain("انطلق في رحلة");
    expect(prerender).toContain("المعرفة القانونية لطلبة الحقوق في المغرب");
  });

  it("ships no AI claim in the built pages", () => {
    const built = [
      "dist/index.html",
      "dist/pricing.html",
      "dist/pro-tools.html",
      "dist/payments.html",
      "dist/about.html",
      "dist/faq.html",
      "dist/platform.html",
    ].filter(existsSync);
    for (const path of built) {
      expect(read(path), path).not.toContain("الذكاء الاصطناعي");
    }
  });
});
