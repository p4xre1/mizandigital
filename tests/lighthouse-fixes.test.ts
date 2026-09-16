// اختبارات انحدار (regression) للإصلاحات المبنية على تقرير Lighthouse
// للصفحة الرئيسية (أداء 42 / إمكانية وصول 91 / تصفّح الوكلاء 0 من 3).
//
// كل اختبار هنا يثبّت سبباً محدداً من التقرير حتى لا يعود:
//   • llms.txt بلا روابط Markdown        → فشل تدقيق llms-txt
//   • روابط التواصل بلا اسم مميز         → فشل link-name + شجرة تسهيل الاستخدام
//   • تباين 3.75:1 في تذييل الصفحة       → فشل color-contrast
//   • قفزة h1 ← h3                       → فشل heading-order
//   • طلب ملف CSS للخطوط + تبديل السمة   → CLS و«حركات غير مركّبة»
//   • preload-helper داخل chunk ضخم      → 467KB جافاسكربت غير مستعمل

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildLlmsTxt } from "../scripts/lib/llms-content.mjs";

const read = (file: string) =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const indexHtml = read("index.html");
const fontsCss = read("src/styles/fonts.css");
const publicNav = read("src/layouts/PublicNavigation.tsx");
const homePage = read("src/pages/public/HomePage.tsx");
const viteConfig = read("vite.config.ts");

/* ──────────────────────────────────────────────────────────────────────────
   1) llms.txt — «يبدو أنّ الملف لا يحتوي على أي روابط»
────────────────────────────────────────────────────────────────────────── */

const llms = buildLlmsTxt({
  domain: "https://www.mizan.page",
  generatedAt: "2026-09-16T00:00:00.000Z",
  statistics: { articles: 8, news: 13, events: 3, schools: 21, lexicon: 250, documents: 9 },
  totalContent: 304,
  legalDomains: ["قانون مدني", "قانون تجاري"],
  articleCategories: ["القانون المدني"],
  faqTopics: ["عام حول المنصة"],
  schoolCities: ["الرباط", "فاس"],
}) as string;

