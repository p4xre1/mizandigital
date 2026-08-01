import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const SUPPORTED_LANGS = new Set(["ar", "fr", "en", "es"]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORE_DIRECTORIES = new Set(["node_modules", ".git", "dist", "build", ".vite"]);
const SOURCE_ROOT = path.join(rootDir, "src");
const PUBLIC_ROOT = path.join(rootDir, "public");

console.log("Route and link check\n");

let issueCount = 0;

function reportIssue(title, detail) {
  console.error(`ERROR: ${title}`);
  if (detail) {
    console.error(`  ${detail}`);
  }
  issueCount += 1;
}

function reportPass(message) {
  console.log(`PASS: ${message}`);
}

function listFiles(dir, extensions = null, collected = []) {
  if (!fs.existsSync(dir)) {
    return collected;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRECTORIES.has(entry.name)) {
        listFiles(path.join(dir, entry.name), extensions, collected);
      }
      continue;
    }

    if (!extensions) {
      collected.push(path.join(dir, entry.name));
      continue;
    }

    const extension = path.extname(entry.name);
    if (extensions.has(extension)) {
      collected.push(path.join(dir, entry.name));
    }
  }

  return collected;
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function stripQueryAndHash(value) {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  const cutIndex = Math.min(
    queryIndex === -1 ? Infinity : queryIndex,
    hashIndex === -1 ? Infinity : hashIndex
  );

  if (cutIndex === Infinity) {
    return { pathname: value, suffix: "" };
  }

  return {
    pathname: value.slice(0, cutIndex),
    suffix: value.slice(cutIndex),
  };
}

function normalizePathCandidate(rawValue) {
  const trimmed = rawValue.trim();
  const sanitized = trimmed.replace(/\$\{[^}]+\}/g, "*");
  const { pathname, suffix } = stripQueryAndHash(sanitized);

  if (
    pathname.startsWith("http://") ||
    pathname.startsWith("https://") ||
    pathname.startsWith("//") ||
    pathname.startsWith("mailto:") ||
    pathname.startsWith("tel:") ||
    pathname.startsWith("data:") ||
    pathname.startsWith("javascript:") ||
    pathname.startsWith("vbscript:")
  ) {
    return null;
  }

  if (pathname === "" || pathname === "/" || pathname.startsWith("#")) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && (SUPPORTED_LANGS.has(segments[0]) || segments[0] === "*")) {
    segments.shift();
  }

  const normalizedPath = `/${segments.join("/")}`.replace(/\/$/, "");
  return {
    pathname: normalizedPath === "" ? "/" : normalizedPath,
    suffix,
  };
}

function normalizeRoutePattern(routePath) {
  const cleaned = routePath.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!cleaned) {
    return "/";
  }
  return `/${cleaned}`;
}

function routePatternMatches(candidatePath, patternPath) {
  const candidateSegments = candidatePath === "/" ? [] : candidatePath.slice(1).split("/");
  const patternSegments = patternPath === "/" ? [] : patternPath.slice(1).split("/");

  if (candidateSegments.length !== patternSegments.length) {
    return false;
  }

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const candidateSegment = candidateSegments[index];

    if (patternSegment.startsWith(":")) {
      if (!candidateSegment) {
        return false;
      }
      continue;
    }

    if (candidateSegment === "*") {
      continue;
    }

    if (patternSegment !== candidateSegment) {
      return false;
    }
  }

  return true;
}

function extractRoutePatterns(routeFilePath) {
  const content = fs.readFileSync(routeFilePath, "utf8");
  const patterns = new Set(["/"]);
  const routeRegex = /path:\s*["'`]([^"'`]+)["'`]/g;
  let match;

  while ((match = routeRegex.exec(content))) {
    const routePath = match[1].trim();
    if (routePath === "/:lang" || routePath === "*" || routePath === "/*") {
      continue;
    }
    patterns.add(normalizeRoutePattern(routePath));
  }

  return patterns;
}

function resolveRouteFile() {
  const candidates = [
    path.join(rootDir, "src/routes.tsx"),
    path.join(rootDir, "src/routes.ts"),
    path.join(rootDir, "src/app/routes.tsx"),
    path.join(rootDir, "src/app/routes.ts"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function collectPublicAssets(publicRoot) {
  const assets = new Set();

  for (const filePath of listFiles(publicRoot)) {
    const relativePath = path.relative(publicRoot, filePath);
    assets.add(`/${toPosixPath(relativePath)}`);
  }

  return assets;
}

function isLikelyInternalLinkLine(line) {
  return /\b(localizedPath|buildLocalizedPath|navigate|to=|href=|window\.location\.href|location\.href|history\.replaceState)\b/.test(line);
}

function extractLiteralCandidates(line) {
  const candidates = [];
  const literalRegex = /`([^`]+)`|"([^"]+)"|'([^']+)'/g;
  let match;

  while ((match = literalRegex.exec(line))) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (!value) {
      continue;
    }
    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//")) {
      continue;
    }
    if (
      value.startsWith("/") ||
      value.startsWith("#") ||
      value.startsWith("mailto:") ||
      value.startsWith("tel:") ||
      value.includes("${")
    ) {
      candidates.push(value);
    }
  }

  return candidates;
}

