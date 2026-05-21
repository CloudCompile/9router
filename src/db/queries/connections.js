import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../client.js";
import { providerConnections } from "../schema.js";

function rowToConn(row) {
  if (!row) return null;
  const extra = JSON.parse(row.data || "{}");
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

function connToValues(c) {
  const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } = c;
  return {
    id,
    provider,
    authType: authType || "oauth",
    name: name ?? null,
    email: email ?? null,
    priority: priority ?? null,
    isActive: isActive === false ? 0 : 1,
    data: JSON.stringify(rest),
    createdAt,
    updatedAt,
  };
}

async function reorder(db, provider) {
  const rows = await db
    .select()
    .from(providerConnections)
    .where(eq(providerConnections.provider, provider));
  const sorted = rows
    .map(rowToConn)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  for (const [i, c] of sorted.entries()) {
    await db
      .update(providerConnections)
      .set({ priority: i + 1 })
      .where(eq(providerConnections.id, c.id));
  }
}

export async function getProviderConnections(filter = {}) {
  const db = getDb();
  const conditions = [];
  if (filter.provider) conditions.push(eq(providerConnections.provider, filter.provider));
  if (filter.isActive !== undefined)
    conditions.push(eq(providerConnections.isActive, filter.isActive ? 1 : 0));

  const rows = conditions.length
    ? await db.select().from(providerConnections).where(and(...conditions))
    : await db.select().from(providerConnections);

  return rows.map(rowToConn).sort((a, b) => (a.priority || 999) - (b.priority || 999));
}

export async function getProviderConnectionById(id) {
  const db = getDb();
  const rows = await db
    .select()
    .from(providerConnections)
    .where(eq(providerConnections.id, id))
    .limit(1);
  return rowToConn(rows[0] ?? null);
}

export async function createProviderConnection(data) {
  const db = getDb();
  const now = new Date().toISOString();

  const all = await getProviderConnections({ provider: data.provider });

  let existing = null;
  if (data.authType === "oauth" && data.email) {
    existing = all.find((c) => c.authType === "oauth" && c.email === data.email);
  } else if (data.authType === "apikey" && data.name) {
    existing = all.find((c) => c.authType === "apikey" && c.name === data.name);
  }

  if (existing) {
    const merged = { ...existing, ...data, updatedAt: now };
    const vals = connToValues(merged);
    await db
      .update(providerConnections)
      .set(vals)
      .where(eq(providerConnections.id, existing.id));
    return merged;
  }

  const priority = all.reduce((m, c) => Math.max(m, c.priority || 0), 0) + 1;
  const conn = {
    id: uuidv4(),
    provider: data.provider,
    authType: data.authType || "oauth",
    name: data.name ?? (data.authType === "oauth" ? (data.email || `Account ${all.length + 1}`) : null),
    email: data.email ?? null,
    priority: data.priority ?? priority,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: now,
    updatedAt: now,
    ...Object.fromEntries(
      Object.entries(data).filter(([k]) =>
        ![
          "provider", "authType", "name", "email", "priority",
          "isActive", "createdAt", "updatedAt",
        ].includes(k)
      )
    ),
  };

  await db.insert(providerConnections).values(connToValues(conn));
  await reorder(db, data.provider);
  return conn;
}

export async function updateProviderConnection(id, data) {
  const db = getDb();
  const rows = await db
    .select()
    .from(providerConnections)
    .where(eq(providerConnections.id, id))
    .limit(1);
  if (!rows[0]) return null;
  const existing = rowToConn(rows[0]);
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  const vals = connToValues(merged);
  await db.update(providerConnections).set(vals).where(eq(providerConnections.id, id));
  if (data.priority !== undefined) await reorder(db, existing.provider);
  return merged;
}

export async function deleteProviderConnection(id) {
  const db = getDb();
  const rows = await db
    .select({ provider: providerConnections.provider })
    .from(providerConnections)
    .where(eq(providerConnections.id, id))
    .limit(1);
  if (!rows[0]) return false;
  await db.delete(providerConnections).where(eq(providerConnections.id, id));
  await reorder(db, rows[0].provider);
  return true;
}

export async function deleteProviderConnectionsByProvider(provider) {
  const db = getDb();
  const rows = await db
    .select({ id: providerConnections.id })
    .from(providerConnections)
    .where(eq(providerConnections.provider, provider));
  if (!rows.length) return 0;
  await db.delete(providerConnections).where(eq(providerConnections.provider, provider));
  return rows.length;
}

export async function reorderProviderConnections(provider) {
  const db = getDb();
  await reorder(db, provider);
}

export async function cleanupProviderConnections() {
  return 0;
}