describe("llms.txt يتبع مواصفة llmstxt.org (تدقيق Lighthouse llms-txt)", () => {
  test("يحتوي عنوان H1 واحداً بالضبط", () => {
    const h1 = llms.match(/^# .+$/gm) ?? [];
    expect(h1).toHaveLength(1);
  });

  test("يحتوي روابط Markdown فعلية — سبب فشل التدقيق سابقاً", () => {
    const links = llms.match(/\[[^\]]+\]\(https?:\/\/[^)\s]+\)/g) ?? [];
    // التدقيق يكتفي برابط واحد؛ نثبت أن الملف وصف حقيقي لا قائمة عناوين مجردة.
    expect(links.length).toBeGreaterThan(20);
  });

  test("يستعمل قوائم بنقط لا مسافات بادئة بأسلوب YAML", () => {
    // النمط القديم كان "start_urls:\n- https://…" — سطر مفتاح متبوع بعناوين
    // مجرّدة. أي سطر يبدأ بـ "- http" بلا صيغة رابط Markdown يعيد الخطأ.
    const bareUrls = llms.match(/^\s*-\s+https?:\/\/\S+\s*$/gm) ?? [];
    expect(bareUrls).toHaveLength(0);
  });

  test("يبدأ بوصف في اقتباس ويختم بقسم Optional", () => {
    expect(llms).toMatch(/^# .+\n\n> /);
    expect(llms).toContain("\n## Optional\n");
  });

  test("لا يترك قيماً فارغة من البيانات الممرَّرة", () => {
    expect(llms).toContain("250");
    expect(llms).toContain("قانون مدني");
    expect(llms).toContain("الرباط");
    expect(llms).not.toContain("undefined");
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   2) الخطوط — جولة شبكة إضافية ثم استبدال الخط (CLS)
────────────────────────────────────────────────────────────────────────── */

describe("تحميل خط Cairo", () => {
  test("لم يعد يُطلب ملف CSS من fonts.googleapis.com", () => {
    expect(indexHtml).not.toContain("fonts.googleapis.com/css2");
    expect(indexHtml).not.toContain('rel="preconnect" href="https://fonts.googleapis.com"');
  });

  test("يُحمَّل ملفا woff2 (العربي واللاتيني) مسبقاً", () => {
    const preloads = indexHtml.match(/<link rel="preload" as="font"[^>]*>/g) ?? [];
    expect(preloads).toHaveLength(2);
    for (const tag of preloads) {
      expect(tag).toContain('type="font/woff2"');
      expect(tag).toContain("crossorigin");
      expect(tag).toContain("https://fonts.gstatic.com/");
    }
  });

  test("@font-face مضمّن محلياً لكل الأوزان المستعملة مع font-display: swap", () => {
    const faces = fontsCss.match(/@font-face \{[^}]*\}/g) ?? [];
    expect(faces.length).toBeGreaterThanOrEqual(8);
    for (const face of faces) {
      expect(face).toContain('font-family: "Cairo"');
      expect(face).toContain("font-display: swap");
      expect(face).toContain("fonts.gstatic.com");
    }
    for (const weight of [400, 700, 800, 900]) {
      expect(fontsCss).toContain(`font-weight: ${weight};`);
    }
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   3) وميض داكن→فاتح بعد mount (49 حركة غير مركّبة في التقرير)
────────────────────────────────────────────────────────────────────────── */

describe("تطبيق السمة قبل أول رسم", () => {
  test("سكربت السمة موجود ويقرأ mizan_theme ثم prefers-color-scheme", () => {
    expect(indexHtml).toContain('localStorage.getItem("mizan_theme")');
    expect(indexHtml).toContain("(prefers-color-scheme: dark)");
    expect(indexHtml).toContain("root.style.colorScheme = theme");
  });

  test("يُنفَّذ داخل <head> وقبل تحميل تطبيق React", () => {
    const scriptAt = indexHtml.indexOf('localStorage.getItem("mizan_theme")');
    const appScriptAt = indexHtml.indexOf("/src/main.tsx");
    expect(scriptAt).toBeGreaterThan(-1);
    expect(appScriptAt).toBeGreaterThan(-1);
    expect(scriptAt).toBeLessThan(indexHtml.indexOf("</head>"));
    expect(scriptAt).toBeLessThan(appScriptAt);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   4) link-name — «عدم احتواء الروابط على اسم مميّز»
────────────────────────────────────────────────────────────────────────── */

describe("روابط التواصل في التذييل", () => {
  const socialTags =
    publicNav.match(/<a href="https:\/\/www\.(?:instagram|facebook|tiktok|pinterest)\.com[^>]*>/g) ?? [];

  test("الأربعة موجودة", () => {
    expect(socialTags).toHaveLength(4);
  });

  test("لكل رابط اسم مميز عبر aria-label", () => {
    for (const tag of socialTags) {
      expect(tag).toMatch(/aria-label="[^"]+"/);
    }
  });

  test("الأسماء مختلفة حتى لا تتطابق الروابط في شجرة تسهيل الاستخدام", () => {
    const labels = socialTags.map((tag) => /aria-label="([^"]+)"/.exec(tag)?.[1]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("أيقونات SVG مزخرفة مخفية عن قارئ الشاشة", () => {
    expect(publicNav).toContain('<Instagram size={16} aria-hidden="true" />');
    expect(publicNav).toContain('<Facebook size={16} aria-hidden="true" />');
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   5) color-contrast — 3.75:1 على خلفية #0f172a
────────────────────────────────────────────────────────────────────────── */

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

const contrast = (a: string, b: string) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

describe("تباين نص التذييل على الخلفية الداكنة #0f172a", () => {
  const footer = publicNav.slice(publicNav.indexOf("export function Footer()"));
  const bottomBar = footer.slice(footer.indexOf("border-t border-white/10"));

  test("شريط الحقوق لا يستعمل #64748b (كان 3.75:1 — تحت حد AA)", () => {
    expect(bottomBar).not.toContain("text-[#64748b]");
  });

  test("كل لون نص مستعمل في التذييل يتجاوز 4.5:1", () => {
    const colors = new Set(
      (footer.match(/text-\[(#[0-9a-fA-F]{6})\]/g) ?? []).map((c) => `#${c.slice(7, 13)}`)
    );
    expect(colors.size).toBeGreaterThan(0);
    for (const color of colors) {
      expect(contrast(color, "#0f172a"), `${color} on #0f172a`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("تباين نص البطاقات في الوضع الفاتح", () => {
  test("لا يوجد نص #94a3b8 على خلفية فاتحة بلا بديل للوضع الفاتح", () => {
    // #94a3b8 على أبيض = 2.56:1. المقبول فقط داخل dark: أو على خلفية داكنة.
    const offenders = homePage.match(/(?<!dark:)text-\[#94a3b8\]/g) ?? [];
    expect(offenders).toHaveLength(0);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   6) heading-order — «العناصر المُعنوَنة غير مرتبة بشكل تنازلي متسلسل»
────────────────────────────────────────────────────────────────────────── */

describe("تسلسل العناوين في الصفحة الرئيسية", () => {
  const levels = [...homePage.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));

  test("يوجد h1 واحد ويبدأ به التسلسل", () => {
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
  });

  test("لا توجد قفزة مستوى (h1 ← h3 مثلاً)", () => {
    for (let i = 1; i < levels.length; i += 1) {
      expect(
        levels[i],
        `h${levels[i - 1]} ← h${levels[i]} at occurrence #${i + 1}`
      ).toBeLessThanOrEqual(levels[i - 1] + 1);
    }
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   7) تقسيم الحزم — 467KB جافاسكربت غير مستعمل على أول زيارة
────────────────────────────────────────────────────────────────────────── */

describe("تقسيم حزم البناء", () => {
  test("vite/preload-helper معزول في مجموعة مستقلة بأعلى أولوية", () => {
    expect(viteConfig).toContain("advancedChunks");
    expect(viteConfig).toMatch(/name:\s*"preload-helper",\s*test:\s*\/vite\\\/preload-helper\/,\s*priority:\s*100/);
  });

  test("لم يعد manualChunks مستعملاً (كان يسبب دمج المساعد في chunk ضخم)", () => {
    expect(viteConfig).not.toMatch(/^\s*manualChunks\s*\(/m);
  });

  test("المكتبات الثقيلة المؤجَّلة لها مجموعاتها الخاصة", () => {
    for (const group of ["vendor-supabase", "vendor-clerk", "vendor-pdfjs", "vendor-react"]) {
      expect(viteConfig).toContain(`name: "${group}"`);
    }
  });
});
