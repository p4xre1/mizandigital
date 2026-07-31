import assert from "node:assert/strict";

export function assertSanitizedInput(value: string) {
  assert.ok(!value.includes("<script"));
}
