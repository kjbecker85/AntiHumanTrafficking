import { createHash, randomUUID } from "node:crypto";
import type { MockDatabase } from "@/lib/mockDb";
import { persistMockDb } from "@/lib/mockDb";
import type { AuthSession, PasswordResetRequest, UserAccount, UserContext, UserRole } from "@/lib/types";

const resetTokenTtlMs = 1000 * 60 * 30;

const rolePermissions: Record<UserRole, string[]> = {
  analyst: ["case.read", "entity.read", "entity.write", "relationship.read", "relationship.write", "report.read"],
  operator: ["case.read", "entity.read", "report.read", "report.write", "operator.brief.read"],
  supervisor: ["case.read", "entity.read", "relationship.read", "report.read", "briefing.read", "protected.read"],
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function rolePriority(role: UserRole): number {
  if (role === "supervisor") return 3;
  if (role === "operator") return 2;
  return 1;
}

function getPermissionsForRole(role: UserRole): string[] {
  return rolePermissions[role];
}

export function buildUserContext(user: UserAccount, activeRole: UserRole): UserContext {
  return {
    isAuthenticated: true,
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: activeRole,
    assignedRoles: [...user.assignedRoles],
    permissions: getPermissionsForRole(activeRole),
    compartments: activeRole === "supervisor" ? ["general", "protected"] : ["general"],
  };
}

export function getUserByEmail(db: MockDatabase, email: string): UserAccount | undefined {
  const normalized = normalizeEmail(email);
  return db.users.find((user) => normalizeEmail(user.email) === normalized);
}

export function getSessionByToken(db: MockDatabase, token: string): AuthSession | undefined {
  return db.sessions.find((session) => session.token === token);
}

export function requireSessionContext(db: MockDatabase, token: string): UserContext | null {
  const session = getSessionByToken(db, token);
  if (!session) return null;

  const user = db.users.find((candidate) => candidate.id === session.userId);
  if (!user) return null;

  session.lastAccessedAt = new Date().toISOString();
  persistMockDb();
  return buildUserContext(user, session.activeRole);
}

export function registerUser(
  db: MockDatabase,
  input: { displayName: string; email: string; password: string; assignedRoles: UserRole[] },
): UserAccount {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  const dedupedRoles = [...new Set(input.assignedRoles)].sort((a, b) => rolePriority(b) - rolePriority(a));

  if (!displayName) {
    throw new Error("Display name is required.");
  }
  if (!email) {
    throw new Error("Email is required.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (dedupedRoles.length === 0) {
    throw new Error("Select at least one role.");
  }
  if (getUserByEmail(db, email)) {
    throw new Error("An account with that email already exists.");
  }

  const now = new Date().toISOString();
  const user: UserAccount = {
    id: `user-${randomUUID()}`,
    displayName,
    email,
    passwordHash: hashPassword(input.password),
    assignedRoles: dedupedRoles,
    defaultRole: dedupedRoles[0],
    createdAt: now,
    updatedAt: now,
  };

  db.users.unshift(user);
  persistMockDb();
  return user;
}

export function createSessionForUser(db: MockDatabase, user: UserAccount, activeRole = user.defaultRole): AuthSession {
  if (!user.assignedRoles.includes(activeRole)) {
    throw new Error("Selected role is not assigned to this account.");
  }

  const now = new Date().toISOString();
  const session: AuthSession = {
    token: randomUUID(),
    userId: user.id,
    activeRole,
    createdAt: now,
    lastAccessedAt: now,
  };

  db.sessions = db.sessions.filter((candidate) => candidate.userId !== user.id);
  db.sessions.unshift(session);
  persistMockDb();
  return session;
}

export function loginWithPassword(
  db: MockDatabase,
  input: { email: string; password: string },
): { session: AuthSession; user: UserAccount; context: UserContext } {
  const user = getUserByEmail(db, input.email);
  if (!user || user.passwordHash !== hashPassword(input.password)) {
    throw new Error("Invalid email or password.");
  }

  const session = createSessionForUser(db, user, user.defaultRole);
  return {
    session,
    user,
    context: buildUserContext(user, session.activeRole),
  };
}

export function logoutSession(db: MockDatabase, token: string) {
  db.sessions = db.sessions.filter((session) => session.token !== token);
  persistMockDb();
}

export function switchSessionRole(db: MockDatabase, token: string, nextRole: UserRole): UserContext {
  const session = getSessionByToken(db, token);
  if (!session) {
    throw new Error("Session not found.");
  }

  const user = db.users.find((candidate) => candidate.id === session.userId);
  if (!user) {
    throw new Error("User not found.");
  }
  if (!user.assignedRoles.includes(nextRole)) {
    throw new Error("Role not assigned to this account.");
  }

  session.activeRole = nextRole;
  session.lastAccessedAt = new Date().toISOString();
  user.defaultRole = nextRole;
  user.updatedAt = session.lastAccessedAt;
  persistMockDb();
  return buildUserContext(user, nextRole);
}

export function createPasswordResetRequest(
  db: MockDatabase,
  email: string,
): PasswordResetRequest | null {
  const user = getUserByEmail(db, email);
  if (!user) {
    return null;
  }

  const now = Date.now();
  const request: PasswordResetRequest = {
    token: randomUUID(),
    userId: user.id,
    email: user.email,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + resetTokenTtlMs).toISOString(),
  };

  db.passwordResetRequests = db.passwordResetRequests.filter(
    (item) => item.userId !== user.id || Boolean(item.usedAt),
  );
  db.passwordResetRequests.unshift(request);
  persistMockDb();
  return request;
}

export function resetPasswordWithToken(
  db: MockDatabase,
  input: { token: string; password: string },
): UserAccount {
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const request = db.passwordResetRequests.find((item) => item.token === input.token);
  if (!request) {
    throw new Error("Reset token is invalid.");
  }
  if (request.usedAt) {
    throw new Error("Reset token has already been used.");
  }
  if (new Date(request.expiresAt).getTime() < Date.now()) {
    throw new Error("Reset token has expired.");
  }

  const user = db.users.find((candidate) => candidate.id === request.userId);
  if (!user) {
    throw new Error("User not found.");
  }

  user.passwordHash = hashPassword(input.password);
  user.updatedAt = new Date().toISOString();
  request.usedAt = user.updatedAt;
  db.sessions = db.sessions.filter((session) => session.userId !== user.id);
  persistMockDb();
  return user;
}
