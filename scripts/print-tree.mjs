import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const ignoreDirs = new Set(["node_modules", "dist", ".git", ".wrangler"]);

async function printTree(dir, prefix = "") {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    // Filter out hidden files and ignored directories
    const filtered = entries.filter((e) => !e.name.startsWith(".") && !ignoreDirs.has(e.name));

    for (let i = 0; i < filtered.length; i++) {
      const entry = filtered[i];
      const isLast = i === filtered.length - 1;
      const pointer = isLast ? "└── " : "├── ";
      
      console.log(`${prefix}${pointer}${entry.name}`);

      if (entry.isDirectory()) {
        const extension = isLast ? "    " : "│   ";
        await printTree(join(dir, entry.name), prefix + extension);
      }
    }
  } catch (err) {
    console.error("Error reading directory:", err);
  }
}

const rootDir = resolve(".");
console.log(`📁 Project Tree: ${rootDir}\n.`);
await printTree(rootDir);