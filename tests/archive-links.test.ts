/**
 * اختبارات «الروابط الفارغة في الأرشيف» و«القوانين أولاً».
 *
 * القواعد التي تحميها هذه الاختبارات:
 *   1) اسم حقل الرابط يختلف بحسب المصدر (fileUrl / file_url / pdf_url)،
 *      ولا يجوز أن يُقرأ حقل واحد فقط — وإلا ظهرت بطاقات برابط فارغ.
 *   2) الرابط الفارغ أو "#" ليس رابطاً: لا بطاقة في الأرشيف، ولا رابط في
 *      خريطة الموقع لصفحة تحميل بلا ملف.
 *   3) نصّ قانوني بلا ملف يبقى منشوراً بحكم نصّه (صفحته تُقرأ)، بخلاف
 *      الملخص الذي لا محتوى له سوى الملف.
 *   4) النصوص القانونية تُعرض قبل الملخصات.
 *   5) سجلّ لوحة تحكم بلا slug لا يُخفى من الخريطة: يُبنى معرّفه من العنوان.
 *   6) تعطّل جدول واحد في القاعدة لا يُفرغ الجداول الأخرى.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { archiveRank, downloadLinkOf, hasDownloadLink, hasReadableText, isArchivableItem } from "../shared/archive/links.js";
import { fetchPublishedCmsContent, hasPublishableIdentity } from "../scripts/lib/cms-content.mjs";

describe("رابط التحميل من أي مصدر", () => {
  it("يقرأ الحقول الثلاثة (fileUrl / file_url / pdf_url)", () => {
    expect(downloadLinkOf({ fileUrl: "/docs/a.pdf" })).toBe("/docs/a.pdf");
    expect(downloadLinkOf({ file_url: "https://media.mizan.page/a.pdf" })).toBe("https://media.mizan.page/a.pdf");
    expect(downloadLinkOf({ pdf_url: "https://sgg.gov.ma/bo.pdf" })).toBe("https://sgg.gov.ma/bo.pdf");
  });

  it("الرابط الفارغ و # و null ليسوا روابط", () => {
    for (const value of ["", "   ", "#", null, undefined]) {
      expect(hasDownloadLink(value), String(value)).toBe(false);
      expect(downloadLinkOf({ file_url: value }), String(value)).toBe("");
    }
    expect(downloadLinkOf(null)).toBe("");
    expect(downloadLinkOf({})).toBe("");
  });
});

describe("سجلّ يستحقّ النشر", () => {
  it("ملف موجود ⇒ منشور", () => {
    expect(isArchivableItem({ title: "ملخص", file_url: "https://x/a.pdf" })).toBe(true);
  });

  it("نصّ قانوني بلا ملف ⇒ منشور بحكم نصّه", () => {
    expect(isArchivableItem({ title: "قانون", pdf_url: null, content: "المادة الأولى: …" })).toBe(true);
  });

  it("ملخص بلا ملف ولا نصّ ⇒ لا يُنشر (رابط ميت)", () => {
    expect(isArchivableItem({ title: "ملخص بلا ملف", file_url: "" })).toBe(false);
    expect(isArchivableItem({ title: "ملخص بلا ملف", file_url: "#" })).toBe(false);
  });

  it("hasReadableText يقرأ النصّ والوصف", () => {
    expect(hasReadableText({ content: "نصّ" })).toBe(true);
    expect(hasReadableText({ description: "وصف" })).toBe(true);
    expect(hasReadableText({ content: "   " })).toBe(false);
  });
});

describe("ترتيب الأرشيف: القوانين أولاً", () => {
  it("النصوص القانونية قبل الملخصات", () => {
    const laws = { type: "نصوص قانونية" };
    const summaries = { type: "ملخصات" };
    expect(archiveRank(laws)).toBeLessThan(archiveRank(summaries));

    const sorted = [summaries, laws, summaries].sort((a, b) => archiveRank(a) - archiveRank(b));
    expect(sorted[0].type).toBe("نصوص قانونية");
  });
});

describe("هوية السجلّ في لوحة التحكم", () => {
  it("المعرّف المكتوب يكفي، والعنوان يكفي، وحده المعرّف يكفي", () => {
    expect(hasPublishableIdentity({ slug: "qanun-1" })).toBe(true);
    expect(hasPublishableIdentity({ slug: "", title: "قانون بلا معرّف" })).toBe(true);
    expect(hasPublishableIdentity({ slug: null, title: null, id: "rec-7" })).toBe(true);
  });

  it("سجلّ بلا معرّف ولا عنوان ولا id لا يُنشر", () => {
    expect(hasPublishableIdentity({ slug: "  ", title: "", id: "" })).toBe(false);
    expect(hasPublishableIdentity(null)).toBe(false);
  });
});

describe("جلب محتوى لوحة التحكم", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("تعطّل جدول واحد لا يُفرغ الجداول الأخرى", async () => {
    // كان Promise.All يرمي عند أول جدول فاشل، فتختفي مقالات CMS وملفات
    // الأرشيف كلها من الخريطة بسبب جدول واحد معطوب.
    vi.stubGlobal("fetch", async (url: string) => {
      if (String(url).includes("/rest/v1/laws")) {
        return new Response("boom", { status: 500 });
      }
      const table = /\/rest\/v1\/([a-z_]+)\?/.exec(String(url))?.[1];
      const rows =
        table === "articles"
          ? [
              { id: "a1", title: "مقال", slug: "maqal" },
              { id: "a2", title: "مقال بلا معرّف", slug: "" },
              { id: "", title: "", slug: "" },
            ]
          : [];
      return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
    });

    const result = await fetchPublishedCmsContent();

    expect(result.ok).toBe(false); // الجدول المعطوب معلن
    expect(result.articles).toHaveLength(2); // المعرّف أو العنوان أو id يكفي؛ الثالث بلا واحدة منها
    expect(result.laws).toEqual([]);
    expect(result.errors.join(" ")).toContain("laws");
  });

  it("كل الجداول سليمة ⇒ ok والسجلّات بلا slug محفوظة", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      const table = /\/rest\/v1\/([a-z_]+)\?/.exec(String(url))?.[1];
      const rows =
        table === "laws"
          ? [{ id: "l1", title: "قانون بلا معرّف", slug: null, pdf_url: "https://x/a.pdf" }]
          : [];
      return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
    });

    const result = await fetchPublishedCmsContent();
    expect(result.ok).toBe(true);
    expect(result.laws).toHaveLength(1);
    expect(result.laws[0].title).toBe("قانون بلا معرّف");
  });
});
