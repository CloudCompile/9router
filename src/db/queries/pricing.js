import { kvGet, kvSet, kvDelete, kvGetAll } from "./kv.js";

export async function getPricing() {
  const rows = await kvGetAll("pricing");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getPricingForModel(provider, modelId) {
  const p = await kvGet("pricing", provider);
  return p?.[modelId] ?? null;
}

export async function updatePricing(provider, models) {
  const current = (await kvGet("pricing", provider)) || {};
  await kvSet("pricing", provider, { ...current, ...models });
}

export async function resetPricing(provider) {
  await kvDelete("pricing", provider);
}

export async function resetAllPricing() {
  const rows = await kvGetAll("pricing");
  for (const { key } of rows) await kvDelete("pricing", key);
}
