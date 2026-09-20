import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { checkSiteIcons } from "../shared/seo/technical-checks.js";

/**
 * أيقونة الموقع وشعار البحث.
 *
 * الخطأ الذي يحرسه هذا الملف حقيقي وواقعي: كانت كل وسوم <link rel="icon">
 * و Organization.logo تشير إلى بلاطة شبه بيضاء بأحجام مصرّح بها خطأً
 * (logo-white-512.png مسمّى 16×16)، وكان favicon.ico ملف PNG مغلّفًا باسم .ico.
 * المحصّلة: Google يختار أيقونة لا تُرى فوق خلفية نتائج البحث البيضاء.
 *
 * السياسة (developers.google.com/search/docs/appearance/favicon-in-search):
 * مربّع ≥ 8×8 والمستحسن > 48×48، من صيغ BMP/GIF/ICO/PNG/JPEG/PPM/TIFF، برابط
 * مستقر قابل للزحف. والشعار في البيانات المهيكلة: ≥ 112×112 ويبدو صحيحًا على
 * أبيض.
 */

const read = (file: string) => readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8");
const readBuf = (file: string) => readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)));

/** IHDR في PNG يحمل العرض/الطول/نوع اللون — بلا فكّ تشفير للصور. */
function pngInfo(buffer: Buffer) {
  if (buffer.readUInt32BE(0) !== 0x8950_4e47) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25),
  };
}

function iconMeta(path: string) {
  const file = `public/${path.replace(/^\//, "")}`;
  if (!existsSync(fileURLToPath(new URL(`../${file}`, import.meta.url)))) {
    return { exists: false as const };
  }
  const buffer = readBuf(file);
  const png = pngInfo(buffer);
  if (png) return { exists: true as const, ...png, format: "png" as const };
  const isIco = buffer.readUInt16LE(0) === 0 && buffer.readUInt16LE(2) === 1;
  return {
    exists: true as const,
    format: isIco ? ("ico" as const) : ("unknown" as const),
    width: isIco ? buffer.readUInt8(6) || 256 : null,
    height: isIco ? buffer.readUInt8(7) || 256 : null,
  };
}

const iconHrefs = (html: string) =>
  [...html.matchAll(/<link\b[^>]*\brel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]*>/gi)]
    .map((m) => /href=["']([^"']+)["']/i.exec(m[0])?.[1])
    .filter(Boolean) as string[];

