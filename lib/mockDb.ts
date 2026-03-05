import {
  demoUserContext,
  seededAttachments,
  seededAuditEvents,
  seededCases,
  seededEntities,
  seededRelationships,
  seededReports,
} from "@/lib/seedData";
import type { AuditEvent, CaseRecord, Entity, Relationship, UserContext } from "@/lib/types";

/**
 * In-memory mock database for API route handlers.
 *
 * This is intentionally simple for the frontend-first phase.
 * Azure persistence will replace this in phase 2 without changing contracts.
 */
export const mockDb = {
  userContext: { ...demoUserContext } as UserContext,
  cases: [...seededCases],
  entities: [...seededEntities],
  relationships: [...seededRelationships],
  reports: [...seededReports],
  attachments: [...seededAttachments],
  auditEvents: [...seededAuditEvents],
};

export function patchRelationship(
  relationshipId: string,
  updates: Partial<Pick<Relationship, "strength" | "confidence" | "label" | "type">>,
): Relationship | null {
  const item = mockDb.relationships.find((r) => r.id === relationshipId);
  if (!item) return null;

  if (updates.strength) {
    item.strength = updates.strength;
  }
  if (typeof updates.confidence === "number") {
    item.confidence = Math.max(0, Math.min(1, updates.confidence));
  }
  if (typeof updates.label === "string") {
    item.label = updates.label;
  }
  if (updates.type) {
    item.type = updates.type;
  }

  return item;
}

export function patchEntity(
  entityId: string,
  updates: Partial<Pick<Entity, "uniqueIdentity" | "uniqueIdentifierType" | "eventDateTime" | "descriptionText" | "attributes">>,
): Entity | null {
  const item = mockDb.entities.find((entity) => entity.id === entityId);
  if (!item) return null;

  if (typeof updates.uniqueIdentity === "string") {
    item.uniqueIdentity = updates.uniqueIdentity;
  }
  if (typeof updates.uniqueIdentifierType === "string") {
    item.uniqueIdentifierType = updates.uniqueIdentifierType;
  }
  if (typeof updates.eventDateTime === "string") {
    item.eventDateTime = updates.eventDateTime;
  }
  if (typeof updates.descriptionText === "string") {
    item.descriptionText = updates.descriptionText;
  }
  if (updates.attributes) {
    item.attributes = updates.attributes;
  }

  return item;
}

export function addAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
  const record: AuditEvent = {
    ...event,
    id: `audit-${String(mockDb.auditEvents.length + 1).padStart(3, "0")}`,
    timestamp: new Date().toISOString(),
  };
  mockDb.auditEvents.unshift(record);
  return record;
}

export function addCase(input: Omit<CaseRecord, "id">): CaseRecord {
  const record: CaseRecord = {
    ...input,
    id: `case-custom-${String(mockDb.cases.length + 1).padStart(3, "0")}`,
  };
  mockDb.cases.unshift(record);
  return record;
}

export function addEntity(input: Omit<Entity, "id">): Entity {
  const record: Entity = {
    ...input,
    id: `e${mockDb.entities.length + 1}`,
  };
  mockDb.entities.unshift(record);
  return record;
}

export function addRelationship(input: Omit<Relationship, "id">): Relationship {
  const record: Relationship = {
    ...input,
    id: `r${mockDb.relationships.length + 1}`,
  };
  mockDb.relationships.unshift(record);
  return record;
}
