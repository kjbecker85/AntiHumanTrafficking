import type { EntityType } from "@/lib/types";

/**
 * Converts enum-like tokens into readable labels.
 * Example: "unknown_person" -> "Unknown Person".
 */
export function formatTokenLabel(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatEntityType(type: EntityType): string {
  return formatTokenLabel(type);
}

