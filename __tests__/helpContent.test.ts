import { describe, expect, it } from "vitest";
import { helpContent } from "@/lib/helpContent";

describe("help content", () => {
  it("contains link-analysis entries", () => {
    const content = helpContent["link-analysis"];
    expect(content).toBeDefined();
    expect(content.tooltips.length).toBeGreaterThan(0);
    expect(content.tour.length).toBeGreaterThan(0);
  });
});