function scanSourceFile(filePath, routePatterns, publicAssets) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!isLikelyInternalLinkLine(line)) {
      return;
    }

    const candidates = extractLiteralCandidates(line);
    candidates.forEach((candidate) => {
      const normalized = normalizePathCandidate(candidate);
      if (!normalized) {
        return;
      }

      const { pathname } = normalized;
      if (publicAssets.has(pathname)) {
        return;
      }

      const matchedRoute = [...routePatterns].some((pattern) =>
        routePatternMatches(pathname, pattern)
      );

      if (!matchedRoute) {
        reportIssue(
          `${toPosixPath(path.relative(rootDir, filePath))}:${index + 1}`,
          `Unresolved internal target ${JSON.stringify(candidate)} -> ${pathname}`
        );
      }
    });
  });
}

function checkRequiredFiles(requiredFiles) {
  const missingFiles = [];

  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      missingFiles.push(relativePath);
    }
  }

  if (missingFiles.length === 0) {
    reportPass(`Verified ${requiredFiles.length} required files.`);
    return;
  }

  for (const relativePath of missingFiles) {
    reportIssue("Missing required file", relativePath);
  }
}

function checkRedirects() {
  const redirectsPath = path.join(rootDir, "public/_redirects");
  if (!fs.existsSync(redirectsPath)) {
    reportIssue("Missing public/_redirects", "The SPA redirect fallback is required.");
    return;
  }

  const lines = fs.readFileSync(redirectsPath, "utf8").split(/\r?\n/);
  const fallbackLine = lines.find((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("/*") && trimmed.includes("/index.html") && trimmed.includes("200");
  });

  if (fallbackLine) {
    reportPass("Verified SPA fallback in public/_redirects.");
  } else {
    reportIssue(
      "Missing SPA fallback",
      'Add "/* /index.html 200" to the bottom of public/_redirects.'
    );
  }
}

function checkRobots() {
  const robotsPath = path.join(rootDir, "public/robots.txt");
  if (!fs.existsSync(robotsPath)) {
    reportIssue("Missing public/robots.txt", "Search engines need the robots file.");
    return;
  }

  const robotsContent = fs.readFileSync(robotsPath, "utf8");
  if (robotsContent.includes("Sitemap: https://www.mizan.page/sitemap.xml")) {
    reportPass("Verified robots.txt sitemap reference.");
  } else {
    reportIssue(
      "robots.txt sitemap mismatch",
      'Expected "Sitemap: https://www.mizan.page/sitemap.xml" in public/robots.txt.'
    );
  }
}

function checkViteConfig() {
  const vitePath = path.join(rootDir, "vite.config.ts");
  if (!fs.existsSync(vitePath)) {
    reportIssue("Missing vite.config.ts", "The Vite config is required.");
    return;
  }

  const viteContent = fs.readFileSync(vitePath, "utf8");
  if (viteContent.includes("dedupe") && viteContent.includes("react-router-dom")) {
    reportPass("Verified Vite dependency dedupe for React Router.");
  } else {
    reportIssue(
      "Missing Vite dedupe for React Router",
      "Add resolve.dedupe for react, react-dom, react-router, and react-router-dom."
    );
  }
}

const routeFile = resolveRouteFile();
if (!routeFile) {
  reportIssue(
    "Missing route file",
    "Could not find src/routes.tsx, src/routes.ts, src/app/routes.tsx, or src/app/routes.ts."
  );
}

const routePatterns = routeFile ? extractRoutePatterns(routeFile) : new Set(["/"]);
const publicAssets = collectPublicAssets(PUBLIC_ROOT);
const sourceFiles = listFiles(SOURCE_ROOT, SOURCE_EXTENSIONS);

checkRedirects();

for (const filePath of sourceFiles) {
  scanSourceFile(filePath, routePatterns, publicAssets);
}

console.log("");
if (issueCount === 0) {
  console.log("All route and link checks passed.");
} else {
  console.log(`Found ${issueCount} issue(s).`);
  process.exitCode = 1;
}