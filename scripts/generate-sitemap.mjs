import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '../public/sitemap.xml');

// 🚀 Primary custom domain and secondary fallback domain
const DOMAINS = [
  'https://mizanmaroc.qzz.io',
  'https://mizandigital.pages.dev'
];

const LANGS = ['ar', 'fr', 'en', 'es'];
const PATHS = ['/', '/library', '/archive', '/library/jurisprudence', '/pricing'];
const TODAY = new Date().toISOString().split('T')[0];

function buildAlternateLinks(baseUrl, path) {
  const cleanPath = path === '/' ? '' : path;
  
  const links = LANGS.map((lang) => {
    // Default Arabic route uses base path, non-Arabic routes prepend lang prefix
    const href = lang === 'ar' 
      ? `${baseUrl}${path}` 
      : `${baseUrl}/${lang}${cleanPath}`;
    return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
  });

  // Add x-default fallback pointing to the default language version
  links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${path}" />`);

  return links.join('\n');
}

function generateDomainUrls(baseUrl, isPrimary) {
  return PATHS.map((path) => {
    const loc = `${baseUrl}${path}`;
    const priority = path === '/' ? (isPrimary ? '1.0' : '0.8') : (isPrimary ? '0.9' : '0.7');
    const changefreq = path === '/' ? 'daily' : 'weekly';

    return `  <url>
    <loc>${loc}</loc>
${buildAlternateLinks(baseUrl, path)}
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');
}

const allRows = DOMAINS.map((domain, idx) => generateDomainUrls(domain, idx === 0)).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allRows}
</urlset>`;

await writeFile(OUTPUT, xml, 'utf8');
console.log('✅ Generated sitemap.xml with primary & secondary domains at:', OUTPUT);