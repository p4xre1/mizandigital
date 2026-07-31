import assert from "node:assert/strict";

export function assertRlsGuard(enabled: boolean) {
  assert.ok(enabled, "RLS must remain enabled");
}
