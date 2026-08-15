import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, join, dirname, extname } from "node:path";
import { execSync } from "node:child_process";

async function fileExists(filePath) {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

async function getFiles(dir, extensions = [".ts", ".tsx", ".js", ".jsx", ".json"]) {
  let results = [];
  const list = await readdir(dir, { withFileTypes: true });
  for (const entry of list) {
    const res = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", "dist", ".git", ".wrangler"].includes(entry.name)) {
        results = results.concat(await getFiles(res, extensions));
      }
    } else if (extensions.includes(extname(res))) {
      results.push(res);
    }
  }
  return results;
}

async function runDoctor() {
  console.log("🩺 Running Mizan Project Diagnostic (Doctor)...\n");
  let hasErrors = false;

  // 1. Validate JSON Files
  console.log("📂 [1/3] Checking JSON Data Integrity...");
  const DATA_DIR = resolve("src/data");
  try {
    const jsonFiles = (await readdir(DATA_DIR)).filter(f => f.endsWith(".json"));
    let jsonErrors = 0;
    for (const file of jsonFiles) {
      const raw = await readFile(join(DATA_DIR, file), "utf8");
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.error(`  ❌ Syntax error in ${file}`);
        jsonErrors++;
        continue;
      }
      const items = Array.isArray(data) ? data : (data.items || data.data || []);
      if (Array.isArray(items)) {
        items.forEach((item, index) => {
          const hasIdentifier = item.id || item.slug || item.key || item.code;
          const hasLabel = item.title || item.term || item.name || item.word || item.label || item.heading || item.term_ar || item.term_fr;
          if (!hasIdentifier || !hasLabel) {
            console.error(`  ❌ ${file} [index ${index}]: Missing identifier or label.`);
            jsonErrors++;
          }
        });
      }
    }
    if (jsonErrors === 0) {
      console.log("  ✨ All JSON files are valid!\n");
    } else {
      hasErrors = true;
      console.log(`  ⚠️ Found ${jsonErrors} JSON issue(s).\n`);
    }
  } catch {
    console.log("  ℹ️ No data directory found or skipped.\n");
  }

  // 2. Audit Code Imports
  console.log("🔍 [2/3] Checking for Broken Code Imports...");
  try {
    const sourceFiles = await getFiles(resolve("src"));
    let brokenImports = 0;
    for (const file of sourceFiles) {
      const content = await readFile(file, "utf8");
      const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith(".") || importPath.startsWith("@/")) {
          let targetPath;
          const fileDir = dirname(file);
          if (importPath.startsWith("@/")) {
            targetPath = resolve("src", importPath.slice(2));
          } else {
            targetPath = resolve(fileDir, importPath);
          }
          const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".json", "/index.ts", "/index.tsx", "/index.js"];
          let exists = false;
          for (const ext of extensions) {
            if (await fileExists(targetPath + ext)) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            brokenImports++;
            console.log(`  ❌ Broken import in ${file.replace(resolve("."), "")} -> "${importPath}"`);
          }
        }
      }
    }
    if (brokenImports === 0) {
      console.log("  ✨ All internal imports resolve successfully!\n");
    } else {
      hasErrors = true;
      console.log(`  ⚠️ Found ${brokenImports} broken import(s).\n`);
    }
  } catch (e) {
    console.error("  ❌ Error running import audit:", e.message);
    hasErrors = true;
  }

  // 3. TypeScript Compilation Check
  console.log("⚡ [3/3] Running TypeScript Compilation Check...");
  try {
    execSync("npx tsc --noEmit", { stdio: "inherit" });
    console.log("  ✨ TypeScript type checking passed with 0 errors!\n");
  } catch {
    hasErrors = true;
    console.log("  ❌ TypeScript compilation errors found above.\n");
  }

  console.log("----------------------------------------");
  if (hasErrors) {
    console.log("❌ Diagnostics completed with issues. Review logs above.");
    process.exit(1);
  } else {
    console.log("✨ All diagnostic tests passed! Your project is clean.");
  }
}

runDoctor();
