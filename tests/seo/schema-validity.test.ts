import assert from "node:assert/strict";

export function assertSchemaShape(schema: { [key: string]: unknown }) {
  assert.ok(schema["@context"] === "https://schema.org");
}
