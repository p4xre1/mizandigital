import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : /\.(tsx?|jsx?|json)$/.test(path) ? [path] : [];
  });
}

describe("clean UI presentation", () => {
  it("keeps UI copy free of bullet separators without changing password masking", () => {
    for (const path of ["src/pages", "src/components", "src/layouts", "src/data", "src/content", "shared/i18n"].flatMap(filesIn)) {
      const copy = read(path).split("\n")
        .filter((line) => !/^\s*(\*|\/\/)/.test(line))
        .join("\n").replace('placeholder="••••••••"', "");
      expect(copy, path).not.toMatch(/[•·⚫◼▪]|&(?:bull|middot);|&#(?:8226|183);/);
    }
    expect(read("src/pages/auth/LoginPage.tsx")).toContain('placeholder="••••••••"');
  });

  it("does not decorate sign-up with an AI sparkle or powered-by-AI label", () => {
    const login = read("src/pages/auth/LoginPage.tsx");
    expect(login).not.toMatch(/Sparkles|powered\s+by\s+AI/i);
    expect(login).toContain("إنشاء الحساب والبروفايل");
  });

  it("uses solid backgrounds and standard borders on pricing cards", () => {
    for (const path of [
      "src/components/billing/MizanProCard.tsx",
      "src/components/billing/ProUpgradeCard.tsx",
      "src/components/payments/PackageCard.tsx",
    ]) {
      const card = read(path);
      expect(card, path).toContain("border border-border bg-card");
      expect(card, path).not.toMatch(/gradient|shadow|ring-2|animate-|glow/);
    }
    const home = read("src/pages/public/HomePage.tsx");
    const pricing = home.slice(home.indexOf("الأسعار - خطط مرنة"), home.indexOf("لماذا نحن"));
    expect(pricing).not.toMatch(/gradient|shadow|animate-|glow|md:-mt-/);
    expect(pricing).toContain('text-foreground">سنوي');
    expect(read("src/pages/public/PaymentsPage.tsx")).not.toContain("bg-gradient");
  });
});
