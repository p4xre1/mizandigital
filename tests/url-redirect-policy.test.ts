/**
 * سياسة مسارات التحويل 301 — الخريطة تنشر روابط 200 فقط.
 *
 * ماذا تحمي؟
 * -----------
 * خريطة الموقع يجب ألا تحوي رابطاً يُردّ عليه 301: الزاحف يقرأ «Redirected»
 * بدل صفحة، وتُعلَّم الخريطة كلها في Search Console بروابط غير صالحة. القائمة
 * في shared/seo/url-policy.js (isRedirectingPath) مطابقة لقواعد
 * public/_redirects — والاختبار الأخير هنا يمنع انحراف أحدهما عن الآخر:
 * أي قاعدة تحويل جديدة في الملف يجب أن تدخل القائمة، وإلا عادت الروابط
 * المحوَّلة إلى الإصدار المنشور من الخريطة.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { isRedirectingPath } from "../shared/seo/url-policy.js";

describe("isRedirectingPath — مسارات 301 لا تدخل الخريطة", () => {
  test("المسارات المنفردة — بما فيها معرّفات مرمّزة مئوياً في _redirects", () => {
    expect(isRedirectingPath("/schools/fsjest-tangier")).toBe(true);
    expect(isRedirectingPath("https://www.mizan.page/schools/fsjest-tangier?utm=1")).toBe(true);
    expect(isRedirectingPath("/lexicon/فصل-السلط-separation-pouvoirs-constitution")).toBe(true);
    // نفس المسار مرمّزاً كما هو مكتوب حرفياً في public/_redirects.
    expect(
      isRedirectingPath("/lexicon/%D9%81%D8%B5%D9%84-%D8%A7%D9%84%D8%B3%D9%84%D8%B7-separation-pouvoirs-constitution"),
    ).toBe(true);
    expect(isRedirectingPath("/lexicon/ملتمس-الرقابة-motion-censure-dustur")).toBe(true);
    expect(isRedirectingPath("/library")).toBe(true);
    expect(isRedirectingPath("/legal-qa")).toBe(true);
    expect(isRedirectingPath("/register")).toBe(true);
  });

  test("البادئات تشمل الكلمة العارية والمقطع الأعمق — ولا تلتصق بما يجاورها", () => {
    expect(isRedirectingPath("/en")).toBe(true);
    expect(isRedirectingPath("/en/articles/x")).toBe(true);
    expect(isRedirectingPath("/fr/schools/x")).toBe(true);
    expect(isRedirectingPath("/docs/old-page")).toBe(true);
    expect(isRedirectingPath("/documents/old")).toBe(true);
    expect(isRedirectingPath("/fields/old")).toBe(true);
    expect(isRedirectingPath("/article/foo")).toBe(true);

    // /articles قسم حقيقي: بادئة /article لا تلتصق به، و/archive لا يُحرَّك.
    expect(isRedirectingPath("/article")).toBe(true);
    expect(isRedirectingPath("/articles/maqal")).toBe(false);
    expect(isRedirectingPath("/archive")).toBe(false);
    expect(isRedirectingPath("/events/seminar-e1")).toBe(false);
    expect(isRedirectingPath("/schools/fsjes-tetouan")).toBe(false);
    expect(isRedirectingPath("/lexicon/mustalah-jadid")).toBe(false);
    expect(isRedirectingPath("/espace")).toBe(false);
    expect(isRedirectingPath("/")).toBe(false);
    // شريط النهاية يُطبَّع: /x/ هي /x.
    expect(isRedirectingPath("/library/")).toBe(true);
  });

  test("لا ينحرف القائمة عن public/_redirects: كل مصدر تحويل مغطّى", () => {
    const rules = readFileSync("public/_redirects", "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      // الصيغة المعمول بها على Pages: <من> <إلى> <الرمز> (سطران مسافتان+).
      .filter((line) => line.split(/\s+/).length >= 3 && line.split(/\s+/)[2] === "301");

    // التحذير: لو فُرِّغ الملف لنجحت المطابقة صامتة — نشترط عدداً معقولاً.
    expect(rules.length).toBeGreaterThan(5);

    for (const line of rules) {
      const [from] = line.split(/\s+/);
      const base = from.endsWith("/*") ? from.slice(0, -2) : from;
      expect(isRedirectingPath(base), `قاعدة غير مغطاة: ${from}`).toBe(true);
      if (from.endsWith("/*")) {
        expect(isRedirectingPath(`${base}/x`), `قاعدة غير مغطاة: ${from}`).toBe(true);
      }
    }
  });
});
