// اختبارات طبقة نصوص الميتا — العنوان والوصف وصفحات لا تُفهرس.
//
// جولة التدقيق الخارجية رأت «Non-canonical» على كل الموقع تقريباً لأن
// العناوين والأوصاف كانت تُبنى في أربع نسخ مختلفة (SEOHead، hook مهمل،
// prerender، ونسختان متطابقتان يدوياً من دالة الوصف). الاختبارات هنا تقفل
// الفصلَين اللذين مكّنا ذلك: مصدر واحد للنص، ولا عنوان أو وصف مكرر.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  BRAND,
  BRAND_SUFFIX,
  DESC_TAIL,
  HARD_MAX_TITLE,
  MAX_DESC,
  MAX_TITLE,
  MIN_DESC,
  UTILITY_ROUTES,
  abbreviateFaculty,
  buildMetaDescription,
  fitTitle,
  joinClauses,
  utilityMeta,
} from "../shared/seo/meta-copy.js";
import {
  buildMetaDescription as fromScriptsLib,
} from "../scripts/lib/meta-description.mjs";
import {
  buildMetaDescription as fromAppFacade,
} from "../src/lib/seo/description";
import { checkMetadataUniqueness, extractHeadMeta } from "../shared/seo/technical-checks.js";
import { isIndexablePath } from "../src/lib/canonical";

describe("fitTitle — هدف 60 وسقف 65 بلا بتر للاسم", () => {
  test("العنوان القصير يأخذ العلامة، والطويل يُسقطها بدل أن يُبتَر", () => {
    expect(fitTitle("الملف الشخصي")).toBe(`الملف الشخصي${BRAND_SUFFIX}`);
    const long =
      "كلية العلوم القانونية والاقتصادية والاجتماعية عين الشق الدار البيضاء | كليات الحقوق بالمغرب";
    const out = fitTitle(long);
    expect(out.length).toBeLessThanOrEqual(HARD_MAX_TITLE);
    expect(out.includes("البيضاء") || out.includes("عين الشق")).toBe(true);
  });

  test("لا عنوان يتجاوز السقف، والنتيجة ثابتة عند إعادة التطبيق", () => {
    const samples = [
      "احترام قانون السير بالمغرب: الإطار القانوني والمسؤولية المدنية والجزائية بالتفصيل",
      "الحماية القانونية للأجراء في ضوء أحكام القانون رقم 65.99 المتعلق بمدونة الشغل",
      "اختبارات المباريات المهنية — الأمن الوطني والقضاء والوظيفة العمومية",
      "تعرض الغير الخارج عن الخصومة في القانون المغربي | الميزان الرقمية",
    ];
    for (const sample of samples) {
      const once = fitTitle(sample);
      expect(once.length, sample).toBeLessThanOrEqual(HARD_MAX_TITLE);
      expect(fitTitle(once)).toBe(once);
    }
  });

  test("التفصيل بعد النقطتين يُحذف أولاً: المقدمة هي الكلمة المفتاحية", () => {
    const out = fitTitle(
      "منهجية قراءة النص القانوني: من الفهم الأول إلى التحليل المعمق لكل العناصر",
      { max: 40, hardMax: 50 }
    );
    expect(out).toBe("منهجية قراءة النص القانوني");
  });

  test("عنوان فارغ لا يُولّد وسماً فارغاً", () => {
    expect(fitTitle("")).toBe(BRAND);
    expect(fitTitle("   ")).toBe(BRAND);
  });

  test("اختصار اسم الكلية يستعمل عند تجاوز الهدف", () => {
    const full = "كلية العلوم القانونية والاقتصادية والاجتماعية بأكادير";
    expect(abbreviateFaculty(full)).toBe("كلية الحقوق بأكادير");
    expect(abbreviateFaculty("كلية الآداب والعلوم الإنسانية")).toBe("كلية الآداب والعلوم الإنسانية");
    expect(fitTitle(`${abbreviateFaculty(full)} | دليل الطالب`).length).toBeLessThanOrEqual(MAX_TITLE);
  });
});

