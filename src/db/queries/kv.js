import { eq, and } from "drizzle-orm";
import { getDb } from "../client.js";
import { kv } from "../schema.js";

export async function kvGet(scope, key) {
  const db = getDb();
  const rows = await db
    .select()
    .from(kv)
    .where(and(eq(kv.scope, scope), eq(kv.key, key)))
    .limit(1);
  return rows[0] ? JSON.parse(rows[0].value) : null;
}

export async function kvSet(scope, key, value) {
  const db = getDb();
  const json = JSON.stringify(value);
  await db
    .insert(kv)
    .values({ scope, key, value: json })
    .onConflictDoUpdate({ target: [kv.scope, kv.key], set: { value: json } });
}

export async function kvDelete(scope, key) {
  const db = getDb();
  await db.delete(kv).where(and(eq(kv.scope, scope), eq(kv.key, key)));
}

export async function kvGetAll(scope) {
  const db = getDb();
  const rows = await db.select().from(kv).where(eq(kv.scope, scope));
  return rows.map((r) => ({ key: r.key, value: JSON.parse(r.value) }));
}

export async function kvSetAll(scope, entries) {
  const db = getDb();
  await db.delete(kv).where(eq(kv.scope, scope));
  if (entries.length) {
    await db.insert(kv).values(entries.map(({ key, value }) => ({ scope, key, value: JSON.stringify(value) })));
  }
}

// ─── Model aliases ────────────────────────────────────────────────────────────
export async function getModelAliases() {
  const rows = await kvGetAll("modelAliases");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setModelAlias(alias, model) {
  await kvSet("modelAliases", alias, model);
}

export async function deleteModelAlias(alias) {
  await kvDelete("modelAliases", alias);
}

// ─── Custom models ────────────────────────────────────────────────────────────
export async function getCustomModels() {
  const rows = await kvGetAll("customModels");
  return rows.map((r) => r.value);
}

export async function addCustomModel(model) {
  const k = `${model.providerAlias}|${model.id}|${model.type || "llm"}`;
  await kvSet("customModels", k, model);
  return model;
}

export async function deleteCustomModel(providerAlias, id, type = "llm") {
  await kvDelete("customModels", `${providerAlias}|${id}|${type}`);
}

// ─── Router alias ─────────────────────────────────────────────────────────────
export async function getRouterAlias() {
  const rows = await kvGetAll("routerAlias");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setRouterAliasAll(tool, mappings) {
  await kvSet("routerAlias", tool, mappings || {});
}

// ─── Disabled models ──────────────────────────────────────────────────────────
export async function getDisabledModels() {
  const rows = await kvGetAll("disabledModels");
  const out = {};
  for (const { key, value } of rows) out[key] = value;
  return out;
}

export async function getDisabledByProvider(provider) {
  return (await kvGet("disabledModels", provider)) || [];
}

export async function disableModels(provider, ids) {
  const current = await getDisabledByProvider(provider);
  const merged = [...new Set([...current, ...ids])];
  await kvSet("disabledModels", provider, merged);
  return merged;
}

export async function enableModels(provider, ids) {
  const current = await getDisabledByProvider(provider);
  const updated = current.filter((id) => !ids.includes(id));
  await kvSet("disabledModels", provider, updated);
  return updated;
}
