import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '../public/sitemap.xml');

// 🌐 Single Canonical Primary Domain
const DOMAIN = 'https://www.mizan.page';

const LANGS = ['ar', 'fr', 'en', 'es'];

// 📚 Clean public routes matching router.tsx (NO /login)
const PATHS = [
  '',
  '/about',
  '/archive',
  '/library',
  '/schools'
];

const TODAY = new Date().toISOString().split('T')[0];

function buildAlternateLinks(path) {
  const links = LANGS.map((lang) => {
    const href = `${DOMAIN}/${lang}${path}`;
    return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
  });

  // x-default points to default Arabic localized path
  links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/ar${path}" />`);

  return links.join('\n');
}

function generateSitemapEntries() {
  const entries = [];

  // 1. Root Domain Entry (https://www.mizan.page/)
  entries.push(`  <url>
    <loc>${DOMAIN}/</loc>
${buildAlternateLinks('')}
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  // 2. Localized Pages
  PATHS.forEach((path) => {
    LANGS.forEach((lang) => {
      const loc = `${DOMAIN}/${lang}${path}`;
      const isHome = path === '';
      const priority = isHome ? '1.0' : (path === '/about' ? '0.8' : '0.9');
      const changefreq = isHome || path === '/archive' ? 'daily' : 'weekly';

      entries.push(`  <url>
    <loc>${loc}</loc>
${buildAlternateLinks(path)}
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
    });
  });

  return entries.join('\n');
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${generateSitemapEntries()}
</urlset>
`;

await writeFile(OUTPUT, xml, 'utf8');
console.log('✅ Master clean sitemap.xml generated successfully at:', OUTPUT);