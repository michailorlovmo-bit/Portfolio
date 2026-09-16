import { describe, it, expect } from "vitest";
import { CATEGORIES, categoryDef, categoryLabel } from "./categories";

describe("CATEGORIES", () => {
  it("has exactly the 5 fixed pipeline phases, in order", () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual([
      "SURVEY",
      "EARTHWORKS",
      "CONSTRUCTION",
      "BLOWING",
      "SPLICING",
    ]);
    expect(CATEGORIES.map((c) => c.order)).toEqual([1, 2, 3, 4, 5]);
  });

  it("only requires Telekom approval for Earthworks", () => {
    const requiring = CATEGORIES.filter((c) => c.requiresTelekomApproval).map((c) => c.key);
    expect(requiring).toEqual(["EARTHWORKS"]);
  });

  it("every Greek label carries a stress accent (monotonic Greek requires one on multi-syllable words)", () => {
    const hasAccent = (s: string) => /[άέήίόύώΐΰ]/i.test(s);
    for (const c of CATEGORIES) {
      expect(hasAccent(c.labelEl), `${c.labelEl} is missing its tonos accent`).toBe(true);
    }
  });
});

describe("categoryDef", () => {
  it("returns the matching definition", () => {
    expect(categoryDef("SPLICING").labelEn).toBe("Splicing");
  });

  it("throws on an unknown key", () => {
    expect(() => categoryDef("NOT_A_CATEGORY")).toThrow();
  });
});

describe("categoryLabel", () => {
  it("combines the Greek and English labels", () => {
    expect(categoryLabel("SURVEY")).toBe("Αυτοψίες (Site Survey)");
  });

  it("falls back to the raw key for an unknown category", () => {
    expect(categoryLabel("MADE_UP")).toBe("MADE_UP");
  });
});
