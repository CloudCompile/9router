import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../client.js";
import { combos } from "../schema.js";

function rowToCombo(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    models: JSON.parse(row.models || "[]"),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getCombos() {
  const db = getDb();
  const rows = await db.select().from(combos);
  return rows.map(rowToCombo);
}

export async function getComboById(id) {
  const db = getDb();
  const rows = await db.select().from(combos).where(eq(combos.id, id)).limit(1);
  return rowToCombo(rows[0] ?? null);
}

export async function getComboByName(name) {
  const db = getDb();
  const rows = await db.select().from(combos).where(eq(combos.name, name)).limit(1);
  return rowToCombo(rows[0] ?? null);
}

export async function createCombo(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const combo = {
    id: uuidv4(),
    name: data.name,
    kind: data.kind ?? null,
    models: JSON.stringify(data.models || []),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(combos).values(combo);
  return rowToCombo(combo);
}

export async function updateCombo(id, data) {
  const db = getDb();
  const updates = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.kind !== undefined) updates.kind = data.kind;
  if (data.models !== undefined) updates.models = JSON.stringify(data.models);
  await db.update(combos).set(updates).where(eq(combos.id, id));
  return getComboById(id);
}

export async function deleteCombo(id) {
  const db = getDb();
  const rows = await db.select({ id: combos.id }).from(combos).where(eq(combos.id, id)).limit(1);
  if (!rows[0]) return false;
  await db.delete(combos).where(eq(combos.id, id));
  return true;
}
