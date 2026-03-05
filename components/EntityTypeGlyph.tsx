import type { ReactElement } from "react";
import type { EntityType } from "@/lib/types";
import { formatEntityType } from "@/lib/format";

/**
 * Reusable SVG icon glyphs for entity types.
 *
 * Why shared:
 * - Keeps icon language consistent across palette, board, and cards.
 * - Avoids duplicating switch logic in multiple components.
 */
export function EntityTypeGlyph({ type }: { type: EntityType }): ReactElement {
  switch (type) {
    case "person":
    case "suspect":
    case "victim":
    case "associate":
      return (
        <>
          <circle cx="0" cy="-5.5" r="3.8" fill="none" />
          <path d="M -6.5 7 C -6.5 1.5 6.5 1.5 6.5 7" fill="none" />
        </>
      );
    case "unknown_person":
      return (
        <>
          <path d="M -4 -5 C -4 -9 4 -9 4 -5 C 4 -2 1.5 -1.5 0 0 C -1.2 1.2 -1 2.5 -1 3.8" fill="none" />
          <circle cx="0" cy="7" r="1.2" />
        </>
      );
    case "phone":
      return <rect x="-5" y="-8" width="10" height="16" rx="1.8" ry="1.8" fill="none" />;
    case "email":
      return (
        <>
          <rect x="-7" y="-5.5" width="14" height="11" rx="1.5" ry="1.5" fill="none" />
          <path d="M -7 -5.5 L 0 0 L 7 -5.5" fill="none" />
        </>
      );
    case "vehicle":
      return (
        <>
          <rect x="-7.5" y="-2.5" width="15" height="7" rx="1.4" ry="1.4" fill="none" />
          <circle cx="-4.8" cy="5.2" r="1.6" />
          <circle cx="4.8" cy="5.2" r="1.6" />
        </>
      );
    case "license_plate":
      return <rect x="-7" y="-4.5" width="14" height="9" rx="1.2" ry="1.2" fill="none" />;
    case "location":
      return <path d="M 0 8 C -6 1.2 -7.2 -1.8 -7.2 -4.4 C -7.2 -8.2 -3.9 -11 0 -11 C 3.9 -11 7.2 -8.2 7.2 -4.4 C 7.2 -1.8 6 1.2 0 8 Z M 0 -1.3 A 3 3 0 1 0 0 -7.3 A 3 3 0 1 0 0 -1.3 Z" />;
    case "organization":
      return (
        <>
          <rect x="-6.8" y="-8.5" width="13.6" height="17" fill="none" />
          <path d="M -3.4 -8.5 V 8.5 M 0 -8.5 V 8.5 M 3.4 -8.5 V 8.5 M -6.8 -2.8 H 6.8 M -6.8 2.8 H 6.8" fill="none" />
        </>
      );
    case "account":
      return (
        <>
          <rect x="-7" y="-3.2" width="14" height="9.8" rx="1.8" ry="1.8" fill="none" />
          <path d="M -1.8 -3.2 V -5.8 H 4.6 V -3.2" fill="none" />
        </>
      );
    case "document":
      return (
        <>
          <path d="M -6.5 -8.5 H 2.5 L 6.5 -4.5 V 8.5 H -6.5 Z" fill="none" />
          <path d="M 2.5 -8.5 V -4.5 H 6.5" fill="none" />
        </>
      );
    default:
      return <polygon points="0,-8 8,0 0,8 -8,0" fill="none" />;
  }
}

export function getEntityTypeLabel(type: EntityType): string {
  return formatEntityType(type);
}
