import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readText = (relativePath: string) => {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
};

test("court rulings metadata uses the current legal anchors", () => {
  const content = readText("src/components/navigation/CourtRulingsData.ts");

  assert.ok(content.includes("legal#terms"));
  assert.ok(!content.includes("terms/media-license"));
  assert.ok(!content.includes("terms/licensing"));
});

test("offline indicator probes an existing asset", () => {
  const content = readText("src/components/pwa/OfflineIndicator.tsx");

  assert.ok(content.includes("Logo.svg?cache"));
  assert.ok(!content.includes("favicon.ico?cache"));
});

test("school canonical url uses the current public domain", () => {
  const content = readText("src/pages/schools/SchoolPage.tsx");

  assert.ok(content.includes("https://www.mizan.page/${currentLang}/schools/${school.slug}"));
  assert.ok(!content.includes("mizandigital.ma"));
});
