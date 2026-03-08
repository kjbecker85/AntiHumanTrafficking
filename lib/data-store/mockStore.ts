import {
  addAuditEvent,
  addCase,
  addEntity,
  addReport,
  addRelationship,
  mockDb,
  mockDbPersistence,
  patchEntity,
  patchRelationship,
} from "@/lib/mockDb";
import {
  buildUserContext,
  createPasswordResetRequest,
  createSessionForUser,
  loginWithPassword,
  logoutSession,
  registerUser,
  requireSessionContext,
  resetPasswordWithToken,
  switchSessionRole,
} from "@/lib/authStore";
import type { InvestigationDataStore, PasswordResetResponse } from "@/lib/data-store/types";

export const mockStore: InvestigationDataStore = {
  backend: "mock",

  async getHealth() {
    return {
      backend: "mock",
      persistence: {
        enabled: mockDbPersistence.enabled,
        filePath: mockDbPersistence.filePath,
      },
      counts: {
        cases: mockDb.cases.length,
        entities: mockDb.entities.length,
        relationships: mockDb.relationships.length,
        reports: mockDb.reports.length,
        auditEvents: mockDb.auditEvents.length,
      },
    };
  },

  async getMe(token) {
    return requireSessionContext(mockDb, token);
  },

  async signup(payload) {
    const user = registerUser(mockDb, payload);
    const session = createSessionForUser(mockDb, user, user.defaultRole);
    return {
      token: session.token,
      user: buildUserContext(user, session.activeRole),
    };
  },

  async login(payload) {
    const result = loginWithPassword(mockDb, payload);
    return {
      token: result.session.token,
      user: result.context,
    };
  },

  async logout(token) {
    logoutSession(mockDb, token);
  },

  async switchRole(token, role) {
    return switchSessionRole(mockDb, token, role);
  },

  async requestPasswordReset(email): Promise<PasswordResetResponse> {
    const resetRequest = createPasswordResetRequest(mockDb, email);
    return {
      ok: true,
      token: resetRequest?.token ?? null,
      expiresAt: resetRequest?.expiresAt ?? null,
      message: resetRequest
        ? "Password reset token generated."
        : "If the account exists, a password reset token is ready.",
    };
  },

  async resetPassword(payload) {
    resetPasswordWithToken(mockDb, payload);
  },

  async listCases() {
    return mockDb.cases;
  },

  async createCase(payload) {
    return addCase(payload);
  },

  async listEntities(caseId) {
    return mockDb.entities.filter((entity) => entity.caseId === caseId);
  },

  async createEntity(caseId, payload) {
    return addEntity({
      ...payload,
      caseId,
    });
  },

  async updateEntity(entityId, payload) {
    return patchEntity(entityId, payload);
  },

  async listRelationships(caseId) {
    return mockDb.relationships.filter((relationship) => relationship.caseId === caseId);
  },

  async createRelationship(caseId, payload) {
    return addRelationship({
      ...payload,
      caseId,
    });
  },

  async updateRelationship(relationshipId, payload) {
    return patchRelationship(relationshipId, payload);
  },

  async listReports(caseId) {
    return mockDb.reports.filter((report) => report.caseId === caseId);
  },

  async createReport(payload) {
    return addReport(payload);
  },

  async addAuditEvent(payload) {
    return addAuditEvent(payload);
  },

  async getOperatorCaseBundle(caseId) {
    return {
      entities: mockDb.entities.filter((entity) => entity.caseId === caseId),
      relationships: mockDb.relationships.filter((relationship) => relationship.caseId === caseId),
      reports: mockDb.reports.filter((report) => report.caseId === caseId),
    };
  },
};
