import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readText = (relativePath: string) => {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
};

test("auth forms link to the legal page anchors", () => {
  const login = readText("src/pages/Login.tsx");
  const signup = readText("src/components/auth/SignupForm.tsx");

  assert.ok(login.includes('localizedPath("/legal#terms")'));
  assert.ok(login.includes('localizedPath("/legal#privacy")'));
  assert.ok(signup.includes('localizedPath("/legal#terms")'));
  assert.ok(signup.includes('localizedPath("/legal#privacy")'));
});

test("layout chrome keeps the cookie policy and terms anchors", () => {
  const footer = readText("src/components/layout/Footer.tsx");
  const layout = readText("src/components/layout/Layout.tsx");

  assert.ok(footer.includes("/legal#cookies"));
  assert.ok(footer.includes("/legal#terms"));
  assert.ok(layout.includes("/legal#cookies"));
  assert.ok(layout.includes("/legal#terms"));
});
