import type {
  AuditEvent,
  CaseRecord,
  Entity,
  Relationship,
  ReportRecord,
  UserContext,
  UserRole,
} from "@/lib/types";

export type DataBackend = "mock" | "azure-sql";

export interface AuthPayload {
  displayName: string;
  email: string;
  password: string;
  assignedRoles: UserRole[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface PasswordResetResponse {
  ok: boolean;
  token: string | null;
  expiresAt: string | null;
  message: string;
}

export interface DataStoreHealth {
  backend: DataBackend;
  persistence: Record<string, string | boolean | null>;
  counts: {
    cases: number;
    entities: number;
    relationships: number;
    reports: number;
    auditEvents: number;
  };
}

export interface InvestigationDataStore {
  readonly backend: DataBackend;
  getHealth(): Promise<DataStoreHealth>;
  getMe(token: string): Promise<UserContext | null>;
  signup(payload: AuthPayload): Promise<{ token: string; user: UserContext }>;
  login(payload: LoginPayload): Promise<{ token: string; user: UserContext }>;
  logout(token: string): Promise<void>;
  switchRole(token: string, role: UserRole): Promise<UserContext>;
  requestPasswordReset(email: string): Promise<PasswordResetResponse>;
  resetPassword(payload: { token: string; password: string }): Promise<void>;
  listCases(): Promise<CaseRecord[]>;
  createCase(payload: Omit<CaseRecord, "id">): Promise<CaseRecord>;
  listEntities(caseId: string): Promise<Entity[]>;
  createEntity(caseId: string, payload: Omit<Entity, "id" | "caseId">): Promise<Entity>;
  updateEntity(
    entityId: string,
    payload: Partial<Pick<Entity, "uniqueIdentity" | "uniqueIdentifierType" | "eventDateTime" | "descriptionText" | "attributes">>,
  ): Promise<Entity | null>;
  listRelationships(caseId: string): Promise<Relationship[]>;
  createRelationship(caseId: string, payload: Omit<Relationship, "id" | "caseId">): Promise<Relationship>;
  updateRelationship(
    relationshipId: string,
    payload: Partial<Pick<Relationship, "strength" | "confidence" | "label" | "type">>,
  ): Promise<Relationship | null>;
  listReports(caseId: string): Promise<ReportRecord[]>;
  createReport(payload: Omit<ReportRecord, "id">): Promise<ReportRecord>;
  addAuditEvent(payload: Omit<AuditEvent, "id" | "timestamp">): Promise<AuditEvent>;
  getOperatorCaseBundle(caseId: string): Promise<{
    entities: Entity[];
    relationships: Relationship[];
    reports: ReportRecord[];
  }>;
}
