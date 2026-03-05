/**
 * Core domain types used across UI pages, mocked APIs, and tests.
 *
 * Why this file exists:
 * - New developers can learn the app data model in one location.
 * - Frontend and backend can stay contract-compatible over time.
 */

export type UserRole = "analyst" | "operator" | "supervisor";

export interface CaseRecord {
  id: string;
  name: string;
  status: "open" | "monitoring" | "closed";
  jurisdiction: string;
  priority: "low" | "medium" | "high";
  ownerId: string;
  reviewDate: string;
  tags: string[];
}

export type EntityType =
  | "person"
  | "suspect"
  | "unknown_person"
  | "victim"
  | "associate"
  | "organization"
  | "phone"
  | "email"
  | "vehicle"
  | "license_plate"
  | "location"
  | "account"
  | "document";

export interface Entity {
  id: string;
  caseId: string;
  type: EntityType;
  displayName: string;
  aliases: string[];
  confidence: number;
  protectedFlag: boolean;
  descriptors: string[];
  uniqueIdentity?: string;
  uniqueIdentifierType?: string;
  eventDateTime?: string;
  descriptionText?: string;
  attributes?: Record<string, string>;
  imageUrl?: string;
  geo?: {
    lat: number;
    lon: number;
    address?: string;
  };
}

export interface Relationship {
  id: string;
  caseId: string;
  fromEntityId: string;
  toEntityId: string;
  type: "contact" | "co_location" | "financial" | "communication" | "association";
  strength: "low" | "medium" | "high";
  confidence: number;
  sourceCount: number;
  label?: string;
}

export interface ReportRecord {
  id: string;
  caseId: string;
  timeObserved: string;
  location: string;
  narrative: string;
  sourceType: "open_source" | "partner_submission" | "field_observation" | "internal_note";
  relatedEntityIds: string[];
}

export interface OperatorAiEvidenceItem {
  reportId: string;
  timeObserved: string;
  location: string;
  narrative: string;
  relatedEntityIds: string[];
}

export interface OperatorAiWatchItem {
  entityId: string;
  entityName: string;
  type: EntityType;
  score: number;
  rationale: string;
}

export interface OperatorAiRecommendation {
  id: string;
  title: string;
  priority: "immediate" | "soon" | "monitor";
  rationale: string;
  evidenceReportIds: string[];
}

export interface OperatorAiPrediction {
  nextEventWindowStart: string;
  nextEventWindowEnd: string;
  predictedLocation: string;
  predictedLat?: number;
  predictedLon?: number;
  probability: number;
}

export interface OperatorAiBrief {
  caseId: string;
  generatedAt: string;
  summary: string;
  prediction: OperatorAiPrediction;
  watchItems: OperatorAiWatchItem[];
  recommendations: OperatorAiRecommendation[];
  evidence: OperatorAiEvidenceItem[];
  riskNotes: string[];
}

export interface AttachmentRecord {
  id: string;
  parentType: "case" | "entity" | "report";
  parentId: string;
  fileType: "image" | "pdf" | "spreadsheet" | "note";
  storagePath: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actionType: string;
  objectType: string;
  objectId: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface UserContext {
  userId: string;
  role: UserRole;
  permissions: string[];
  compartments: string[];
}
