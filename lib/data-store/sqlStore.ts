import "server-only";

import { randomUUID } from "node:crypto";
import { buildUserContext, hashPassword, normalizeEmail } from "@/lib/authStore";
import type { InvestigationDataStore, PasswordResetResponse } from "@/lib/data-store/types";
import type { AuditEvent, CaseRecord, Entity, Relationship, ReportRecord, UserAccount, UserContext, UserRole } from "@/lib/types";

let poolPromise: Promise<any> | null = null;

function resolveBackendConfig() {
  const connectionString = process.env.AZURE_SQL_CONNECTION_STRING?.trim();
  if (connectionString) {
    return connectionString;
  }

  const server = process.env.AZURE_SQL_SERVER?.trim();
  const database = process.env.AZURE_SQL_DATABASE?.trim();
  const user = process.env.AZURE_SQL_USER?.trim();
  const password = process.env.AZURE_SQL_PASSWORD?.trim();
  const port = Number(process.env.AZURE_SQL_PORT ?? "1433");
  const trustServerCertificate = process.env.AZURE_SQL_TRUST_SERVER_CERTIFICATE === "true";

  if (!server || !database || !user || !password) {
    throw new Error(
      "Azure SQL backend selected but AZURE_SQL_CONNECTION_STRING or AZURE_SQL_SERVER/AZURE_SQL_DATABASE/AZURE_SQL_USER/AZURE_SQL_PASSWORD are not fully configured.",
    );
  }

  return {
    server,
    database,
    user,
    password,
    port,
    options: {
      encrypt: true,
      trustServerCertificate,
    },
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000,
    },
  };
}

async function loadSqlModule() {
  return import("mssql");
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const sql = await loadSqlModule();
      const pool = new sql.ConnectionPool(resolveBackendConfig());
      return pool.connect();
    })();
  }

  return poolPromise;
}

function sortRoles(roles: UserRole[]): UserRole[] {
  const priority: Record<UserRole, number> = {
    supervisor: 3,
    operator: 2,
    analyst: 1,
  };

  return [...new Set(roles)].sort((a, b) => priority[b] - priority[a]);
}

function createLegacyId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function runInTransaction<T>(handler: (sql: any, transaction: any) => Promise<T>): Promise<T> {
  const sql = await loadSqlModule();
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const result = await handler(sql, transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    throw error;
  }
}

async function loadUserByEmail(email: string) {
  const sql = await loadSqlModule();
  const pool = await getPool();
  const request = pool.request();
  request.input("email", sql.NVarChar(320), normalizeEmail(email));
  const result = await request.query(`
    SELECT
      u.user_sk AS userSk,
      u.legacy_user_id AS id,
      u.display_name AS displayName,
      u.email,
      u.password_hash AS passwordHash,
      u.default_role_code AS defaultRole,
      u.created_at AS createdAt,
      u.updated_at AS updatedAt,
      ura.role_code AS roleCode
    FROM auth.user_profile AS u
    LEFT JOIN auth.user_role_assignment AS ura
      ON ura.user_sk = u.user_sk
    WHERE LOWER(u.email) = @email
      AND u.is_active = 1;
  `);

  return hydrateUser(result.recordset);
}

async function loadUserBySessionToken(token: string) {
  if (!looksLikeUuid(token)) {
    return null;
  }

  const sql = await loadSqlModule();
  const pool = await getPool();
  const request = pool.request();
  request.input("token", sql.UniqueIdentifier, token);
  const result = await request.query(`
    SELECT
      s.auth_session_sk AS sessionSk,
      CAST(s.session_nk AS nvarchar(36)) AS token,
      s.active_role_code AS activeRole,
      u.user_sk AS userSk,
      u.legacy_user_id AS id,
      u.display_name AS displayName,
      u.email,
      u.password_hash AS passwordHash,
      u.default_role_code AS defaultRole,
      u.created_at AS createdAt,
      u.updated_at AS updatedAt,
      ura.role_code AS roleCode
    FROM auth.auth_session AS s
    INNER JOIN auth.user_profile AS u
      ON u.user_sk = s.user_sk
    LEFT JOIN auth.user_role_assignment AS ura
      ON ura.user_sk = u.user_sk
    WHERE s.session_nk = @token
      AND s.revoked_at IS NULL
      AND u.is_active = 1;
  `);

  if (result.recordset.length === 0) {
    return null;
  }

  const hydrated = hydrateUser(result.recordset);
  return hydrated ? {
    sessionSk: Number(result.recordset[0].sessionSk),
    token: String(result.recordset[0].token),
    activeRole: result.recordset[0].activeRole as UserRole,
    user: hydrated,
  } : null;
}

function hydrateUser(rows: any[]): (UserAccount & { userSk: number }) | null {
  if (rows.length === 0) {
    return null;
  }

  const first = rows[0];
  const assignedRoles = sortRoles(
    rows
      .map((row) => row.roleCode as UserRole | null)
      .filter((role): role is UserRole => role === "analyst" || role === "operator" || role === "supervisor"),
  );

  return {
    userSk: Number(first.userSk),
    id: String(first.id),
    displayName: String(first.displayName),
    email: String(first.email),
    passwordHash: String(first.passwordHash ?? ""),
    assignedRoles,
    defaultRole: (first.defaultRole as UserRole) ?? assignedRoles[0] ?? "analyst",
    createdAt: new Date(first.createdAt).toISOString(),
    updatedAt: new Date(first.updatedAt).toISOString(),
  };
}

async function revokeSessionsForUser(transaction: any, sql: any, userSk: number) {
  const request = transaction.request();
  request.input("userSk", sql.BigInt, userSk);
  await request.query(`
    UPDATE auth.auth_session
    SET revoked_at = SYSUTCDATETIME()
    WHERE user_sk = @userSk
      AND revoked_at IS NULL;
  `);
}

async function createSession(transaction: any, sql: any, userSk: number, activeRole: UserRole): Promise<string> {
  const token = randomUUID();
  const request = transaction.request();
  request.input("token", sql.UniqueIdentifier, token);
  request.input("userSk", sql.BigInt, userSk);
  request.input("activeRole", sql.NVarChar(32), activeRole);
  await request.query(`
    INSERT INTO auth.auth_session (
      session_nk,
      user_sk,
      active_role_code,
      created_at,
      last_accessed_at
    )
    VALUES (
      @token,
      @userSk,
      @activeRole,
      SYSUTCDATETIME(),
      SYSUTCDATETIME()
    );
  `);
  return token;
}