describe("buildMetaDescription — 140 إلى 160 دون بتر نصّ الصفحة", () => {
  test("الوصف القصير يُكمَل بالسياق ثم بالعبارة الختامية", () => {
    const out = buildMetaDescription("تعريف التقادم في القانون المغربي: انقضاء الالتزام بمضي المدة.", [
      "قاموس المصطلحات القانونية بالعربية والفرنسية.",
    ]);
    expect(out.length).toBeGreaterThanOrEqual(MIN_DESC);
    expect(out.length).toBeLessThanOrEqual(MAX_DESC);
  });

  test("الوصف الطويل يبقى كما هو (بلا حشو) ومُبتَّر عند السقف فقط", () => {
    const long = "نص ".repeat(120);
    const out = buildMetaDescription(long, []);
    expect(out.length).toBeLessThanOrEqual(MAX_DESC);
  });

  test("لا شرطة بعد نقطة: «…بالمغرب. — وهذه…» كانت تُقرأ جملة مكسورة", () => {
    const out = joinClauses("ملف من أرشيف المنصة.", "متاح للتحميل المجاني.");
    expect(out).toBe("ملف من أرشيف المنصة. متاح للتحميل المجاني.");
    expect(joinClauses("ملف من أرشيف المنصة", "متاح للتحميل")).toContain(" — ");
  });

  test("المصدر واحد: façade التطبيق façade السكربت والدالة المشتركة واحدة", () => {
    expect(fromScriptsLib).toBe(buildMetaDescription);
    expect(fromAppFacade).toBe(buildMetaDescription);
  });

  test("العبارة الختامية لا تُضاف حين لا يتّسع المقام", () => {
    const base = "وصف قصير";
    const out = buildMetaDescription(base, []);
    expect(out.length).toBeLessThanOrEqual(MAX_DESC);
    expect(out.startsWith(base)).toBe(true);
    expect(DESC_TAIL.length).toBeGreaterThan(10);
  });
});

describe("مسارات المنفعة: لا نصّ مكرراً ولا فهرسة", () => {
  const routes = Object.keys(UTILITY_ROUTES);

  test("لكل مسار عنوانه ووصفه الخاصان", () => {
    const titles = routes.map((r) => UTILITY_ROUTES[r].title);
    const descriptions = routes.map((r) => UTILITY_ROUTES[r].description);
    expect(new Set(titles).size).toBe(routes.length);
    expect(new Set(descriptions).size).toBe(routes.length);
  });

  test("العناوين داخل السقف والأوصاف داخل 140-160", () => {
    for (const route of routes) {
      const { title, description } = UTILITY_ROUTES[route];
      expect(title.length, `${route} title`).toBeLessThanOrEqual(HARD_MAX_TITLE);
      expect(description.length, `${route} description`).toBeGreaterThanOrEqual(MIN_DESC);
      expect(description.length, `${route} description`).toBeLessThanOrEqual(MAX_DESC);
    }
  });

  test("كل مسار منفعة خارج الفهرسة في السياسة نفسها", () => {
    for (const route of routes) {
      expect(isIndexablePath(route), route).toBe(false);
      expect(utilityMeta(route)?.noindex, route).toBe(true);
    }
  });

  test("المسار المفهرس لا يأخذ نصّ منفعة، وغير المعروف يبقى noindex", () => {
    expect(utilityMeta("/lexicon")).toBeNull();
    expect(utilityMeta("/schools/fsjes-tangier")).toBeNull();

    const unknown = utilityMeta("/admin/users");
    expect(unknown?.noindex).toBe(true);
    expect((unknown?.description || "").length).toBeGreaterThanOrEqual(MIN_DESC);
  });

  test("كل هيكل مسجَّل في prerender له نصّ خاص به في السياسة", () => {
    const source = readFileSync(new URL("../scripts/prerender.mjs", import.meta.url), "utf8");
    const list = /const APP_SHELL_ROUTES = \[([\s\S]*?)\];/.exec(source)?.[1] || "";
    const routes = [...list.matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]);

    expect(routes.length).toBeGreaterThanOrEqual(10);
    for (const route of routes) {
      expect(UTILITY_ROUTES[route], `${route} بلا نصّ خاص`).toBeTruthy();
      expect(isIndexablePath(route), route).toBe(false);
    }
  });

  test("pricing وapp و404 وguidelines غير مفهرسَة (طلب جولة الميتا)", () => {
    expect(isIndexablePath("/pricing")).toBe(false);
    expect(isIndexablePath("/guidelines")).toBe(false);
    expect(isIndexablePath("/app")).toBe(false);
    expect(isIndexablePath("/404")).toBe(false);
    expect(isIndexablePath("/schools")).toBe(true);
  });
});

