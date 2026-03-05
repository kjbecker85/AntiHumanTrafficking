import type { Entity, Relationship, UserRole } from "@/lib/types";

/**
 * Role-based masking helper.
 *
 * Rule for prototype:
 * - Analyst cannot view protected values directly.
 * - Supervisor can view protected values.
 */
export function maskEntityName(entity: Entity, role: UserRole): string {
  if (!entity.protectedFlag) return entity.displayName;
  if (role === "supervisor") return entity.displayName;
  return `Protected Entity (${entity.type})`;
}

export function canViewProtected(role: UserRole): boolean {
  return role === "supervisor";
}

export function strengthToWeight(strength: Relationship["strength"]): number {
  if (strength === "high") return 3;
  if (strength === "medium") return 2;
  return 1;
}
