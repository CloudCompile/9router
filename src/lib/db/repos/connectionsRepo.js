import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const OPTIONAL_FIELDS = [
  "displayName", "email", "globalPriority", "defaultModel",
  "accessToken", "refreshToken", "expiresAt", "tokenType",
  "scope", "projectId", "apiKey", "testStatus",
  "lastTested", "lastError", "lastErrorAt", "rateLimitedUntil", "expiresIn", "errorCode",
  "consecutiveUseCount",
];

function rowToConn(row) {
  if (!row) return null;
  const extra = parseJson(row.data, {});
  return {
    ...extra,
    id: row.id,
    provider: row.provider,
    authType: row.authType,
    name: row.name,
    email: row.email,
    priority: row.priority,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function connToRow(c) {
  const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } = c;
  return {
    id,
    provider,
    authType,
    name: name ?? null,
    email: email ?? null,
    priority: priority ?? null,
    isActive: isActive === false ? 0 : 1,
    data: stringifyJson(rest),
    createdAt,
    updatedAt,
  };
}

async function upsert(db, c) {
  const r = connToRow(c);
  // Check if row exists
  const existing = await db.get('SELECT id FROM providerConnections WHERE id = ?', [r.id]);

  if (existing) {
    // Update existing
    await db.run(
      `UPDATE providerConnections SET
        provider=?, authType=?, name=?, email=?, priority=?, isActive=?, data=?, updatedAt=?
        WHERE id=?`,
      [r.provider, r.authType, r.name, r.email, r.priority, r.isActive, r.data, r.updatedAt, r.id]
    );
  } else {
    // Insert new
    await db.run(
      `INSERT INTO providerConnections(id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.provider, r.authType, r.name, r.email, r.priority, r.isActive, r.data, r.createdAt, r.updatedAt]
    );
  }
}

export async function getProviderConnections(filter = {}) {
  const db = await getAdapter();
  const where = [];
  const params = [];
  if (filter.provider) { where.push("provider = ?"); params.push(filter.provider); }
  if (filter.isActive !== undefined) { where.push("isActive = ?"); params.push(filter.isActive ? 1 : 0); }
  const sql = `SELECT * FROM providerConnections${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
  const rows = await db.all(sql, params);
  const list = rows.map(rowToConn);
  list.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  return list;
}

export async function getProviderConnectionById(id) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM providerConnections WHERE id = ?`, [id]);
  return rowToConn(row);
}

// Internal async reorder — must be called INSIDE a transaction
async function reorderInTx(db, providerId) {
  const list = (await db.all(`SELECT * FROM providerConnections WHERE provider = ?`, [providerId])).map(rowToConn);
  list.sort((a, b) => {
    const pDiff = (a.priority || 0) - (b.priority || 0);
    if (pDiff !== 0) return pDiff;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
  for (const [i, c] of list.entries()) {
    await db.run(`UPDATE providerConnections SET priority = ? WHERE id = ?`, [i + 1, c.id]);
  }
}

export async function createProviderConnection(data) {
  const db = await getAdapter();
  const now = new Date().toISOString();

  const result = await db.transaction(async (txDb) => {
    const all = (await txDb.all(`SELECT * FROM providerConnections WHERE provider = ?`, [data.provider])).map(rowToConn);

    let existing = null;
    if (data.authType === "oauth" && data.email) {
      existing = all.find(c => c.authType === "oauth" && c.email === data.email);
    } else if (data.authType === "apikey" && data.name) {
      existing = all.find(c => c.authType === "apikey" && c.name === data.name);
    }

    if (existing) {
      const merged = { ...existing, ...data, updatedAt: now };
      await upsert(txDb, merged);
      return merged;
    }

    let connectionName = data.name || null;
    if (!connectionName && data.authType === "oauth") {
      connectionName = data.email || `Account ${all.length + 1}`;
    }
    let connectionPriority = data.priority;
    if (!connectionPriority) {
      connectionPriority = all.reduce((m, c) => Math.max(m, c.priority || 0), 0) + 1;
    }

    const conn = {
      id: uuidv4(),
      provider: data.provider,
      authType: data.authType || "oauth",
      name: connectionName,
      priority: connectionPriority,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: now,
      updatedAt: now,
    };
    for (const f of OPTIONAL_FIELDS) {
      if (data[f] !== undefined && data[f] !== null) conn[f] = data[f];
    }
    if (data.providerSpecificData && Object.keys(data.providerSpecificData).length > 0) {
      conn.providerSpecificData = data.providerSpecificData;
    }
    if (data.email !== undefined) conn.email = data.email;

    await upsert(txDb, conn);
    await reorderInTx(txDb, data.provider);
    return conn;
  });

  return result;
}

// Critical: OAuth refresh token race — atomic merge inside transaction
export async function updateProviderConnection(id, data) {
  const db = await getAdapter();
  const result = await db.transaction(async (txDb) => {
    const row = await txDb.get(`SELECT * FROM providerConnections WHERE id = ?`, [id]);
    if (!row) return null;
    const existing = rowToConn(row);
    const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await upsert(txDb, merged);
    if (data.priority !== undefined) await reorderInTx(txDb, existing.provider);
    return merged;
  });
  return result;
}

export async function deleteProviderConnection(id) {
  const db = await getAdapter();
  const ok = await db.transaction(async (txDb) => {
    const row = await txDb.get(`SELECT provider FROM providerConnections WHERE id = ?`, [id]);
    if (!row) return false;
    await txDb.run(`DELETE FROM providerConnections WHERE id = ?`, [id]);
    await reorderInTx(txDb, row.provider);
    return true;
  });
  return ok;
}

export async function deleteProviderConnectionsByProvider(providerId) {
  const db = await getAdapter();
  const before = await db.get(`SELECT COUNT(*) AS n FROM providerConnections WHERE provider = ?`, [providerId]);
  await db.run(`DELETE FROM providerConnections WHERE provider = ?`, [providerId]);
  return before?.n || 0;
}

export async function reorderProviderConnections(providerId) {
  const db = await getAdapter();
  await db.transaction(async (txDb) => reorderInTx(txDb, providerId));
}

export async function cleanupProviderConnections() {
  const db = await getAdapter();
  const fieldsToCheck = [
    "displayName", "email", "globalPriority", "defaultModel",
    "accessToken", "refreshToken", "expiresAt", "tokenType",
    "scope", "projectId", "apiKey", "testStatus",
    "lastTested", "lastError", "lastErrorAt", "rateLimitedUntil", "expiresIn",
    "consecutiveUseCount",
  ];
  const cleaned = await db.transaction(async (txDb) => {
    let count = 0;
    const rows = await txDb.all(`SELECT * FROM providerConnections`);
    for (const row of rows) {
      const conn = rowToConn(row);
      let dirty = false;
      for (const f of fieldsToCheck) {
        if (conn[f] === null || conn[f] === undefined) {
          if (f in conn) { delete conn[f]; count++; dirty = true; }
        }
      }
      if (conn.providerSpecificData && Object.keys(conn.providerSpecificData).length === 0) {
        delete conn.providerSpecificData;
        count++;
        dirty = true;
      }
      if (dirty) await upsert(txDb, conn);
    }
    return count;
  });
  return cleaned;
}
