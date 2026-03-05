import { describe, expect, it } from "vitest";
import { canViewProtected, maskEntityName } from "@/lib/auth";
import { seededEntities } from "@/lib/seedData";

describe("mask helpers", () => {
  const protectedEntity = seededEntities.find((e) => e.protectedFlag);

  it("masks protected entity for analyst", () => {
    if (!protectedEntity) throw new Error("missing protected entity in seed");
    expect(maskEntityName(protectedEntity, "analyst")).toContain("Protected Entity");
  });

  it("shows protected entity for supervisor", () => {
    if (!protectedEntity) throw new Error("missing protected entity in seed");
    expect(maskEntityName(protectedEntity, "supervisor")).toBe(protectedEntity.displayName);
    expect(canViewProtected("supervisor")).toBe(true);
  });
});
