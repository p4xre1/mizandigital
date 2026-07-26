import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Running Mizan Digital Pre-flight Code Check...\n');

let errorCount = 0;

// Helper to log errors
function reportError(title, detail) {
  console.error(`❌ [ERROR] ${title}`);
  if (detail) console.error(`   ${detail}`);
  errorCount++;
}

// Helper to log success
function reportSuccess(msg) {
  console.log(`✅ ${msg}`);
}

// -----------------------------------------------------------------------------
// 1. Check Key Required Files
// -----------------------------------------------------------------------------
const requiredFiles = [
  'src/lib/utils.ts',
  'src/lib/navigation.ts',
  'src/lib/i18n.tsx',
  'public/_redirects',
  'public/robots.txt',
  'public/sitemap.xml',
  'vite.config.ts',
  'tsconfig.json',
];

console.log('--- 1. Required Files Check ---');
requiredFiles.forEach((file) => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    reportSuccess(`Found: ${file}`);
  } else {
    reportError(`Missing File: ${file}`, `Path: ${filePath}`);
  }
});

// -----------------------------------------------------------------------------
// 2. Validate `_redirects` Syntax & Routing Fallback Rules
// -----------------------------------------------------------------------------
console.log('\n--- 2. Cloudflare `_redirects` File Check ---');
const redirectsPath = path.join(rootDir, 'public/_redirects');

if (fs.existsSync(redirectsPath)) {
  const content = fs.readFileSync(redirectsPath, 'utf-8');
  const lines = content.split('\n');

  let hasSpaFallback = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // Check Spanish bug: /es/iniciar-sesion pointing to /es/registro instead of login
    if (trimmed.includes('/es/iniciar-sesion') && trimmed.includes('/es/registro')) {
      reportError(
        `Line ${index + 1}: Invalid Spanish login redirect!`,
        `Found: "${trimmed}". Should redirect to "/es/login", not "/es/registro".`
      );
    }

    // Check SPA Fallback rule at the bottom
    if (trimmed.startsWith('/*') && trimmed.includes('/index.html') && trimmed.includes('200')) {
      hasSpaFallback = true;
    }
  });

  if (hasSpaFallback) {
    reportSuccess('SPA Fallback rule (/* /index.html 200) verified at bottom of _redirects.');
  } else {
    reportError(
      'Missing SPA Fallback Rule',
      'Add "/* /index.html 200" at the very end of public/_redirects.'
    );
  }
}

// -----------------------------------------------------------------------------
// 3. Check `robots.txt` Sitemap Reference
// -----------------------------------------------------------------------------
console.log('\n--- 3. SEO Robots & Sitemap Reference Check ---');
const robotsPath = path.join(rootDir, 'public/robots.txt');

if (fs.existsSync(robotsPath)) {
  const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
  if (robotsContent.includes('Sitemap: https://www.mizan.page/sitemap.xml')) {
    reportSuccess('robots.txt properly points to https://www.mizan.page/sitemap.xml');
  } else {
    reportError(
      'Invalid Sitemap in robots.txt',
      'Ensure robots.txt contains "Sitemap: https://www.mizan.page/sitemap.xml"'
    );
  }
}

// -----------------------------------------------------------------------------
// 4. Verify `vite.config.ts` for Router Deduplication Rule
// -----------------------------------------------------------------------------
console.log('\n--- 4. Vite Config Deduplication Check ---');
const vitePath = path.join(rootDir, 'vite.config.ts');

if (fs.existsSync(vitePath)) {
  const viteContent = fs.readFileSync(vitePath, 'utf-8');
  if (viteContent.includes("dedupe:") && viteContent.includes("'react-router-dom'")) {
    reportSuccess("Vite deduplication for React Router configured.");
  } else {
    reportError(
      "Missing Vite dedupe array",
      "Add resolve: { dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'] } to vite.config.ts"
    );
  }
}

// -----------------------------------------------------------------------------
// Summary Output
// -----------------------------------------------------------------------------
console.log('\n==================================================');
if (errorCount === 0) {
  console.log('🎉 ALL CHECKS PASSED! Your routing and project setup are solid.');
} else {
  console.log(`🚨 FOUND ${errorCount} ISSUE(S). Please resolve them before building.`);
}
console.log('==================================================\n');