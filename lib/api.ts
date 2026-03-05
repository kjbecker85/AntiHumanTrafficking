import type { CaseRecord, Entity, OperatorAiBrief, Relationship, ReportRecord, UserContext, UserRole } from "@/lib/types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export const api = {
  getMe: () => getJson<UserContext>("/api/v1/me"),
  getCases: () => getJson<CaseRecord[]>("/api/v1/cases"),
  createCase: async (payload: Omit<CaseRecord, "id">) => {
    const response = await fetch("/api/v1/cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to create case");
    return response.json() as Promise<CaseRecord>;
  },
  getEntities: (caseId: string) => getJson<Entity[]>(`/api/v1/cases/${caseId}/entities`),
  createEntity: async (caseId: string, payload: Omit<Entity, "id" | "caseId">) => {
    const response = await fetch(`/api/v1/cases/${caseId}/entities`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to create entity");
    return response.json() as Promise<Entity>;
  },
  patchEntity: async (
    entityId: string,
    payload: Partial<Pick<Entity, "uniqueIdentity" | "uniqueIdentifierType" | "eventDateTime" | "descriptionText" | "attributes">>,
  ) => {
    const response = await fetch(`/api/v1/entities/${entityId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to patch entity");
    return response.json() as Promise<Entity>;
  },
  getRelationships: (caseId: string) => getJson<Relationship[]>(`/api/v1/cases/${caseId}/relationships`),
  createRelationship: async (caseId: string, payload: Omit<Relationship, "id" | "caseId">) => {
    const response = await fetch(`/api/v1/cases/${caseId}/relationships`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to create relationship");
    return response.json() as Promise<Relationship>;
  },
  getReports: (caseId: string) => getJson<ReportRecord[]>(`/api/v1/cases/${caseId}/reports`),
  patchRelationship: async (
    relationshipId: string,
    payload: Partial<Pick<Relationship, "strength" | "confidence" | "label" | "type">>,
  ) => {
    const response = await fetch(`/api/v1/relationships/${relationshipId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to patch relationship");
    return response.json() as Promise<Relationship>;
  },
  postAuditEvent: async (payload: { actorId: string; actionType: string; objectType: string; objectId: string; metadata?: Record<string, string | number | boolean> }) => {
    const response = await fetch("/api/v1/audit-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to post audit event");
    return response.json();
  },
  createReport: async (payload: Omit<ReportRecord, "id">) => {
    const response = await fetch("/api/v1/cases/report-entry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to create report");
    return response.json() as Promise<ReportRecord>;
  },
  getOperatorBrief: (caseId: string, role: UserRole, windowHours = 48) =>
    getJson<OperatorAiBrief>(`/api/v1/cases/${caseId}/operator-brief?role=${role}&windowHours=${windowHours}`),
};
