/**
 * لافتة الشراكة في الصفحة الرئيسية — الارتباط بموقع الشريك.
 *
 * ماذا تحمي؟
 * -----------
 * 1) أن اللافتة تبقى مركّبة في الصفحة الرئيسية تحت قسم القاموس (لا تُحذف
 *    بصمت عند تحرير HomePage.tsx) وينتقل رابطها إلى وظيفة بابليك بالحرف.
 * 2) أن الرابط يفتح في تبويب جديد بأمان (noopener noreferrer) ومعه وسم
 *    `sponsored` — رابط شراكة ترويجي يجب ألا يمرّر وزناً للـSEO.
 * 3) أن الشريط كله يبقى رابطاً واحداً (لا أزرار متداخلة داخل <a>) وأن اللافتة
 *    لا تضيف h إلى خريطة العناوين (اختبار heading-order يقرأ HomePage.tsx).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const HOME = read("src/pages/public/HomePage.tsx");
const BANNER = read("src/components/home/HomeCollabBanner.tsx");

describe("لافتة الشراكة مع وظيفة بابليك", () => {
  it("مركّبة في الصفحة الرئيسية تحت قسم «كيف يساعدك القاموس القانوني؟»", () => {
    expect(HOME).toContain('import { HomeCollabBanner } from "../../components/home/HomeCollabBanner"');
    expect(HOME).toContain("<HomeCollabBanner />");
    // تحت القاموس مباشرة (HomeLexiconShowcase) وقبل قسم الموارد المجانية.
    expect(HOME.indexOf("<HomeCollabBanner />")).toBeGreaterThan(HOME.indexOf("<HomeLexiconShowcase"));
    expect(HOME.indexOf("<HomeCollabBanner />")).toBeLessThan(HOME.indexOf("<HomeFreeResources />"));
  });

  it("ينتقل إلى https://www.wadifapublic.ma/ar في تبويب جديد وبـ sponsored", () => {
    expect(BANNER).toContain('const WADIFA_PUBLIC_URL = "https://www.wadifapublic.ma/ar"');
    expect(BANNER).toContain('href={WADIFA_PUBLIC_URL}');
    expect(BANNER).toContain('target="_blank"');
    expect(BANNER).toContain('rel="noopener noreferrer sponsored"');
  });

  it("شريط واحد برابط واحد — لا أزرار متداخلة ولا عناوين إضافية", () => {
    expect(BANNER).not.toMatch(/<h[1-6][\s>]/);
    expect(BANNER).not.toContain("<button");
    expect(BANNER).not.toContain("<Link");
    // رابط الشريك وحده في اللافتة (لا روابط أخرى تتنافس معه) — وسم JSX فتح
    // فقط (لا يُحتسب ذكر `<a>` في التعليقات).
    expect(BANNER.match(/<a\s/g) ?? []).toHaveLength(1);
    expect(BANNER).toContain('aria-label="شراكة مع وظيفة بابليك"');
  });
});
