import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";

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

async function auditProject() {
  console.log("🔍 Scanning codebase for broken imports and missing files...\n");
  const files = await getFiles(resolve("src"));
  let brokenCount = 0;

  for (const file of files) {
    const content = await readFile(file, "utf8");
    // Match import statements or dynamic imports
    const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // Check relative paths and alias paths
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
          brokenCount++;
          const relativeFile = file.replace(resolve("."), "");
          console.log(`❌ Broken Import in: ${relativeFile}`);
          console.log(`   ↳ Unresolved path: "${importPath}"\n`);
        }
      }
    }
  }

  console.log("----------------------------------------");
  if (brokenCount === 0) {
    console.log("✨ All internal imports resolved successfully!");
  } else {
    console.log(`⚠️ Found ${brokenCount} broken reference(s) listed above.`);
  }
}

auditProject();