describe("أيقونات الموقع في index.html", () => {
  const html = read("index.html");
  const hrefs = iconHrefs(html);

  test("كل أيقونة معلنة لها ملف حقيقي في public/", () => {
    expect(hrefs.length).toBeGreaterThanOrEqual(5);
    for (const href of hrefs) {
      expect(iconMeta(href), `الملف مفقود: ${href}`).toHaveProperty("exists", true);
    }
  });

  test("sizes المصرّح به يطابق أبعاد الملف الفعلية (لا 16×16 لملف 512)", () => {
    const tags = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => /rel=["'][^"']*icon/i.test(tag));
    expect(tags.length).toBeGreaterThan(0);

    for (const tag of tags) {
      const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
      const sizes = /sizes=["'](\d+)x(\d+)["']/i.exec(tag);
      if (!href || !sizes) continue;
      const meta = iconMeta(href) as { width?: number | null; height?: number | null };
      // apple-touch-icon يُسمح بـ 180 للملف 180 فقط؛ PNG يعطي أبعاده بدقة.
      expect([Number(sizes[1]), Number(sizes[2])], `حجم معلن خطأ لـ ${href}`).toEqual([meta.width, meta.height]);
    }
  });

  test("كل أيقونة مربّعة بنسبة 1:1", () => {
    for (const href of hrefs) {
      const meta = iconMeta(href) as { width?: number | null; height?: number | null };
      if (!meta.width) continue;
      expect(meta.height, `النسبة في ${href}`).toBe(meta.width);
    }
  });

  test("favicon.ico ICO صالح لا PNG مغلّفًا باسم .ico", () => {
    const buffer = readBuf("public/favicon.ico");
    expect(buffer.readUInt16LE(0), "ترويسة ICONDIR").toBe(0);
    expect(buffer.readUInt16LE(2), "نوع الصورة: 1 = icon").toBe(1);
    expect(buffer.readUInt16LE(4), "عدد المدخلات").toBeGreaterThanOrEqual(1);
    // أول مدخل يجب أن يكون صورة حقيقية مضمّنة، لا ملف PNG بلا ترويسة ICO:
    // جدول المدخل يبدأ بعد رأس 6 بايت؛ bytesInRes عند +8 و imageOffset عند +12.
    const entry = 6;
    const firstSize = buffer.readUInt32LE(entry + 8);
    const firstOffset = buffer.readUInt32LE(entry + 12);
    expect(firstSize).toBeGreaterThan(8);
    expect(firstOffset + firstSize).toBeLessThanOrEqual(buffer.length);
    expect(buffer.readUInt32BE(firstOffset), "توقيع الصورة المضمّنة في ICO").toBe(0x8950_4e47);
    // وأبعاد المدخل الأول مذكورة في الجدول نفسه (16×16 عادةً)
    expect(buffer.readUInt8(entry)).toBeLessThanOrEqual(256);
  });

  test("توجد أيقونة نقطية ≥ 48px بلا media= — ما يقرأه Google فعلاً", () => {
    const tags = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((m) => m[0])
      .filter((tag) => /rel=["'](?:shortcut )?icon["']/i.test(tag));

    const candidates = tags.filter((tag) => {
      if (/\bmedia\s*=/.test(tag)) return false;
      const href = /href=["']([^"']+)["']/i.exec(tag)?.[1] || "";
      if (/\.svg($|\?)/i.test(href)) return false;
      const meta = iconMeta(href) as { width?: number | null };
      return Number(meta.width || 0) >= 48;
    });

    expect(candidates.length).toBeGreaterThan(0);
  });

  test("لا وسم أيقونة يشير إلى البلاطة البيضاء شبه الشفافة", () => {
    // logo-white-* بيضاء على أبيض SERP = لا شيء مرئي. تبقى الملفات منشورة
    // لثبات الروابط القديمة، لكن لا تُعلَّن كأيقونة الموقع.
    for (const href of hrefs) {
      expect(href, `أيقونة معلنة بيضاء: ${href}`).not.toMatch(/logo-white|apple-touch-icon-white|favicon-white/);
    }
  });
});

describe("شعار البيانات المهيكلة", () => {
  const LOGO = "/logo-512.png";

  test("كل طبقات Organization تمرّر نفس الرابط النقطي", () => {
    for (const file of [
      "index.html",
      "scripts/prerender.mjs",
      "src/components/seo/SEOHead.tsx",
      "src/components/seo/SchemaOrg.tsx",
      "src/lib/seo/schema.ts",
    ]) {
      const source = read(file);
      expect(source, `${file} لا يشير إلى الشعار الصحيح`).toContain(LOGO);
      expect(source, `${file} ما زال يستعمل البلاطة البيضاء`).not.toContain("/logo-white-512.png");
      expect(source, `${file}: SVG لا يُستعمل شعارًا للبيانات المهيكلة`).not.toMatch(/"(?:logo|contentUrl)"\s*:\s*"[^"]+\.svg"/);
    }
  });

  test("الشعار 512×512 معتّم (بلا قناة شفافية) ومربّع", () => {
    const info = pngInfo(readBuf(`public${LOGO}`));
    expect(info).not.toBeNull();
    expect(info!.width).toBe(512);
    expect(info!.height).toBe(512);
    // 2 = RGB بلا alpha: لا شفافية تُبقي فراغًا فوق خلفية Google البيضاء.
    expect(info!.colorType, "نوع لون PNG").toBe(2);
  });

  test("الأبعاد لا تقلّ عن 112×112 المطلوبة لشعار Organization", () => {
    const html = read("index.html");
    const logoBlock = /"logo"\s*:\s*\{[\s\S]*?\}/.exec(read("index.html"))?.[0] || "";
    const width = Number(/"width"\s*:\s*(\d+)/.exec(logoBlock)?.[1] || 0);
    const height = Number(/"height"\s*:\s*(\d+)/.exec(logoBlock)?.[1] || 0);
    expect(logoBlock, "عقدة logo في JSON-LD").not.toBe("");
    expect(width, "width المصرّح به").toBeGreaterThanOrEqual(112);
    expect(height, "height المصرّح به").toBeGreaterThanOrEqual(112);
  });

  test("manifest.json يعلن أيقونات موجودة بأحجامها الحقيقية", () => {
    const manifest = JSON.parse(read("public/manifest.json"));
    expect(Array.isArray(manifest.icons)).toBe(true);

    for (const icon of manifest.icons) {
      const meta = iconMeta(icon.src) as { exists: boolean; width?: number; height?: number };
      expect(meta.exists, `ملف الأيقونة مفقود: ${icon.src}`).toBe(true);

      const sizes = /^(\d+)x(\d+)$/.exec(icon.sizes || "");
      if (sizes && meta.width) {
        expect([Number(sizes[1]), Number(sizes[2])], `حجم manifest خطأ لـ ${icon.src}`).toEqual([meta.width, meta.height]);
      }
    }

    // 192 و512 بشرط purpose=any مطلوبان لقابلية التثبيت على أندرويد
    const anyIcon = (size: number) =>
      manifest.icons.some((i: { sizes?: string; purpose?: string }) => i.sizes === `${size}x${size}` && (!i.purpose || i.purpose.includes("any")));
    expect(anyIcon(192), "أيقونة 192 بغرض any").toBe(true);
    expect(anyIcon(512), "أيقونة 512 بغرض any").toBe(true);
  });
});

describe("بوابة siteIcons نفسها", () => {
  const html = read("index.html");
  const files = Object.fromEntries(iconHrefs(html).map((href) => [href, iconMeta(href)])) as Record<
    string,
    Record<string, unknown>
  >;
  files["/logo-512.png"] = { ...iconMeta("/logo-512.png"), meanLuminance: 51 };

  test("التركيبة الحالية تنجح", () => {
    const result = checkSiteIcons(html, { files });
    expect(result.issues, result.issues.join(" | ")).toHaveLength(0);
    expect(result.pass).toBe(true);
    expect(result.score).toBe(100);
  });

  test("الأيقونة شبه البيضاء تُرفض", () => {
    const poisoned = { ...files, "/logo-512.png": { exists: true, format: "png", width: 512, height: 512, meanLuminance: 216 } };
    const result = checkSiteIcons(html, { files: poisoned });
    expect(result.pass).toBe(false);
    expect(result.issues.join(" ")).toContain("شبه بيضاء");
  });

  test("sizes كاذب أو ملف مفقود يُرفض", () => {
    const broken = { ...files, "/favicon-48x48.png": { exists: false } };
    const result = checkSiteIcons(html, { files: broken });
    expect(result.pass).toBe(false);
    expect(result.issues.join(" ")).toMatch(/404|لا ملف له/);
  });

  test("صفحة بلا أي وسم أيقونة تفشل", () => {
    const result = checkSiteIcons("<html><head><title>x</title></head></html>", { files: {} });
    expect(result.pass).toBe(false);
  });
});
