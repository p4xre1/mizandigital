import assert from "node:assert/strict";

export function assertAllowedMime(mime: string) {
  assert.ok(["image/png", "image/jpeg", "application/pdf"].includes(mime));
}
