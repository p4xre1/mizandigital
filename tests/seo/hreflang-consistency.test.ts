import assert from "node:assert/strict";

export function assertHreflangSet(tags: string[]) {
  assert.ok(tags.includes("ar"));
  assert.ok(tags.includes("en"));
}
