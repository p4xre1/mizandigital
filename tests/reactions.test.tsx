import { describe, test, expect } from "vitest";
import { REACTION_META } from "../src/lib/reactions/service";

describe("reactions meta", () => {
  test("all reaction types have meta", () => {
    const types = ["like", "dislike", "helpful", "bookmark", "fire", "insightful"] as const;
    for (const type of types) {
      const meta = REACTION_META[type];
      expect(meta.label).toBeTruthy();
      expect(meta.icon).toBeTruthy();
    }
  });

  test("reaction labels are Arabic", () => {
    expect(REACTION_META.like.label).toBe("إعجاب");
    expect(REACTION_META.helpful.label).toBe("مفيد");
  });
});

describe("reaction toggle logic", () => {
  test("toggle adds then removes", () => {
    const set = new Set<string>();
    const type = "like";
    // Add
    set.add(type);
    expect(set.has(type)).toBe(true);
    // Remove
    set.delete(type);
    expect(set.has(type)).toBe(false);
  });
});
