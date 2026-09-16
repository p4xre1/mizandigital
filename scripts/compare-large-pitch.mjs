#!/usr/bin/env node
// Compare large pitch.txt (3.5M+ chars) vs current codebase — streaming, no memory blowup
// Usage: node scripts/compare-large-pitch.mjs [path/to/pitch.txt]
// If pitch.txt is in uploads/pitch.txt, auto-detects

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const possiblePaths = [
  process.argv[2],
  "uploads/pitch.txt",
  "pitch.txt",
  "/home/user/mizandigital/uploads/pitch.txt",
].filter(Boolean);

let pitchPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) { pitchPath = p; break; }
}

if (!pitchPath) {
  console.log("No pitch file found. Tried:", possiblePaths);
  console.log("\nSolutions for 3.5M char file:");
  console.log("1. Upload via the LIVE PREVIEW server at :8787 (drag & drop)");
  console.log("2. Split: split -b 500k pitch.txt pitch_part_  then upload parts");
  console.log("3. Put file in repo: cp ~/pitch.txt ./uploads/pitch.txt");
  console.log("4. Paste first 2000 chars here to start analysis");
  process.exit(1);
}

const stat = fs.statSync(pitchPath);
console.log(`Found pitch: ${pitchPath} — ${(stat.size/1024/1024).toFixed(2)} MB, ${stat.size} chars`);

const CHUNK_SIZE = 100_000; // 100k chars per chunk
let totalChunks = Math.ceil(stat.size / CHUNK_SIZE);
console.log(`Will process in ${totalChunks} chunks of ${CHUNK_SIZE} chars`);

// Stream read and extract keywords
const keywords = {
  billing: ["billing", "payment", "stripe", "credit", "Mizan Pro", "pricing", "checkout", "subscription"],
  governance: ["governance", "moderation", "report", "guideline", "flag", "ban", "admin"],
  reactions: ["reaction", "like", "bookmark", "helpful", "fire", "insightful"],
  quiz: ["quiz", "attempt", "xp", "rank", "progression", "secure", "cheat"],
  security: ["security", "clerk", "RLS", "JWT", "CSP", "ad", "injection", "XSS"],
  analytics: ["analytics", "tracker", "interaction", "page_view"],
  saved: ["saved", "bookmark", "favorite"],
  admin: ["admin", "fraud", "intelligence", "limits", "users", "pricing management"],
};

const found = {};
for (const k of Object.keys(keywords)) found[k] = { count: 0, samples: [] };

let buffer = "";
let chunkIndex = 0;
const stream = fs.createReadStream(pitchPath, { encoding: "utf8", highWaterMark: CHUNK_SIZE });

for await (const chunk of stream) {
  const lower = chunk.toLowerCase();
  for (const [cat, words] of Object.entries(keywords)) {
    for (const w of words) {
      const lw = w.toLowerCase();
      const matches = lower.split(lw).length - 1;
      if (matches > 0) {
        found[cat].count += matches;
        if (found[cat].samples.length < 3) {
          const idx = lower.indexOf(lw);
          const sample = chunk.substring(Math.max(0, idx-50), idx+100).replace(/\n/g, " ");
          found[cat].samples.push(sample);
        }
      }
    }
  }
  chunkIndex++;
  if (chunkIndex % 10 === 0) console.log(`  processed ${chunkIndex}/${totalChunks} chunks...`);
}

console.log("\n=== Pitch Analysis ===");
for (const [cat, data] of Object.entries(found)) {
  console.log(`${cat}: ${data.count} hits`);
  data.samples.forEach(s => console.log(`  - ...${s}...`));
}

// Compare to codebase
console.log("\n=== Codebase Coverage ===");
const files = execSync("git diff origin/abdo --name-only", { encoding: "utf8" }).trim().split("\n");
const has = (pattern) => files.some(f => f.includes(pattern));

const coverage = {
  billing: has("billing") || has("stripe") || has("checkout"),
  governance: has("governance") || has("moderation") || has("report"),
  reactions: has("reaction"),
  quiz: has("quiz"),
  security: has("clerk") || has("_headers"),
  admin: has("FraudPrevention") || has("Intelligence"),
  saved: has("SavedContent"),
  pricing: has("PricingPage"),
};

for (const [k, v] of Object.entries(coverage)) {
  const pitchMentions = found[k]?.count || 0;
  console.log(`${k}: pitch mentions=${pitchMentions}, implemented=${v ? "YES" : "NO"} ${v ? "✅" : "❌"}`);
}

// Generate missing report
console.log("\n=== Missing / Gaps ===");
for (const [k, v] of Object.entries(coverage)) {
  if ((found[k]?.count > 5) && !v) {
    console.log(`GAP: pitch heavily mentions ${k} (${found[k].count} times) but not implemented`);
  }
}

console.log("\n=== Recommendations for 3.5M file ===");
console.log("- Use streaming parser (this script) not full load");
console.log("- Split into semantic sections: billing, governance, etc, then compare each");
console.log("- For full LLM compare, chunk into 100k and summarize each chunk, then aggregate");
console.log("- File saved at:", pitchPath);
