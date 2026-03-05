import { describe, expect, it } from "vitest";
import { applyGraphFilters } from "@/lib/graph";
import { seededEntities, seededRelationships } from "@/lib/seedData";

describe("applyGraphFilters", () => {
  it("filters by min confidence", () => {
    const out = applyGraphFilters(seededEntities, seededRelationships, {
      search: "",
      type: "all",
      minConfidence: 0.8,
      strength: "all",
    });

    expect(out.entities.every((e) => e.confidence >= 0.8)).toBe(true);
    expect(out.relationships.every((r) => r.confidence >= 0.8)).toBe(true);
  });

  it("filters by strength", () => {
    const out = applyGraphFilters(seededEntities, seededRelationships, {
      search: "",
      type: "all",
      minConfidence: 0,
      strength: "high",
    });

    expect(out.relationships.every((r) => r.strength === "high")).toBe(true);
  });
});
