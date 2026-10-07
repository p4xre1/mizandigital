import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { LABEL_KEYS, ID_KEYS, isValidRecord } from "./lib/data-shape.mjs";

const DATA_DIR = resolve("src/data");

async function validate() {
  const files = (await readdir(DATA_DIR)).filter(f => f.endsWith(".json"));
  let errors = 0;

  for (const file of files) {
    const raw = await readFile(join(DATA_DIR, file), "utf8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`❌ Error parsing ${file}: Invalid JSON syntax.`);
      errors++;
      continue;
    }

    const items = Array.isArray(data) ? data : (data.items || data.data || []);
    
    if (!Array.isArray(items)) {
      console.log(`ℹ️ Skipping ${file}: No array found.`);
      continue;
    }

    items.forEach((item, index) => {
      if (!isValidRecord(item)) {
        console.error(`❌ Validation failed in ${file} at index ${index}.`);
        console.error(`   Missing valid identifier (${ID_KEYS.join("/")}) or label (${LABEL_KEYS.slice(0, 4).join("/")}…).`);
        console.error(`   Found keys: [${Object.keys(item || {}).join(", ")}]`);
        errors++;
      }
    });
  }

  if (errors === 0) {
    console.log("✅ All JSON data structures are valid.");
  } else {
    process.exit(1);
  }
}

validate();