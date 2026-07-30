import fs from 'fs';
import path from 'path';

// ==========================================
// ⚙️ CONFIGURATION & ENV SETUP
// ==========================================
const BASE_URL = 'https://www.mizan.page';
const LANGUAGES = ['ar', 'en', 'fr', 'es'];
const DEFAULT_LANG = 'ar'; // Legal default for Morocco

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Static routes matching Mizan's architecture
const STATIC_ROUTES = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: '/fields/administrative', priority: '0.9', changefreq: 'weekly' },
  { path: '/fields/commercial', priority: '0.9', changefreq: 'weekly' },
  { path: '/fields/civil', priority: '0.9', changefreq: 'weekly' },
  { path: '/fields/criminal', priority: '0.9', changefreq: 'weekly' },
  { path: '/fields/family', priority: '0.9', changefreq: 'weekly' },
  { path: '/documents/cassation', priority: '0.8', changefreq: 'daily' },
  { path: '/documents/decrees', priority: '0.8', changefreq: 'weekly' },
  { path: '/documents/journals', priority: '0.8', changefreq: 'weekly' },
  { path: '/schools/rabat-agdal', priority: '0.7', changefreq: 'weekly' },
  { path: '/schools/casablanca-ain-chock', priority: '0.7', changefreq: 'weekly' },
  { path: '/schools/oujda', priority: '0.7', changefreq: 'weekly' },
  { path: '/schools/marrakech-cadi-ayyad', priority: '0.7', changefreq: 'weekly' },
  { path: '/privacy', priority: '0.3', changefreq: 'monthly' },
  { path: '/terms', priority: '0.3', changefreq: 'monthly' },
];

// ==========================================
// 📥 SUPABASE DYNAMIC DATA FETCHING
// ==========================================
async function fetchDynamicRoutes() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('⚠️ Supabase credentials missing. Generating sitemap with static routes only.');
    return [];
  }

  const dynamicRoutes = [];

  try {
    // 1. Fetch Legal Documents & Cassation Rulings
    const docsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?select=id,slug,updated_at&limit=2000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (docsResponse.ok) {
      const documents = await docsResponse.json();
      documents.forEach((doc) => {
        const identifier = doc.slug || doc.id;
        dynamicRoutes.push({
          path: `/documents/${identifier}`,
          priority: '0.8',
          changefreq: 'weekly',
          lastmod: doc.updated_at ? new Date(doc.updated_at).toISOString() : new Date().toISOString(),
        });
      });
      console.log(`✅ Retrieved ${documents.length} dynamic legal documents from Supabase.`);
    }

    // 2. Fetch University Archives / Exams
    const schoolsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/school_documents?select=id,school_slug,semester,updated_at&limit=2000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (schoolsResponse.ok) {
      const schoolDocs = await schoolsResponse.json();
      schoolDocs.forEach((doc) => {
        if (doc.school_slug && doc.semester) {
          dynamicRoutes.push({
            path: `/schools/${doc.school_slug}/${doc.semester}`,
            priority: '0.7',
            changefreq: 'monthly',
            lastmod: doc.updated_at ? new Date(doc.updated_at).toISOString() : new Date().toISOString(),
          });
        }
      });
      console.log(`✅ Retrieved ${schoolDocs.length} university archive routes from Supabase.`);
    }
  } catch (error) {
    console.error('❌ Error fetching dynamic routes from Supabase:', error.message);
  }

  return dynamicRoutes;
}

// ==========================================
// 🏗️ XML GENERATION WITH HREFLANG
// ==========================================
function generateUrlEntry(route) {
  const lastmodDate = route.lastmod || new Date().toISOString();

  // Generate an entry for every language with reciprocal hreflang links
  return LANGUAGES.map((lang) => {
    const pageUrl = `${BASE_URL}/${lang}${route.path}`;

    const hreflangLinks = LANGUAGES.map(
      (altLang) =>
        `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${BASE_URL}/${altLang}${route.path}" />`
    ).join('\n');

    const defaultHreflang = `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/${DEFAULT_LANG}${route.path}" />`;

    return `  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${lastmodDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
${hreflangLinks}
${defaultHreflang}
  </url>`;
  }).join('\n');
}

async function buildSitemap() {
  console.log('🚀 Starting Military-Grade Sitemap Generation...');

  const dynamicRoutes = await fetchDynamicRoutes();
  const allRoutes = [...STATIC_ROUTES, ...dynamicRoutes];

  const xmlEntries = allRoutes.map(generateUrlEntry).join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${xmlEntries}
</urlset>`;

  const outputPath = path.resolve('public/sitemap.xml');
  fs.writeFileSync(outputPath, xmlContent.trim());

  const totalUrls = allRoutes.length * LANGUAGES.length;
  console.log(`🎉 Sitemap successfully generated at public/sitemap.xml! Total indexed URLs: ${totalUrls}`);
}

buildSitemap().catch((err) => {
  console.error('Fatal error during sitemap generation:', err);
  process.exit(1);
});