import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { getDb } from "../client.js";
import { apiKeys } from "../schema.js";

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
  };
}

export async function getApiKeys() {
  const db = getDb();
  const rows = await db.select().from(apiKeys);
  return rows.map(rowToKey);
}

export async function getApiKeyById(id) {
  const db = getDb();
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  return rowToKey(rows[0] ?? null);
}

export async function createApiKey(data = {}) {
  const db = getDb();
  const raw = `sk-9r-${uuidv4().replace(/-/g, "")}`;
  const hashed = await bcrypt.hash(raw, 10);
  const key = {
    id: uuidv4(),
    key: hashed,
    name: data.name ?? null,
    machineId: data.machineId ?? null,
    isActive: 1,
    createdAt: new Date().toISOString(),
  };
  await db.insert(apiKeys).values(key);
  return { ...rowToKey(key), rawKey: raw };
}

export async function updateApiKey(id, data) {
  const db = getDb();
  const updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.isActive !== undefined) updates.isActive = data.isActive ? 1 : 0;
  if (data.machineId !== undefined) updates.machineId = data.machineId;
  await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id));
  return getApiKeyById(id);
}

export async function deleteApiKey(id) {
  const db = getDb();
  const rows = await db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (!rows[0]) return false;
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  return true;
}

export async function validateApiKey(raw) {
  const db = getDb();
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.isActive, 1));
  for (const row of rows) {
    if (await bcrypt.compare(raw, row.key)) return rowToKey(row);
  }
  return null;
}
