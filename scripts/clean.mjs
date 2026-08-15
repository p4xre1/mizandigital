import { rm } from "node:fs/promises";
import { resolve } from "node:path";

async function clean() {
  const folders = ["dist", ".vite", ".wrangler"];
  for (const folder of folders) {
    try {
      await rm(resolve(folder), { recursive: true, force: true });
      console.log(`🧹 Cleaned: ${folder}`);
    } catch (e) {
      // Ignore if folder doesn't exist
    }
  }
}
clean();