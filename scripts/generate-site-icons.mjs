import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

/*
 * توليد أيقونات الموقع من public/Logo.svg — حقيقيًا لا بالنسخ وإعادة التسمية.
 *
 * المشكلة التي يعالجها هذا السكربت (وهي سبب غياب الشعار في نتائج البحث):
 *  1) favicon.ico كان ملف PNG مغلّف باسم .ico: يُخدَم بـ
 *     Content-Type: image/vnd.microsoft.icon وهو غير ICO صحيح، فترفضه
 *     أدوات اختيار أيقونة الموقع.
 *  2) favicon-16x16.png و favicon-32x32.png كانا نسختين من ملف 192×192:
 *     الحقل sizes في HTML/manifest يصرّح بحجم لا يطابق الملف.
 *  3) كل <link rel="icon"> الأساسي كان يشير إلى logo-white-*.png، وهو
 *     بلاطة شبه بيضاء (متوسط RGB ≈ 214,226,251). سياسة Google لنصّ Organization
 *     تنصّ حرفيًا على أن الشعار يجب أن يبدو صحيحًا على خلفية بيضاء، وإلا لم
 *     يُعرض — أي أن الأيقونة كانت شفافة على أبيض في صفحة النتائج.
 *  4) apple-touch-icon.png كان 192×192 بلا خلفية معتمة.
 *
 * القاعدة: كل ملف يُكتب بأبعاده الحقيقية، وبخلفية معتمة (flatten) لأن
 * الشعار سيُعرض على أبيض. البنية الموحّدة تُقرأ من Logo.svg وحده فلا تنفصل
 * الأيقونات عن الشعار.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const SOURCE_SVG = join(PUBLIC, "Logo.svg");

/** خلفية مسطّحة: أبيض للوحة التي يراها الباحث، وكحلي للتطبيقات التي تقصّ. */
const WHITE = "#ffffff";
const NAVY = "#0f172a";

/**
 * SVG المصدر مكتوب بـ width="100%"، وlibrsvg يترجمها إلى حجم افتراضي صغير
 * فيُنبَّت الشعار بدقة منخفضة. نثبّت العرض/الارتفاع صراحةً قبل التصيير.
 */
const SOURCE_SVG_TEXT = (await readFile(SOURCE_SVG, "utf8"))
  .replace(/width="100%"/, "")
  .replace(/height="100%"/, "");

/** تصيير متجه المصدر عند حجم معطى — بلا قصّ ولا تمديد:contain يحفظ النسبة. */
function rasterize(size) {
  const svg = SOURCE_SVG_TEXT.replace(
    /viewBox="0 0 512 512"/,
    `viewBox="0 0 512 512" width="${size}" height="${size}"`
  );
  return sharp(Buffer.from(svg), { density: 300 }).resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
}

async function writePng(file, pipeline, flatten) {
  const buffer = await pipeline
    .flatten({ background: flatten })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();

  await writeFile(file, buffer);
  return buffer;
}

/**
 * حاوية ICO حقيقية: رأس ICONDIR ثم جدول مداخل، وكل مدخل صورة PNG كاملة.
 * PNG داخل ICO مقبول من Windows Vista+ ومن الزواحف، وأأمن من PNG مغلّف باسم .ico.
 */
function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  let offset = header.length;
  const parts = [header];

  entries.forEach((entry, index) => {
    const { png, size } = entry;
    const at = 6 + index * 16;
    // 0 في الحقلين width/height يعني 256px؛ أحجامنا أصغر فنعطيها كما هي.
    parts[0].writeUInt8(size >= 256 ? 0 : size, at);
    parts[0].writeUInt8(size >= 256 ? 0 : size, at + 1);
    parts[0].writeUInt8(0, at + 2); // palette
    parts[0].writeUInt8(0, at + 3); // reserved
    parts[0].writeUInt16LE(1, at + 4); // planes
    parts[0].writeUInt16LE(32, at + 6); // bit count
    parts[0].writeUInt32LE(png.length, at + 8);
    parts[0].writeUInt32LE(offset, at + 12);
    offset += png.length;
    parts.push(png);
  });

  return Buffer.concat(parts);
}

async function main() {
  const written = [];

  // ── الشعار الذي يُقرأ في البيانات المهيكلة: 512×512، معتّم على أبيض ──────
  const logo512 = await writePng(join(PUBLIC, "logo-512.png"), rasterize(512), WHITE);
  written.push(["logo-512.png", "512×512", "Organization.logo + أيقونة البحث"]);

  // ── favicons بأحجامها الحقيقية ─────────────────────────────────────────
  const favicons = [];
  for (const size of [16, 32, 48]) {
    const buffer = await writePng(
      join(PUBLIC, `favicon-${size}x${size}.png`),
      rasterize(size),
      WHITE
    );
    favicons.push({ size, png: buffer });
    written.push([`favicon-${size}x${size}.png`, `${size}×${size}`, "sizes مطابق للواقع"]);
  }

  // ── ICO حقيقي (16/32/48) بدل PNG مغلّف ─────────────────────────────────
  const ico = buildIco(favicons);
  await writeFile(join(PUBLIC, "favicon.ico"), ico);
  written.push(["favicon.ico", "16/32/48", "ICO صالح برؤوس PNG"]);

  // ── apple-touch-icon: 180×180، تعبئة كاملة بلا زوايا (iOS تقصّ بنفسها) ──
  const touch = await sharp({
    create: { width: 180, height: 180, channels: 3, background: NAVY },
  })
    .composite([
      {
        input: await rasterize(164).png().toBuffer(),
        gravity: "center",
      },
    ])
    .flatten({ background: NAVY })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(PUBLIC, "apple-touch-icon.png"), touch);
  written.push(["apple-touch-icon.png", "180×180", "خلفية معتمة كاملة"]);

  // لا نسخة "بيضاء" من الشعار: اللوحة كحلية معتمة تُقرأ على الأبيض كما على
  // الأسود، وأي ملف زائد بالبايتات نفسها يوحي بوجود بديل في حين أنه مطابق.
  // أيقونات maskable في manifest تبقى icon-maskable-* المصمّمة لهذا الغرض.

  console.log("✓ وُلّدت أيقونات الموقع من Logo.svg:");
  for (const [file, dims, note] of written) {
    console.log(`  · ${file.padEnd(24)} ${dims.padEnd(10)} ${note}`);
  }

  // لا يُحذف أي ملف منشور قديم (logo-white-* و Logo.svg تبقى في public/):
  // سياسة Google تطلب رابط أيقونة مستقرًا، والحذف يولّد 404 في ذاكرة الكاش.
  console.log(
    "  ℹ الملفات القديمة (logo-white-*.png، Logo.svg) تُترك كما هي: رابط الأيقونة يجب أن يبقى مستقرًا."
  );
  void logo512;
}

await main();
