import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '../public/sitemap.xml');

// 🚀 تم التحديث: نطاقك الرسمي والوحيد الآن
const BASE = 'https://mizandigital.pages.dev'; 
const LANGS = ['ar', 'fr', 'en', 'es'];
const PATHS = ['/', '/library', '/archive', '/library/jurisprudence', '/pricing'];

function buildAlternateLinks(path) {
  return LANGS.map((lang) => {
    // حل مشكلة السلاش الزائد في الصفحة الرئيسية للمسارات الفرعية
    const cleanPath = path === '/' ? '' : path;
    const href = lang === 'ar' ? `${BASE}${path}` : `${BASE}/${lang}${cleanPath}/`;
    return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
  }).join('\n');
}

const rows = PATHS.map((path) => {
  const loc = `${BASE}${path}`;
  return `  <url>\n    <loc>${loc}</loc>\n${buildAlternateLinks(path)}\n    <priority>0.8</priority>\n    <changefreq>weekly</changefreq>\n  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join('\n')}
</urlset>`;

await writeFile(OUTPUT, xml, 'utf8');
console.log('Generated sitemap.xml at', OUTPUT);
