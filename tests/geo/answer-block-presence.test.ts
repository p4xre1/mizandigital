import assert from "node:assert/strict";

export function assertAnswerBlockPresence(answer: string) {
  assert.ok(answer.trim().length > 0, "Answer block must not be empty");
}
