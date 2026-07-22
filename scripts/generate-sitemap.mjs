import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '../public/sitemap.xml');

// 🌐 Primary canonical domain & apex fallback domain
const DOMAINS = [
  'https://www.mizan.page',
  'https://mizan.page'
];

const LANGS = ['ar', 'fr', 'en', 'es'];

// 📚 All core public routes matching router.tsx
const PATHS = [
  '',
  '/about',
  '/archive',
  '/library',
  '/schools',
  '/login'
];

const TODAY = new Date().toISOString().split('T')[0];

function buildAlternateLinks(baseUrl, path) {
  const links = LANGS.map((lang) => {
    // Generates localized URL: e.g. https://www.mizan.page/ar/library
    const href = `${baseUrl}/${lang}${path}`;
    return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
  });

  // x-default points to default Arabic localized path
  links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/ar${path}" />`);

  return links.join('\n');
}

function generateDomainUrls(baseUrl, isPrimary) {
  return PATHS.flatMap((path) => {
    return LANGS.map((lang) => {
      const loc = `${baseUrl}/${lang}${path}`;
      const priority = path === '' ? (isPrimary ? '1.0' : '0.8') : (isPrimary ? '0.9' : '0.7');
      const changefreq = path === '' ? 'daily' : 'weekly';

      return `  <url>
    <loc>${loc}</loc>
${buildAlternateLinks(baseUrl, path)}
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });
  }).join('\n');
}

const allRows = DOMAINS.map((domain, idx) => generateDomainUrls(domain, idx === 0)).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allRows}
</urlset>`;

await writeFile(OUTPUT, xml, 'utf8');
console.log('✅ Master sitemap.xml generated successfully at:', OUTPUT);