function mapCaseRows(caseRows: any[], tagRows: any[]): CaseRecord[] {
  const tagMap = new Map<string, string[]>();
  tagRows.forEach((row) => {
    const key = String(row.id);
    const list = tagMap.get(key) ?? [];
    list.push(String(row.tag));
    tagMap.set(key, list);
  });

  return caseRows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    status: row.status as CaseRecord["status"],
    jurisdiction: String(row.jurisdiction),
    priority: row.priority as CaseRecord["priority"],
    ownerId: String(row.ownerId ?? ""),
    reviewDate: new Date(row.reviewDate).toISOString().slice(0, 10),
    tags: tagMap.get(String(row.id)) ?? [],
  }));
}

function mapEntityRows(entityRows: any[], aliasRows: any[], descriptorRows: any[], attributeRows: any[]): Entity[] {
  const aliasMap = new Map<string, string[]>();
  const descriptorMap = new Map<string, string[]>();
  const attributeMap = new Map<string, Record<string, string>>();

  aliasRows.forEach((row) => {
    const key = String(row.id);
    const list = aliasMap.get(key) ?? [];
    list.push(String(row.alias));
    aliasMap.set(key, list);
  });

  descriptorRows.forEach((row) => {
    const key = String(row.id);
    const list = descriptorMap.get(key) ?? [];
    list.push(String(row.descriptor));
    descriptorMap.set(key, list);
  });

  attributeRows.forEach((row) => {
    const key = String(row.id);
    const attributes = attributeMap.get(key) ?? {};
    attributes[String(row.attributeName)] = String(row.attributeValue);
    attributeMap.set(key, attributes);
  });

  return entityRows.map((row) => ({
    id: String(row.id),
    caseId: String(row.caseId),
    type: row.type as Entity["type"],
    displayName: String(row.displayName),
    aliases: aliasMap.get(String(row.id)) ?? [],
    confidence: Number(row.confidence),
    protectedFlag: Boolean(row.protectedFlag),
    descriptors: descriptorMap.get(String(row.id)) ?? [],
    uniqueIdentity: row.uniqueIdentity ? String(row.uniqueIdentity) : undefined,
    uniqueIdentifierType: row.uniqueIdentifierType ? String(row.uniqueIdentifierType) : undefined,
    eventDateTime: row.eventDateTime ? new Date(row.eventDateTime).toISOString() : undefined,
    descriptionText: row.descriptionText ? String(row.descriptionText) : undefined,
    attributes: attributeMap.get(String(row.id)),
    imageUrl: row.imageUrl ? String(row.imageUrl) : undefined,
    geo: row.lat != null && row.lon != null
      ? {
          lat: Number(row.lat),
          lon: Number(row.lon),
          address: row.address ? String(row.address) : undefined,
        }
      : undefined,
  }));
}

function mapReportRows(reportRows: any[], reportEntityRows: any[]): ReportRecord[] {
  const reportEntityMap = new Map<string, string[]>();
  reportEntityRows.forEach((row) => {
    const key = String(row.id);
    const list = reportEntityMap.get(key) ?? [];
    list.push(String(row.entityId));
    reportEntityMap.set(key, list);
  });

  return reportRows.map((row) => ({
    id: String(row.id),
    caseId: String(row.caseId),
    timeObserved: new Date(row.timeObserved).toISOString(),
    location: String(row.location),
    narrative: String(row.narrative),
    sourceType: row.sourceType as ReportRecord["sourceType"],
    relatedEntityIds: reportEntityMap.get(String(row.id)) ?? [],
  }));
}

