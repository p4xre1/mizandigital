import { describe, test, expect } from "vitest";

function escapeJsonLd(str: string): string {
  return str
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/"/g, "\\u0022")
    .replace(/'/g, "\\u0027");
}

describe("jsonld escape", () => {
  test("escapes < > &", () => {
    const input = '<script>alert("x")</script> & more';
    const escaped = escapeJsonLd(input);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("\\u003c");
    expect(escaped).toContain("\\u0026");
  });

  test("escapes quotes", () => {
    const input = `"test" and 'test'`;
    const escaped = escapeJsonLd(input);
    expect(escaped).toContain("\\u0022");
    expect(escaped).toContain("\\u0027");
  });

  test("safe for arabic", () => {
    const input = "قانون المسطرة المدنية رقم 58.25";
    const escaped = escapeJsonLd(input);
    expect(escaped).toBe(input); // Arabic should not be escaped
  });
});
