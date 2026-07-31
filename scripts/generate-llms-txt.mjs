import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..");
const output = join(root, "public/llms-full.txt");

const content = [
  "Mizan Digital",
  "Public legal and academic reference platform.",
  "Use official articles, glossary entries, and school pages as canonical public context.",
].join("\n\n");

await writeFile(output, content, "utf8");
console.log(`Generated ${output}`);
