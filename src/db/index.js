// Public API — everything the app needs from the DB layer
export * from "./queries/index.js";

// Export/import full DB snapshot
export async function exportDb() {
  const {
    getSettings, getProviderConnections, getProviderNodes, getProxyPools,
    getApiKeys, getCombos, getModelAliases, getCustomModels, getRouterAlias,
    kvGetAll,
  } = await import("./queries/index.js");

  const [
    settings, providerConnections, providerNodes, proxyPools,
    apiKeys, combos, modelAliases, customModels, routerAlias,
    pricingRows,
  ] = await Promise.all([
    getSettings(),
    getProviderConnections(),
    getProviderNodes(),
    getProxyPools(),
    getApiKeys(),
    getCombos(),
    getModelAliases(),
    getCustomModels(),
    getRouterAlias(),
    kvGetAll("pricing"),
  ]);

  const pricing = Object.fromEntries(pricingRows.map((r) => [r.key, r.value]));

  return {
    settings, providerConnections, providerNodes, proxyPools,
    apiKeys, combos, modelAliases, customModels, routerAlias, pricing,
  };
}

export async function importDb(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid database payload");
  }

  const { getDb } = await import("./client.js");
  const {
    providerconnections, providernodes, proxypools, apikeys,
    combos: combosTable, kv, settings: settingsTable,
  } = await import("./schema.js");
  const { eq } = await import("drizzle-orm");

  const db = getDb();

  // Wipe data tables
  await db.delete(providerconnections);
  await db.delete(providernodes);
  await db.delete(proxypools);
  await db.delete(apikeys);
  await db.delete(combosTable);
  await db.delete(kv).where(
    eq(kv.scope, "modelAliases") ||
    eq(kv.scope, "customModels") ||
    eq(kv.scope, "routerAlias") ||
    eq(kv.scope, "pricing")
  );

  const now = new Date().toISOString();

  if (payload.settings) {
    await db
      .insert(settingsTable)
      .values({ id: 1, data: JSON.stringify(payload.settings) })
      .onConflictDoUpdate({ target: settingsTable.id, set: { data: JSON.stringify(payload.settings) } });
  }

  // Re-import using individual query functions
  const {
    createProviderConnection, createProviderNode, createProxyPool,
    setModelAlias, addCustomModel, setRouterAliasAll, updatePricing,
  } = await import("./queries/index.js");

  for (const c of payload.providerConnections || []) await createProviderConnection(c).catch(() => {});
  for (const n of payload.providerNodes || []) await createProviderNode(n).catch(() => {});
  for (const p of payload.proxyPools || []) await createProxyPool(p).catch(() => {});
  for (const [alias, model] of Object.entries(payload.modelAliases || {})) await setModelAlias(alias, model);
  for (const m of payload.customModels || []) await addCustomModel(m);
  for (const [tool, mappings] of Object.entries(payload.routerAlias || {})) await setRouterAliasAll(tool, mappings);
  for (const [provider, models] of Object.entries(payload.pricing || {})) await updatePricing(provider, models);

  return exportDb();
}

export async function initDb() {
  const { ensureSchema } = await import("./migrate.js");
  await ensureSchema();
}
