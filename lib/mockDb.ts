import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  demoUserContext,
  seededAttachments,
  seededAuditEvents,
  seededCases,
  seededEntities,
  seededRelationships,
  seededReports,
} from "@/lib/seedData";
import type { AttachmentRecord, AuditEvent, CaseRecord, Entity, Relationship, ReportRecord, UserContext } from "@/lib/types";

export interface MockDatabase {
  userContext: UserContext;
  cases: CaseRecord[];
  entities: Entity[];
  relationships: Relationship[];
  reports: ReportRecord[];
  attachments: AttachmentRecord[];
  auditEvents: AuditEvent[];
}

function cloneSeedState(): MockDatabase {
  return JSON.parse(JSON.stringify({
    userContext: demoUserContext,
    cases: seededCases,
    entities: seededEntities,
    relationships: seededRelationships,
    reports: seededReports,
    attachments: seededAttachments,
    auditEvents: seededAuditEvents,
  })) as MockDatabase;
}

const persistenceDir = process.env.DATA_DIR?.trim();
const persistenceFilePath = persistenceDir ? path.join(persistenceDir, "mock-db.json") : null;

export const mockDbPersistence = {
  enabled: Boolean(persistenceFilePath),
  filePath: persistenceFilePath,
};

function writeDatabaseSnapshot(snapshot: MockDatabase) {
  if (!persistenceFilePath) return;

  mkdirSync(path.dirname(persistenceFilePath), { recursive: true });
  writeFileSync(persistenceFilePath, JSON.stringify(snapshot, null, 2), "utf8");
}

function loadDatabase(): MockDatabase {
  const seededState = cloneSeedState();
  if (!persistenceFilePath) {
    return seededState;
  }

  try {
    if (!existsSync(persistenceFilePath)) {
      writeDatabaseSnapshot(seededState);
      return seededState;
    }

    const serialized = readFileSync(persistenceFilePath, "utf8");
    return JSON.parse(serialized) as MockDatabase;
  } catch (error) {
    console.error("Failed to load persisted mock database. Falling back to seeded state.", error);
    return seededState;
  }
}

export function persistMockDb() {
  if (!persistenceFilePath) return;

  try {
    writeDatabaseSnapshot(mockDb);
  } catch (error) {
    console.error("Failed to persist mock database snapshot.", error);
  }
}

/**
 * Mock database for API route handlers.
 *
 * By default this stays in-memory for local development.
 * When DATA_DIR is set, changes are mirrored to disk for single-instance demos.
 */
export const mockDb = loadDatabase();

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

  persistMockDb();
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

  persistMockDb();
  return item;
}

export function addAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
  const record: AuditEvent = {
    ...event,
    id: `audit-${String(mockDb.auditEvents.length + 1).padStart(3, "0")}`,
    timestamp: new Date().toISOString(),
  };
  mockDb.auditEvents.unshift(record);
  persistMockDb();
  return record;
}

export function addCase(input: Omit<CaseRecord, "id">): CaseRecord {
  const record: CaseRecord = {
    ...input,
    id: `case-custom-${String(mockDb.cases.length + 1).padStart(3, "0")}`,
  };
  mockDb.cases.unshift(record);
  persistMockDb();
  return record;
}

export function addEntity(input: Omit<Entity, "id">): Entity {
  const record: Entity = {
    ...input,
    id: `e${mockDb.entities.length + 1}`,
  };
  mockDb.entities.unshift(record);
  persistMockDb();
  return record;
}

export function addRelationship(input: Omit<Relationship, "id">): Relationship {
  const record: Relationship = {
    ...input,
    id: `r${mockDb.relationships.length + 1}`,
  };
  mockDb.relationships.unshift(record);
  persistMockDb();
  return record;
}

export function addReport(input: Omit<ReportRecord, "id">): ReportRecord {
  const record: ReportRecord = {
    ...input,
    id: `rep-${String(mockDb.reports.length + 1).padStart(3, "0")}`,
  };
  mockDb.reports.unshift(record);
  persistMockDb();
  return record;
}
