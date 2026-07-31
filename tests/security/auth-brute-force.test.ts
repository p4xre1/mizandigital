import assert from "node:assert/strict";

export function assertRateLimited(attempts: number) {
  assert.ok(attempts < 10, "auth attempts should be rate-limited");
}
