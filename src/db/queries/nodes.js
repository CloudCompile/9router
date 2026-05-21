import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../client.js";
import { providerNodes } from "../schema.js";

function rowToNode(row) {
  if (!row) return null;
  const extra = JSON.parse(row.data || "{}");
  return { ...extra, id: row.id, type: row.type, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export async function getProviderNodes(filter = {}) {
  const db = getDb();
  const rows = filter.type
    ? await db.select().from(providerNodes).where(eq(providerNodes.type, filter.type))
    : await db.select().from(providerNodes);
  return rows.map(rowToNode);
}

export async function getProviderNodeById(id) {
  const db = getDb();
  const rows = await db.select().from(providerNodes).where(eq(providerNodes.id, id)).limit(1);
  return rowToNode(rows[0] ?? null);
}

export async function createProviderNode(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const { type, name, ...rest } = data;
  const node = { id: uuidv4(), type: type ?? null, name: name ?? null, createdAt: now, updatedAt: now, ...rest };
  const { id, createdAt, updatedAt, type: t, name: n, ...extra } = node;
  await db.insert(providerNodes).values({ id, type: t, name: n, data: JSON.stringify(extra), createdAt, updatedAt });
  return node;
}

export async function updateProviderNode(id, data) {
  const db = getDb();
  const rows = await db.select().from(providerNodes).where(eq(providerNodes.id, id)).limit(1);
  if (!rows[0]) return null;
  const existing = rowToNode(rows[0]);
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  const { id: _id, type, name, createdAt, updatedAt, ...extra } = merged;
  await db.update(providerNodes).set({ type, name, data: JSON.stringify(extra), updatedAt }).where(eq(providerNodes.id, id));
  return merged;
}

export async function deleteProviderNode(id) {
  const db = getDb();
  const rows = await db.select({ id: providerNodes.id }).from(providerNodes).where(eq(providerNodes.id, id)).limit(1);
  if (!rows[0]) return false;
  await db.delete(providerNodes).where(eq(providerNodes.id, id));
  return true;
}
