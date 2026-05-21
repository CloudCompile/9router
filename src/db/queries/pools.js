import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../client.js";
import { proxyPools } from "../schema.js";

function rowToPool(row) {
  if (!row) return null;
  const extra = JSON.parse(row.data || "{}");
  return {
    ...extra,
    id: row.id,
    isActive: row.isActive === 1 || row.isActive === true,
    testStatus: row.testStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getProxyPools(filter = {}) {
  const db = getDb();
  const rows = filter.isActive !== undefined
    ? await db.select().from(proxyPools).where(eq(proxyPools.isActive, filter.isActive ? 1 : 0))
    : await db.select().from(proxyPools);
  return rows.map(rowToPool);
}

export async function getProxyPoolById(id) {
  const db = getDb();
  const rows = await db.select().from(proxyPools).where(eq(proxyPools.id, id)).limit(1);
  return rowToPool(rows[0] ?? null);
}

export async function createProxyPool(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const { isActive, testStatus, ...rest } = data;
  const pool = { id: uuidv4(), isActive: isActive !== false, testStatus: testStatus ?? null, createdAt: now, updatedAt: now, ...rest };
  const { id, createdAt, updatedAt, isActive: ia, testStatus: ts, ...extra } = pool;
  await db.insert(proxyPools).values({ id, isActive: ia ? 1 : 0, testStatus: ts, data: JSON.stringify(extra), createdAt, updatedAt });
  return pool;
}

export async function updateProxyPool(id, data) {
  const db = getDb();
  const rows = await db.select().from(proxyPools).where(eq(proxyPools.id, id)).limit(1);
  if (!rows[0]) return null;
  const existing = rowToPool(rows[0]);
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  const { id: _id, isActive, testStatus, createdAt, updatedAt, ...extra } = merged;
  await db.update(proxyPools).set({ isActive: isActive ? 1 : 0, testStatus, data: JSON.stringify(extra), updatedAt }).where(eq(proxyPools.id, id));
  return merged;
}

export async function deleteProxyPool(id) {
  const db = getDb();
  const rows = await db.select({ id: proxyPools.id }).from(proxyPools).where(eq(proxyPools.id, id)).limit(1);
  if (!rows[0]) return false;
  await db.delete(proxyPools).where(eq(proxyPools.id, id));
  return true;
}
