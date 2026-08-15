import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";

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
      // Keys to check for identification
      const hasIdentifier = item.id || item.slug || item.key || item.code;
      // Keys to check for text/label content
      const hasLabel = 
        item.title || 
        item.term || 
        item.name || 
        item.word || 
        item.label || 
        item.heading || 
        item.term_ar || 
        item.term_fr;

      if (!hasIdentifier || !hasLabel) {
        console.error(`❌ Validation failed in ${file} at index ${index}.`);
        console.error(`   Missing valid identifier (id/slug) or label (title/term_ar/name).`);
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