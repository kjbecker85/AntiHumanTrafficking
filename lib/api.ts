import type { CaseRecord, Entity, OperatorAiBrief, Relationship, ReportRecord, UserContext, UserRole } from "@/lib/types";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message || `Request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export const api = {
  getMe: (token: string) =>
    getJson<UserContext>("/api/v1/me", {
      headers: { authorization: `Bearer ${token}` },
    }),
  signup: async (payload: { displayName: string; email: string; password: string; assignedRoles: UserRole[] }) =>
    getJson<{ token: string; user: UserContext }>("/api/v1/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  login: async (payload: { email: string; password: string }) =>
    getJson<{ token: string; user: UserContext }>("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  logout: async (token: string) =>
    getJson<{ ok: boolean }>("/api/v1/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }),
  switchRole: async (token: string, role: UserRole) =>
    getJson<{ user: UserContext }>("/api/v1/auth/active-role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, role }),
    }),
  requestPasswordReset: async (email: string) =>
    getJson<{ ok: boolean; token: string | null; expiresAt: string | null; message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  resetPassword: async (payload: { token: string; password: string }) =>
    getJson<{ ok: boolean }>("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
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
