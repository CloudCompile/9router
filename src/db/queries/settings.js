import { eq } from "drizzle-orm";
import { getDb } from "../client.js";
import { settings } from "../schema.js";

const DEFAULT_SETTINGS = {
  cloudEnabled: false,
  tunnelEnabled: false,
  tunnelUrl: "",
  tunnelProvider: "cloudflare",
  tailscaleEnabled: false,
  tailscaleUrl: "",
  stickyRoundRobinLimit: 3,
  providerStrategies: {},
  comboStrategy: "fallback",
  comboStickyRoundRobinLimit: 1,
  comboStrategies: {},
  requireLogin: true,
  tunnelDashboardAccess: true,
  authMode: "password",
  oidcIssuerUrl: "",
  oidcClientId: "",
  oidcClientSecret: "",
  oidcScopes: "openid profile email",
  oidcLoginLabel: "Sign in with OIDC",
  enableObservability: true,
  observabilityMaxRecords: 1000,
  observabilityBatchSize: 20,
  observabilityFlushIntervalMs: 5000,
  observabilityMaxJsonSize: 5,
  outboundConnectionEnabled: false,
  outboundConnectionUrl: "",
  outboundNoProxy: "",
  routerBaseUrl: "http://localhost:20128",
  dnsToolEnabled: {},
  rtkEnabled: true,
  cavemanEnabled: false,
  cavemanLevel: "full",
};

function mergeDefaults(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    if (merged[k] === undefined) merged[k] = v;
  }
  return merged;
}

export async function getSettings() {
  const db = getDb();
  const row = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  const raw = row[0] ? JSON.parse(row[0].data) : {};
  return mergeDefaults(raw);
}

export async function updateSettings(patch) {
  const db = getDb();
  const current = await getSettings();
  const updated = { ...current, ...patch };
  const json = JSON.stringify(updated);
  await db
    .insert(settings)
    .values({ id: 1, data: json })
    .onConflictDoUpdate({ target: settings.id, set: { data: json } });
  return updated;
}

export async function exportSettings() {
  const db = getDb();
  const row = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  return row[0] ? JSON.parse(row[0].data) : {};
}

export function isCloudEnabled(s) {
  return !!(s?.cloudEnabled);
}

export function getCloudUrl(s) {
  return process.env.CLOUD_URL || process.env.NEXT_PUBLIC_CLOUD_URL || "https://9router.com";
}
