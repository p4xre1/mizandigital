import { globby } from "globby"; // You might need: pnpm add -D globby
import fs from "fs";

async function checkLinks() {
  const files = await globby("dist/**/*.html");
  let broken = 0;

  files.forEach(file => {
    const content = fs.readFileSync(file, "utf8");
    // Simple regex to find hrefs
    const links = content.match(/href="\/[^"]+"/g) || [];
    
    links.forEach(link => {
      const path = link.replace('href="/', 'dist/').replace('"', '');
      if (!fs.existsSync(path) && !path.includes("http")) {
        console.log(`⚠️ Broken link found in ${file}: ${link}`);
        broken++;
      }
    });
  });

  if (broken === 0) console.log("✨ All internal links are valid.");
}
checkLinks();