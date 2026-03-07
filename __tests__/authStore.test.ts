import { describe, expect, it } from "vitest";
import {
  buildUserContext,
  createPasswordResetRequest,
  createSessionForUser,
  loginWithPassword,
  registerUser,
  resetPasswordWithToken,
  switchSessionRole,
} from "@/lib/authStore";
import type { MockDatabase } from "@/lib/mockDb";
import { seededUsers } from "@/lib/seedData";

function createDb(): MockDatabase {
  return {
    users: JSON.parse(JSON.stringify(seededUsers)),
    sessions: [],
    passwordResetRequests: [],
    cases: [],
    entities: [],
    relationships: [],
    reports: [],
    attachments: [],
    auditEvents: [],
  };
}

describe("authStore", () => {
  it("registers a user with multiple assigned roles", () => {
    const db = createDb();
    const user = registerUser(db, {
      displayName: "New User",
      email: "new.user@example.com",
      password: "Password123!",
      assignedRoles: ["analyst", "supervisor"],
    });

    expect(user.assignedRoles).toEqual(["supervisor", "analyst"]);
    expect(user.defaultRole).toBe("supervisor");
  });

  it("creates a session and builds role-specific context", () => {
    const db = createDb();
    const user = db.users.find((item) => item.email === "command@demo.local");
    if (!user) throw new Error("missing seeded command user");

    const session = createSessionForUser(db, user, "operator");
    const context = buildUserContext(user, session.activeRole);

    expect(context.role).toBe("operator");
    expect(context.assignedRoles).toContain("supervisor");
    expect(context.permissions).toContain("report.write");
  });

  it("logs in and switches to another assigned role", () => {
    const db = createDb();
    const result = loginWithPassword(db, {
      email: "command@demo.local",
      password: "Password123!",
    });

    const updated = switchSessionRole(db, result.session.token, "analyst");
    expect(updated.role).toBe("analyst");
    expect(updated.permissions).toContain("relationship.write");
  });

  it("creates and consumes a password reset token", () => {
    const db = createDb();
    const resetRequest = createPasswordResetRequest(db, "analyst@demo.local");
    if (!resetRequest) throw new Error("missing reset request");

    resetPasswordWithToken(db, {
      token: resetRequest.token,
      password: "NewPassword123!",
    });

    const relogin = loginWithPassword(db, {
      email: "analyst@demo.local",
      password: "NewPassword123!",
    });

    expect(relogin.context.role).toBe("analyst");
    expect(db.passwordResetRequests[0].usedAt).toBeTruthy();
  });
});