describe("بوابة تكرار النصوص (checkMetadataUniqueness)", () => {
  // أوصاف الاختبار يجب أن تكون داخل النطاق (120-165) وإلا فشل الفحص للسبب
  // الخطأ؛ نولّدها بطول ثابت ومتميّز لكل صفحة.
  const filler = "بطول كافٍ للفحص التقني الذي يرفض الوصف القصير في هذا الباب من التدقيق، ";
  const desc = (seed: string) => `${seed} ${filler.repeat(3)}`.slice(0, 145);

  const page = (path: string, title: string, description: string, noindex = false) => ({
    path,
    title,
    description,
    noindex,
  });

  test("عنوان أو وصف مكرر يُفشل البوابة ويسمّي الصفحتين", () => {
    const shared = desc("وصف مكرر على صفحتين");
    const pages = [
      page("/a", "عنوان مكرر", shared),
      page("/b", "عنوان مكرر", shared),
    ];
    const result = checkMetadataUniqueness(pages);

    expect(result.pass).toBe(false);
    expect(result.issues.join(" ")).toContain("عنوان مكرر على 2 صفحات");
    expect(result.issues.join(" ")).toContain("وصف مكرر على 2 صفحات");
  });

  test("نصوص متميّزة تمرّ ولو كان بعضها على صفحات noindex", () => {
    const result = checkMetadataUniqueness([
      page("/a", "صفحة أولى في المنصة القانونية", desc("وصف أول")),
      page("/b", "صفحة ثانية في المنصة القانونية", desc("وصف ثانٍ")),
      page("/login", "تسجيل الدخول إلى حسابك", desc("وصف ثالث"), true),
    ]);
    expect(result.pass).toBe(true);
  });

  test("العناوين فوق السقف تُحسب، وما تحت الهدف تفصيلٌ لا عيب", () => {
    const longTitle = "عنوان طويل جداً ".repeat(6).trim();
    const result = checkMetadataUniqueness([page("/a", longTitle, desc("وصف"))]);
    expect(result.issues.join(" ")).toContain("فوق");

    const midTitle = "عنوان في السقف ولا يبلغ الهدف المقترح".repeat(2).trim().slice(0, 62);
    const ok = checkMetadataUniqueness([page("/b", midTitle, desc("وصف آخر"))]);
    expect(ok.issues).toHaveLength(0);
    expect(ok.details.join(" ")).toContain("فوق الهدف");
  });

  test("extractHeadMeta يقرأ العنوان والوصف وnoindex من نفس المصدر", () => {
    const html = `<html><head><title> عنوان </title>
      <meta name="description" content=" وصف ">
      <meta name="robots" content="noindex, follow">
      </head></html>`;
    expect(extractHeadMeta(html)).toEqual({ title: "عنوان", description: "وصف", noindex: true });
  });

  test("رأس index.html المصدري داخل النطاق المستهدف", () => {
    const head = extractHeadMeta(readFileSync(new URL("../index.html", import.meta.url), "utf8"));
    const description = String(head.description ?? "");
    expect(head.title.length).toBeLessThanOrEqual(HARD_MAX_TITLE);
    expect(description.length).toBeGreaterThanOrEqual(MIN_DESC);
    expect(description.length).toBeLessThanOrEqual(MAX_DESC);
  });
});