export const sqlStore: InvestigationDataStore = {
  backend: "azure-sql",

  async getHealth() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT_BIG(*) FROM core.case_record) AS caseCount,
        (SELECT COUNT_BIG(*) FROM core.entity) AS entityCount,
        (SELECT COUNT_BIG(*) FROM core.relationship) AS relationshipCount,
        (SELECT COUNT_BIG(*) FROM ops.report) AS reportCount,
        (SELECT COUNT_BIG(*) FROM audit.audit_event) AS auditEventCount;
    `);

    const row = result.recordset[0] ?? {};
    return {
      backend: "azure-sql",
      persistence: {
        connectionStringConfigured: Boolean(process.env.AZURE_SQL_CONNECTION_STRING?.trim()),
        server: process.env.AZURE_SQL_SERVER?.trim() ?? null,
        database: process.env.AZURE_SQL_DATABASE?.trim() ?? null,
      },
      counts: {
        cases: Number(row.caseCount ?? 0),
        entities: Number(row.entityCount ?? 0),
        relationships: Number(row.relationshipCount ?? 0),
        reports: Number(row.reportCount ?? 0),
        auditEvents: Number(row.auditEventCount ?? 0),
      },
    };
  },

  async getMe(token) {
    const record = await loadUserBySessionToken(token);
    if (!record) {
      return null;
    }

    const sql = await loadSqlModule();
    const pool = await getPool();
    const request = pool.request();
    request.input("sessionSk", sql.BigInt, record.sessionSk);
    await request.query(`
      UPDATE auth.auth_session
      SET last_accessed_at = SYSUTCDATETIME()
      WHERE auth_session_sk = @sessionSk;
    `);

    return buildUserContext(record.user, record.activeRole);
  },

  async signup(payload) {
    const email = normalizeEmail(payload.email);
    const displayName = payload.displayName.trim();
    const assignedRoles = sortRoles(payload.assignedRoles);
    if (!displayName) {
      throw new Error("Display name is required.");
    }
    if (!email) {
      throw new Error("Email is required.");
    }
    if (payload.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    if (assignedRoles.length === 0) {
      throw new Error("Select at least one role.");
    }

    const existing = await loadUserByEmail(email);
    if (existing) {
      throw new Error("An account with that email already exists.");
    }

    const userId = createLegacyId("user");
    const passwordHash = hashPassword(payload.password);
    const defaultRole = assignedRoles[0];

    return runInTransaction(async (sql, transaction) => {
      const userInsert = transaction.request();
      userInsert.input("legacyUserId", sql.NVarChar(64), userId);
      userInsert.input("displayName", sql.NVarChar(200), displayName);
      userInsert.input("email", sql.NVarChar(320), email);
      userInsert.input("passwordHash", sql.NVarChar(128), passwordHash);
      userInsert.input("defaultRole", sql.NVarChar(32), defaultRole);
      const userResult = await userInsert.query(`
        INSERT INTO auth.user_profile (
          legacy_user_id,
          display_name,
          email,
          password_hash,
          default_role_code,
          is_active,
          created_at,
          updated_at
        )
        OUTPUT INSERTED.user_sk AS userSk
        VALUES (
          @legacyUserId,
          @displayName,
          @email,
          @passwordHash,
          @defaultRole,
          1,
          SYSUTCDATETIME(),
          SYSUTCDATETIME()
        );
      `);
      const userSk = Number(userResult.recordset[0].userSk);

      for (const role of assignedRoles) {
        const roleRequest = transaction.request();
        roleRequest.input("userSk", sql.BigInt, userSk);
        roleRequest.input("roleCode", sql.NVarChar(32), role);
        await roleRequest.query(`
          INSERT INTO auth.user_role_assignment (user_sk, role_code)
          VALUES (@userSk, @roleCode);
        `);
      }

      const token = await createSession(transaction, sql, userSk, defaultRole);
      const user: UserAccount = {
        id: userId,
        displayName,
        email,
        passwordHash,
        assignedRoles,
        defaultRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        token,
        user: buildUserContext(user, defaultRole),
      };
    });
  },

  async login(payload) {
    const user = await loadUserByEmail(payload.email);
    const sql = await loadSqlModule();
    const pool = await getPool();
    if (!user || user.passwordHash !== hashPassword(payload.password)) {
      const failure = pool.request();
      failure.input("email", sql.NVarChar(320), normalizeEmail(payload.email));
      failure.input("isSuccessful", sql.Bit, false);
      failure.input("failureReason", sql.NVarChar(128), "Invalid email or password.");
      await failure.query(`
        INSERT INTO auth.login_attempt (
          email,
          is_successful,
          failure_reason,
          attempted_at
        )
        VALUES (
          @email,
          @isSuccessful,
          @failureReason,
          SYSUTCDATETIME()
        );
      `);
      throw new Error("Invalid email or password.");
    }

    return runInTransaction(async (innerSql, transaction) => {
      await revokeSessionsForUser(transaction, innerSql, user.userSk);
      const token = await createSession(transaction, innerSql, user.userSk, user.defaultRole);

      const loginRequest = transaction.request();
      loginRequest.input("userSk", innerSql.BigInt, user.userSk);
      loginRequest.input("email", innerSql.NVarChar(320), user.email);
      loginRequest.input("isSuccessful", innerSql.Bit, true);
      await loginRequest.query(`
        INSERT INTO auth.login_attempt (
          user_sk,
          email,
          is_successful,
          attempted_at
        )
        VALUES (
          @userSk,
          @email,
          @isSuccessful,
          SYSUTCDATETIME()
        );
      `);

      return {
        token,
        user: buildUserContext(user, user.defaultRole),
      };
    });
  },

  async logout(token) {
    if (!looksLikeUuid(token)) {
      return;
    }

    const sql = await loadSqlModule();
    const pool = await getPool();
    const request = pool.request();
    request.input("token", sql.UniqueIdentifier, token);
    await request.query(`
      UPDATE auth.auth_session
      SET revoked_at = SYSUTCDATETIME()
      WHERE session_nk = @token
        AND revoked_at IS NULL;
    `);
  },

  async switchRole(token, role) {
    const session = await loadUserBySessionToken(token);
    if (!session) {
      throw new Error("Session not found.");
    }
    if (!session.user.assignedRoles.includes(role)) {
      throw new Error("Role not assigned to this account.");
    }

    const sql = await loadSqlModule();
    const pool = await getPool();

    const sessionRequest = pool.request();
    sessionRequest.input("token", sql.UniqueIdentifier, token);
    sessionRequest.input("activeRole", sql.NVarChar(32), role);
    await sessionRequest.query(`
      UPDATE auth.auth_session
      SET active_role_code = @activeRole,
          last_accessed_at = SYSUTCDATETIME()
      WHERE session_nk = @token
        AND revoked_at IS NULL;
    `);

    const userRequest = pool.request();
    userRequest.input("userSk", sql.BigInt, session.user.userSk);
    userRequest.input("defaultRole", sql.NVarChar(32), role);
    await userRequest.query(`
      UPDATE auth.user_profile
      SET default_role_code = @defaultRole,
          updated_at = SYSUTCDATETIME()
      WHERE user_sk = @userSk;
    `);

    return buildUserContext({
      ...session.user,
      defaultRole: role,
      updatedAt: new Date().toISOString(),
    }, role);
  },

  async requestPasswordReset(email): Promise<PasswordResetResponse> {
    const user = await loadUserByEmail(email);
    if (!user) {
      return {
        ok: true,
        token: null,
        expiresAt: null,
        message: "If the account exists, a password reset token is ready.",
      };
    }

    const sql = await loadSqlModule();
    const pool = await getPool();
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const request = pool.request();
    request.input("userSk", sql.BigInt, user.userSk);
    request.input("email", sql.NVarChar(320), user.email);
    request.input("passwordResetNk", sql.UniqueIdentifier, randomUUID());
    request.input("tokenHash", sql.NVarChar(128), hashPassword(token));
    request.input("expiresAt", sql.DateTime2, new Date(expiresAt));
    await request.query(`
      UPDATE auth.password_reset
      SET used_at = SYSUTCDATETIME()
      WHERE user_sk = @userSk
        AND used_at IS NULL;

      INSERT INTO auth.password_reset (
        password_reset_nk,
        user_sk,
        email,
        token_hash,
        created_at,
        expires_at
      )
      VALUES (
        @passwordResetNk,
        @userSk,
        @email,
        @tokenHash,
        SYSUTCDATETIME(),
        @expiresAt
      );
    `);

    return {
      ok: true,
      token,
      expiresAt,
      message: "Password reset token generated.",
    };
  },

  async resetPassword(payload) {
    if (payload.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const sql = await loadSqlModule();
    const pool = await getPool();
    const lookup = pool.request();
    lookup.input("tokenHash", sql.NVarChar(128), hashPassword(payload.token));
    const result = await lookup.query(`
      SELECT TOP (1)
        pr.password_reset_sk AS passwordResetSk,
        pr.user_sk AS userSk,
        pr.expires_at AS expiresAt,
        pr.used_at AS usedAt
      FROM auth.password_reset AS pr
      WHERE pr.token_hash = @tokenHash
      ORDER BY pr.created_at DESC;
    `);

    const record = result.recordset[0];
    if (!record) {
      throw new Error("Reset token is invalid.");
    }
    if (record.usedAt) {
      throw new Error("Reset token has already been used.");
    }
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw new Error("Reset token has expired.");
    }

    await runInTransaction(async (innerSql, transaction) => {
      const updatePassword = transaction.request();
      updatePassword.input("userSk", innerSql.BigInt, Number(record.userSk));
      updatePassword.input("passwordHash", innerSql.NVarChar(128), hashPassword(payload.password));
      await updatePassword.query(`
        UPDATE auth.user_profile
        SET password_hash = @passwordHash,
            updated_at = SYSUTCDATETIME()
        WHERE user_sk = @userSk;
      `);

      const updateReset = transaction.request();
      updateReset.input("passwordResetSk", innerSql.BigInt, Number(record.passwordResetSk));
      await updateReset.query(`
        UPDATE auth.password_reset
        SET used_at = SYSUTCDATETIME()
        WHERE password_reset_sk = @passwordResetSk;
      `);

      const revokeSessions = transaction.request();
      revokeSessions.input("userSk", innerSql.BigInt, Number(record.userSk));
      await revokeSessions.query(`
        UPDATE auth.auth_session
        SET revoked_at = SYSUTCDATETIME()
        WHERE user_sk = @userSk
          AND revoked_at IS NULL;
      `);
    });
  },

  async listCases() {
    const pool = await getPool();

    const [caseResult, tagResult] = await Promise.all([
      pool.request().query(`
        SELECT
          cr.legacy_case_id AS id,
          cr.case_name AS name,
          cr.status_code AS status,
          cr.jurisdiction,
          cr.priority_code AS priority,
          ISNULL(owner.legacy_user_id, cr.owner_legacy_user_id) AS ownerId,
          cr.review_date AS reviewDate
        FROM core.case_record AS cr
        LEFT JOIN auth.user_profile AS owner
          ON owner.user_sk = cr.owner_user_sk
        ORDER BY cr.review_date ASC, cr.case_name ASC;
      `),
      pool.request().query(`
        SELECT
          cr.legacy_case_id AS id,
          ct.tag_text AS tag
        FROM core.case_tag AS ct
        INNER JOIN core.case_record AS cr
          ON cr.case_sk = ct.case_sk;
      `),
    ]);

    return mapCaseRows(caseResult.recordset, tagResult.recordset);
  },

  async createCase(payload) {
    return runInTransaction(async (sql, transaction) => {
      const caseId = createLegacyId("case");
      const insert = transaction.request();
      insert.input("caseNk", sql.UniqueIdentifier, randomUUID());
      insert.input("legacyCaseId", sql.NVarChar(64), caseId);
      insert.input("caseName", sql.NVarChar(200), payload.name);
      insert.input("statusCode", sql.NVarChar(32), payload.status);
      insert.input("jurisdiction", sql.NVarChar(120), payload.jurisdiction);
      insert.input("priorityCode", sql.NVarChar(32), payload.priority);
      insert.input("ownerLegacyUserId", sql.NVarChar(64), payload.ownerId);
      insert.input("reviewDate", sql.Date, new Date(payload.reviewDate));
      const result = await insert.query(`
        INSERT INTO core.case_record (
          case_nk,
          legacy_case_id,
          case_name,
          status_code,
          jurisdiction,
          priority_code,
          owner_user_sk,
          owner_legacy_user_id,
          review_date,
          created_at,
          updated_at
        )
        OUTPUT INSERTED.case_sk AS caseSk
        VALUES (
          @caseNk,
          @legacyCaseId,
          @caseName,
          @statusCode,
          @jurisdiction,
          @priorityCode,
          (SELECT TOP (1) user_sk FROM auth.user_profile WHERE legacy_user_id = @ownerLegacyUserId),
          @ownerLegacyUserId,
          @reviewDate,
          SYSUTCDATETIME(),
          SYSUTCDATETIME()
        );
      `);
      const caseSk = Number(result.recordset[0].caseSk);

      for (const tag of payload.tags) {
        const tagRequest = transaction.request();
        tagRequest.input("caseSk", sql.BigInt, caseSk);
        tagRequest.input("tagText", sql.NVarChar(100), tag);
        await tagRequest.query(`
          INSERT INTO core.case_tag (case_sk, tag_text)
          VALUES (@caseSk, @tagText);
        `);
      }

      return {
        ...payload,
        id: caseId,
      };
    });
  },

  async listEntities(caseId) {
    const sql = await loadSqlModule();
    const pool = await getPool();

    const baseRequest = pool.request();
    baseRequest.input("caseId", sql.NVarChar(64), caseId);
    const baseResult = await baseRequest.query(`
      SELECT
        e.legacy_entity_id AS id,
        cr.legacy_case_id AS caseId,
        e.entity_type_code AS type,
        e.display_name AS displayName,
        CAST(e.confidence AS float) AS confidence,
        e.protected_flag AS protectedFlag,
        e.unique_identity AS uniqueIdentity,
        e.unique_identifier_type AS uniqueIdentifierType,
        e.event_datetime AS eventDateTime,
        e.description_text AS descriptionText,
        e.image_url AS imageUrl,
        loc.latitude AS lat,
        loc.longitude AS lon,
        loc.address
      FROM core.entity AS e
      INNER JOIN core.entity_case AS ec
        ON ec.entity_sk = e.entity_sk
      INNER JOIN core.case_record AS cr
        ON cr.case_sk = ec.case_sk
      OUTER APPLY (
        SELECT TOP (1)
          l.latitude,
          l.longitude,
          l.address
        FROM core.entity_location AS el
        INNER JOIN core.location AS l
          ON l.location_sk = el.location_sk
        WHERE el.entity_sk = e.entity_sk
        ORDER BY CASE WHEN el.is_primary = 1 THEN 0 ELSE 1 END, el.entity_location_sk
      ) AS loc
      WHERE cr.legacy_case_id = @caseId
      ORDER BY e.display_name ASC;
    `);

    const [aliasResult, descriptorResult, attributeResult] = await Promise.all([
      (() => {
        const request = pool.request();
        request.input("caseId", sql.NVarChar(64), caseId);
        return request.query(`
          SELECT
            e.legacy_entity_id AS id,
            ea.alias_text AS alias
          FROM core.entity_alias AS ea
          INNER JOIN core.entity AS e
            ON e.entity_sk = ea.entity_sk
          INNER JOIN core.entity_case AS ec
            ON ec.entity_sk = e.entity_sk
          INNER JOIN core.case_record AS cr
            ON cr.case_sk = ec.case_sk
          WHERE cr.legacy_case_id = @caseId;
        `);
      })(),
      (() => {
        const request = pool.request();
        request.input("caseId", sql.NVarChar(64), caseId);
        return request.query(`
          SELECT
            e.legacy_entity_id AS id,
            ed.descriptor_text AS descriptor
          FROM core.entity_descriptor AS ed
          INNER JOIN core.entity AS e
            ON e.entity_sk = ed.entity_sk
          INNER JOIN core.entity_case AS ec
            ON ec.entity_sk = e.entity_sk
          INNER JOIN core.case_record AS cr
            ON cr.case_sk = ec.case_sk
          WHERE cr.legacy_case_id = @caseId;
        `);
      })(),
      (() => {
        const request = pool.request();
        request.input("caseId", sql.NVarChar(64), caseId);
        return request.query(`
          SELECT
            e.legacy_entity_id AS id,
            eat.attribute_name AS attributeName,
            eat.attribute_value AS attributeValue
          FROM core.entity_attribute AS eat
          INNER JOIN core.entity AS e
            ON e.entity_sk = eat.entity_sk
          INNER JOIN core.entity_case AS ec
            ON ec.entity_sk = e.entity_sk
          INNER JOIN core.case_record AS cr
            ON cr.case_sk = ec.case_sk
          WHERE cr.legacy_case_id = @caseId;
        `);
      })(),
    ]);

    return mapEntityRows(baseResult.recordset, aliasResult.recordset, descriptorResult.recordset, attributeResult.recordset);
  },

  async createEntity(caseId, payload) {
    return runInTransaction(async (sql, transaction) => {
      const entityId = createLegacyId("entity");
      let locationSk: number | null = null;

      const caseLookup = transaction.request();
      caseLookup.input("caseId", sql.NVarChar(64), caseId);
      const caseResult = await caseLookup.query(`
        SELECT TOP (1) case_sk AS caseSk
        FROM core.case_record
        WHERE legacy_case_id = @caseId;
      `);
      const caseSk = caseResult.recordset[0]?.caseSk;
      if (!caseSk) {
        throw new Error("Case not found.");
      }

      if (payload.geo) {
        const locationRequest = transaction.request();
        locationRequest.input("locationNk", sql.UniqueIdentifier, randomUUID());
        locationRequest.input("displayName", sql.NVarChar(200), payload.geo.address ?? payload.displayName);
        locationRequest.input("address", sql.NVarChar(400), payload.geo.address ?? null);
        locationRequest.input("latitude", sql.Float, payload.geo.lat);
        locationRequest.input("longitude", sql.Float, payload.geo.lon);
        const locationResult = await locationRequest.query(`
          INSERT INTO core.location (
            location_nk,
            display_name,
            address,
            latitude,
            longitude,
            created_at,
            updated_at
          )
          OUTPUT INSERTED.location_sk AS locationSk
          VALUES (
            @locationNk,
            @displayName,
            @address,
            @latitude,
            @longitude,
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
          );
        `);
        locationSk = Number(locationResult.recordset[0].locationSk);
      }

      const insertEntity = transaction.request();
      insertEntity.input("entityNk", sql.UniqueIdentifier, randomUUID());
      insertEntity.input("legacyEntityId", sql.NVarChar(64), entityId);
      insertEntity.input("entityTypeCode", sql.NVarChar(32), payload.type);
      insertEntity.input("displayName", sql.NVarChar(200), payload.displayName);
      insertEntity.input("confidence", sql.Float, payload.confidence);
      insertEntity.input("protectedFlag", sql.Bit, payload.protectedFlag);
      insertEntity.input("uniqueIdentity", sql.NVarChar(200), payload.uniqueIdentity ?? null);
      insertEntity.input("uniqueIdentifierType", sql.NVarChar(100), payload.uniqueIdentifierType ?? null);
      insertEntity.input("eventDateTime", sql.DateTime2, payload.eventDateTime ? new Date(payload.eventDateTime) : null);
      insertEntity.input("descriptionText", sql.NVarChar(sql.MAX), payload.descriptionText ?? null);
      insertEntity.input("imageUrl", sql.NVarChar(sql.MAX), payload.imageUrl ?? null);
      const entityResult = await insertEntity.query(`
        INSERT INTO core.entity (
          entity_nk,
          legacy_entity_id,
          entity_type_code,
          display_name,
          confidence,
          protected_flag,
          unique_identity,
          unique_identifier_type,
          event_datetime,
          description_text,
          image_url,
          created_at,
          updated_at
        )
        OUTPUT INSERTED.entity_sk AS entitySk
        VALUES (
          @entityNk,
          @legacyEntityId,
          @entityTypeCode,
          @displayName,
          @confidence,
          @protectedFlag,
          @uniqueIdentity,
          @uniqueIdentifierType,
          @eventDateTime,
          @descriptionText,
          @imageUrl,
          SYSUTCDATETIME(),
          SYSUTCDATETIME()
        );
      `);
      const entitySk = Number(entityResult.recordset[0].entitySk);

      const bridgeRequest = transaction.request();
      bridgeRequest.input("entitySk", sql.BigInt, entitySk);
      bridgeRequest.input("caseSk", sql.BigInt, Number(caseSk));
      await bridgeRequest.query(`
        INSERT INTO core.entity_case (entity_sk, case_sk, is_primary)
        VALUES (@entitySk, @caseSk, 1);
      `);

      if (payload.protectedFlag) {
        const sensitiveRequest = transaction.request();
        sensitiveRequest.input("entitySk", sql.BigInt, entitySk);
        await sensitiveRequest.query(`
          INSERT INTO core.entity_sensitive (entity_sk, redaction_reason, sensitive_json)
          VALUES (@entitySk, N'Protected entity workflow', NULL);
        `);
      }

      if (locationSk) {
        const locationBridge = transaction.request();
        locationBridge.input("entitySk", sql.BigInt, entitySk);
        locationBridge.input("locationSk", sql.BigInt, locationSk);
        await locationBridge.query(`
          INSERT INTO core.entity_location (entity_sk, location_sk, is_primary)
          VALUES (@entitySk, @locationSk, 1);
        `);
      }

      for (const alias of payload.aliases) {
        const aliasRequest = transaction.request();
        aliasRequest.input("entitySk", sql.BigInt, entitySk);
        aliasRequest.input("aliasText", sql.NVarChar(200), alias);
        await aliasRequest.query(`
          INSERT INTO core.entity_alias (entity_sk, alias_text)
          VALUES (@entitySk, @aliasText);
        `);
      }

      for (const descriptor of payload.descriptors) {
        const descriptorRequest = transaction.request();
        descriptorRequest.input("entitySk", sql.BigInt, entitySk);
        descriptorRequest.input("descriptorText", sql.NVarChar(200), descriptor);
        await descriptorRequest.query(`
          INSERT INTO core.entity_descriptor (entity_sk, descriptor_text)
          VALUES (@entitySk, @descriptorText);
        `);
      }

      for (const [attributeName, attributeValue] of Object.entries(payload.attributes ?? {})) {
        const attributeRequest = transaction.request();
        attributeRequest.input("entitySk", sql.BigInt, entitySk);
        attributeRequest.input("attributeName", sql.NVarChar(200), attributeName);
        attributeRequest.input("attributeValue", sql.NVarChar(sql.MAX), attributeValue);
        await attributeRequest.query(`
          INSERT INTO core.entity_attribute (entity_sk, attribute_name, attribute_value)
          VALUES (@entitySk, @attributeName, @attributeValue);
        `);
      }

      return {
        ...payload,
        id: entityId,
        caseId,
      };
    });
  },

  async updateEntity(entityId, payload) {
    const sql = await loadSqlModule();
    const pool = await getPool();
    const lookup = pool.request();
    lookup.input("entityId", sql.NVarChar(64), entityId);
    const lookupResult = await lookup.query(`
      SELECT TOP (1) entity_sk AS entitySk
      FROM core.entity
      WHERE legacy_entity_id = @entityId;
    `);
    const entitySk = lookupResult.recordset[0]?.entitySk;
    if (!entitySk) {
      return null;
    }

    await runInTransaction(async (innerSql, transaction) => {
      const updateRequest = transaction.request();
      updateRequest.input("entitySk", innerSql.BigInt, Number(entitySk));
      updateRequest.input("uniqueIdentity", innerSql.NVarChar(200), payload.uniqueIdentity ?? null);
      updateRequest.input("uniqueIdentifierType", innerSql.NVarChar(100), payload.uniqueIdentifierType ?? null);
      updateRequest.input("eventDateTime", innerSql.DateTime2, payload.eventDateTime ? new Date(payload.eventDateTime) : null);
      updateRequest.input("descriptionText", innerSql.NVarChar(innerSql.MAX), payload.descriptionText ?? null);
      await updateRequest.query(`
        UPDATE core.entity
        SET unique_identity = CASE WHEN @uniqueIdentity IS NULL THEN unique_identity ELSE @uniqueIdentity END,
            unique_identifier_type = CASE WHEN @uniqueIdentifierType IS NULL THEN unique_identifier_type ELSE @uniqueIdentifierType END,
            event_datetime = CASE WHEN @eventDateTime IS NULL THEN event_datetime ELSE @eventDateTime END,
            description_text = CASE WHEN @descriptionText IS NULL THEN description_text ELSE @descriptionText END,
            updated_at = SYSUTCDATETIME()
        WHERE entity_sk = @entitySk;
      `);

      if (payload.attributes) {
        const deleteRequest = transaction.request();
        deleteRequest.input("entitySk", innerSql.BigInt, Number(entitySk));
        await deleteRequest.query(`
          DELETE FROM core.entity_attribute
          WHERE entity_sk = @entitySk;
        `);

        for (const [attributeName, attributeValue] of Object.entries(payload.attributes)) {
          const insertRequest = transaction.request();
          insertRequest.input("entitySk", innerSql.BigInt, Number(entitySk));
          insertRequest.input("attributeName", innerSql.NVarChar(200), attributeName);
          insertRequest.input("attributeValue", innerSql.NVarChar(innerSql.MAX), attributeValue);
          await insertRequest.query(`
            INSERT INTO core.entity_attribute (entity_sk, attribute_name, attribute_value)
            VALUES (@entitySk, @attributeName, @attributeValue);
          `);
        }
      }
    });

    const caseLookup = pool.request();
    caseLookup.input("entityId", sql.NVarChar(64), entityId);
    const caseResult = await caseLookup.query(`
      SELECT TOP (1) cr.legacy_case_id AS caseId
      FROM core.entity AS e
      INNER JOIN core.entity_case AS ec
        ON ec.entity_sk = e.entity_sk
      INNER JOIN core.case_record AS cr
        ON cr.case_sk = ec.case_sk
      WHERE e.legacy_entity_id = @entityId
      ORDER BY CASE WHEN ec.is_primary = 1 THEN 0 ELSE 1 END, ec.entity_case_sk;
    `);

    const caseId = caseResult.recordset[0]?.caseId;
    if (!caseId) {
      return null;
    }

    const entities = await sqlStore.listEntities(String(caseId));
    return entities.find((entity) => entity.id === entityId) ?? null;
  },

  async listRelationships(caseId) {
    const sql = await loadSqlModule();
    const pool = await getPool();
    const request = pool.request();
    request.input("caseId", sql.NVarChar(64), caseId);
    const result = await request.query(`
      SELECT
        r.legacy_relationship_id AS id,
        cr.legacy_case_id AS caseId,
        fe.legacy_entity_id AS fromEntityId,
        te.legacy_entity_id AS toEntityId,
        r.relationship_type_code AS type,
        r.strength_code AS strength,
        CAST(r.confidence AS float) AS confidence,
        r.source_count AS sourceCount,
        r.label
      FROM core.relationship AS r
      INNER JOIN core.case_record AS cr
        ON cr.case_sk = r.case_sk
      INNER JOIN core.entity AS fe
        ON fe.entity_sk = r.from_entity_sk
      INNER JOIN core.entity AS te
        ON te.entity_sk = r.to_entity_sk
      WHERE cr.legacy_case_id = @caseId
      ORDER BY r.updated_at DESC, r.created_at DESC;
    `);

    return result.recordset.map((row: any) => ({
      id: String(row.id),
      caseId: String(row.caseId),
      fromEntityId: String(row.fromEntityId),
      toEntityId: String(row.toEntityId),
      type: row.type as Relationship["type"],
      strength: row.strength as Relationship["strength"],
      confidence: Number(row.confidence),
      sourceCount: Number(row.sourceCount),
      label: row.label ? String(row.label) : undefined,
    }));
  },

  async createRelationship(caseId, payload) {
    return runInTransaction(async (sql, transaction) => {
      const caseLookup = transaction.request();
      caseLookup.input("caseId", sql.NVarChar(64), caseId);
      const caseResult = await caseLookup.query(`
        SELECT TOP (1) case_sk AS caseSk
        FROM core.case_record
        WHERE legacy_case_id = @caseId;
      `);
      const caseSk = caseResult.recordset[0]?.caseSk;
      if (!caseSk) {
        throw new Error("Case not found.");
      }

      const entityLookup = transaction.request();
      entityLookup.input("fromEntityId", sql.NVarChar(64), payload.fromEntityId);
      entityLookup.input("toEntityId", sql.NVarChar(64), payload.toEntityId);
      const entityResult = await entityLookup.query(`
        SELECT
          legacy_entity_id AS legacyEntityId,
          entity_sk AS entitySk
        FROM core.entity
        WHERE legacy_entity_id IN (@fromEntityId, @toEntityId);
      `);
      const entityMap = new Map<string, number>(
        entityResult.recordset.map((row: any) => [String(row.legacyEntityId), Number(row.entitySk)]),
      );
      const fromEntitySk = entityMap.get(payload.fromEntityId);
      const toEntitySk = entityMap.get(payload.toEntityId);
      if (!fromEntitySk || !toEntitySk) {
        throw new Error("Entity not found.");
      }

      const relationshipId = createLegacyId("relationship");
      const insert = transaction.request();
      insert.input("relationshipNk", sql.UniqueIdentifier, randomUUID());
      insert.input("legacyRelationshipId", sql.NVarChar(64), relationshipId);
      insert.input("caseSk", sql.BigInt, Number(caseSk));
      insert.input("fromEntitySk", sql.BigInt, fromEntitySk);
      insert.input("toEntitySk", sql.BigInt, toEntitySk);
      insert.input("relationshipTypeCode", sql.NVarChar(32), payload.type);
      insert.input("strengthCode", sql.NVarChar(16), payload.strength);
      insert.input("confidence", sql.Float, payload.confidence);
      insert.input("sourceCount", sql.Int, payload.sourceCount);
      insert.input("label", sql.NVarChar(200), payload.label ?? null);
      await insert.query(`
        INSERT INTO core.relationship (
          relationship_nk,
          legacy_relationship_id,
          case_sk,
          from_entity_sk,
          to_entity_sk,
          relationship_type_code,
          strength_code,
          confidence,
          source_count,
          label,
          created_at,
          updated_at
        )
        VALUES (
          @relationshipNk,
          @legacyRelationshipId,
          @caseSk,
          @fromEntitySk,
          @toEntitySk,
          @relationshipTypeCode,
          @strengthCode,
          @confidence,
          @sourceCount,
          @label,
          SYSUTCDATETIME(),
          SYSUTCDATETIME()
        );
      `);

      return {
        ...payload,
        id: relationshipId,
        caseId,
      };
    });
  },

  async updateRelationship(relationshipId, payload) {
    const sql = await loadSqlModule();
    const pool = await getPool();
    const request = pool.request();
    request.input("relationshipId", sql.NVarChar(64), relationshipId);
    request.input("strengthCode", sql.NVarChar(16), payload.strength ?? null);
    request.input("confidence", sql.Float, typeof payload.confidence === "number" ? payload.confidence : null);
    request.input("label", sql.NVarChar(200), payload.label ?? null);
    request.input("relationshipTypeCode", sql.NVarChar(32), payload.type ?? null);
    const result = await request.query(`
      UPDATE core.relationship
      SET strength_code = CASE WHEN @strengthCode IS NULL THEN strength_code ELSE @strengthCode END,
          confidence = CASE WHEN @confidence IS NULL THEN confidence ELSE @confidence END,
          label = CASE WHEN @label IS NULL THEN label ELSE @label END,
          relationship_type_code = CASE WHEN @relationshipTypeCode IS NULL THEN relationship_type_code ELSE @relationshipTypeCode END,
          updated_at = SYSUTCDATETIME()
      WHERE legacy_relationship_id = @relationshipId;

      SELECT @@ROWCOUNT AS affectedRows;
    `);

    if (Number(result.recordset[0]?.affectedRows ?? 0) === 0) {
      return null;
    }

    const caseLookup = pool.request();
    caseLookup.input("relationshipId", sql.NVarChar(64), relationshipId);
    const caseResult = await caseLookup.query(`
      SELECT TOP (1) cr.legacy_case_id AS caseId
      FROM core.relationship AS r
      INNER JOIN core.case_record AS cr
        ON cr.case_sk = r.case_sk
      WHERE r.legacy_relationship_id = @relationshipId;
    `);
    const caseId = caseResult.recordset[0]?.caseId;
    if (!caseId) {
      return null;
    }

    const relationships = await sqlStore.listRelationships(String(caseId));
    return relationships.find((relationship) => relationship.id === relationshipId) ?? null;
  },

  async listReports(caseId) {
    const sql = await loadSqlModule();
    const pool = await getPool();
    const request = pool.request();
    request.input("caseId", sql.NVarChar(64), caseId);
    const baseResult = await request.query(`
      SELECT
        r.legacy_report_id AS id,
        cr.legacy_case_id AS caseId,
        r.time_observed AS timeObserved,
        r.location_text AS location,
        r.narrative,
        r.source_type_code AS sourceType
      FROM ops.report AS r
      INNER JOIN core.case_record AS cr
        ON cr.case_sk = r.case_sk
      WHERE cr.legacy_case_id = @caseId
      ORDER BY r.time_observed DESC;
    `);

    const entityRequest = pool.request();
    entityRequest.input("caseId", sql.NVarChar(64), caseId);
    const entityResult = await entityRequest.query(`
      SELECT
        r.legacy_report_id AS id,
        e.legacy_entity_id AS entityId
      FROM ops.report_entity AS re
      INNER JOIN ops.report AS r
        ON r.report_sk = re.report_sk
      INNER JOIN core.case_record AS cr
        ON cr.case_sk = r.case_sk
      INNER JOIN core.entity AS e
        ON e.entity_sk = re.entity_sk
      WHERE cr.legacy_case_id = @caseId;
    `);

    return mapReportRows(baseResult.recordset, entityResult.recordset);
  },

  async createReport(payload) {
    return runInTransaction(async (sql, transaction) => {
      const reportId = createLegacyId("report");

      const caseLookup = transaction.request();
      caseLookup.input("caseId", sql.NVarChar(64), payload.caseId);
      const caseResult = await caseLookup.query(`
        SELECT TOP (1) case_sk AS caseSk
        FROM core.case_record
        WHERE legacy_case_id = @caseId;
      `);
      const caseSk = caseResult.recordset[0]?.caseSk;
      if (!caseSk) {
        throw new Error("Case not found.");
      }

      const insert = transaction.request();
      insert.input("reportNk", sql.UniqueIdentifier, randomUUID());
      insert.input("legacyReportId", sql.NVarChar(64), reportId);
      insert.input("caseSk", sql.BigInt, Number(caseSk));
      insert.input("timeObserved", sql.DateTime2, new Date(payload.timeObserved));
      insert.input("locationText", sql.NVarChar(200), payload.location);
      insert.input("narrative", sql.NVarChar(sql.MAX), payload.narrative);
      insert.input("sourceTypeCode", sql.NVarChar(32), payload.sourceType);
      const reportResult = await insert.query(`
        INSERT INTO ops.report (
          report_nk,
          legacy_report_id,
          case_sk,
          time_observed,
          location_text,
          narrative,
          source_type_code,
          created_at
        )
        OUTPUT INSERTED.report_sk AS reportSk
        VALUES (
          @reportNk,
          @legacyReportId,
          @caseSk,
          @timeObserved,
          @locationText,
          @narrative,
          @sourceTypeCode,
          SYSUTCDATETIME()
        );
      `);
      const reportSk = Number(reportResult.recordset[0].reportSk);

      if (payload.relatedEntityIds.length > 0) {
        const entityLookup = transaction.request();
        payload.relatedEntityIds.forEach((entityId, index) => {
          entityLookup.input(`entityId${index}`, sql.NVarChar(64), entityId);
        });
        const params = payload.relatedEntityIds.map((_, index) => `@entityId${index}`).join(", ");
        const entityResult = await entityLookup.query(`
          SELECT legacy_entity_id AS entityId, entity_sk AS entitySk
          FROM core.entity
          WHERE legacy_entity_id IN (${params});
        `);
        const entityMap = new Map<string, number>(
          entityResult.recordset.map((row: any) => [String(row.entityId), Number(row.entitySk)]),
        );

        for (const entityId of payload.relatedEntityIds) {
          const entitySk = entityMap.get(entityId);
          if (!entitySk) continue;
          const bridge = transaction.request();
          bridge.input("reportSk", sql.BigInt, reportSk);
          bridge.input("entitySk", sql.BigInt, entitySk);
          await bridge.query(`
            INSERT INTO ops.report_entity (report_sk, entity_sk)
            VALUES (@reportSk, @entitySk);
          `);
        }
      }

      return {
        ...payload,
        id: reportId,
      };
    });
  },

  async addAuditEvent(payload) {
    const sql = await loadSqlModule();
    const pool = await getPool();
    const eventId = createLegacyId("audit");
    const request = pool.request();
    request.input("auditEventNk", sql.UniqueIdentifier, randomUUID());
    request.input("legacyAuditId", sql.NVarChar(64), eventId);
    request.input("actorLegacyUserId", sql.NVarChar(64), payload.actorId);
    request.input("actionType", sql.NVarChar(100), payload.actionType);
    request.input("objectType", sql.NVarChar(100), payload.objectType);
    request.input("objectLegacyId", sql.NVarChar(100), payload.objectId);
    request.input("metadataJson", sql.NVarChar(sql.MAX), payload.metadata ? JSON.stringify(payload.metadata) : null);
    await request.query(`
      INSERT INTO audit.audit_event (
        audit_event_nk,
        legacy_audit_id,
        actor_user_sk,
        actor_legacy_user_id,
        action_type,
        object_type,
        object_legacy_id,
        metadata_json,
        occurred_at
      )
      VALUES (
        @auditEventNk,
        @legacyAuditId,
        (SELECT TOP (1) user_sk FROM auth.user_profile WHERE legacy_user_id = @actorLegacyUserId),
        @actorLegacyUserId,
        @actionType,
        @objectType,
        @objectLegacyId,
        @metadataJson,
        SYSUTCDATETIME()
      );
    `);

    return {
      ...payload,
      id: eventId,
      timestamp: new Date().toISOString(),
    } as AuditEvent;
  },

  async getOperatorCaseBundle(caseId) {
    const [entities, relationships, reports] = await Promise.all([
      sqlStore.listEntities(caseId),
      sqlStore.listRelationships(caseId),
      sqlStore.listReports(caseId),
    ]);

    return {
      entities,
      relationships,
      reports,
    };
  },
};
