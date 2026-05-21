import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import { EventEmitter } from "events";
import { getDb } from "../client.js";
import { usageHistory, usageDaily, requestDetails } from "../schema.js";

export const statsEmitter = new EventEmitter();
const _pending = new Map();

export function trackPendingRequest(id, data) {
  _pending.set(id, { ...data, startedAt: Date.now() });
}

export function getActiveRequests() {
  return Array.from(_pending.entries()).map(([id, d]) => ({ id, ...d }));
}

export async function saveRequestUsage(data) {
  _pending.delete(data.requestId);

  const db = getDb();
  const now = data.timestamp || new Date().toISOString();

  await db.insert(usageHistory).values({
    timestamp: now,
    provider: data.provider ?? null,
    model: data.model ?? null,
    connectionId: data.connectionId ?? null,
    apiKey: data.apiKey ?? null,
    endpoint: data.endpoint ?? null,
    promptTokens: data.promptTokens ?? data.tokens?.prompt_tokens ?? 0,
    completionTokens: data.completionTokens ?? data.tokens?.completion_tokens ?? 0,
    cost: data.cost ?? 0,
    status: data.status ?? "ok",
    tokens: data.tokens ? JSON.stringify(data.tokens) : null,
    meta: data.meta ? JSON.stringify(data.meta) : null,
  });

  // Update daily summary
  const dateKey = now.slice(0, 10);
  const existing = await db
    .select()
    .from(usageDaily)
    .where(eq(usageDaily.dateKey, dateKey))
    .limit(1);

  const prev = existing[0] ? JSON.parse(existing[0].data) : { requests: 0, promptTokens: 0, completionTokens: 0, cost: 0 };
  const updated = {
    requests: (prev.requests || 0) + 1,
    promptTokens: (prev.promptTokens || 0) + (data.promptTokens ?? 0),
    completionTokens: (prev.completionTokens || 0) + (data.completionTokens ?? 0),
    cost: (prev.cost || 0) + (data.cost || 0),
  };

  await db
    .insert(usageDaily)
    .values({ dateKey, data: JSON.stringify(updated) })
    .onConflictDoUpdate({ target: usageDaily.dateKey, set: { data: JSON.stringify(updated) } });

  statsEmitter.emit("update", data);
}

export async function getUsageHistory(filter = {}, pagination = {}) {
  const db = getDb();
  const { limit = 100, offset = 0 } = pagination;

  const conditions = [];
  if (filter.provider) conditions.push(eq(usageHistory.provider, filter.provider));
  if (filter.model) conditions.push(eq(usageHistory.model, filter.model));
  if (filter.connectionId) conditions.push(eq(usageHistory.connectionId, filter.connectionId));
  if (filter.from) conditions.push(gte(usageHistory.timestamp, filter.from));
  if (filter.to) conditions.push(lte(usageHistory.timestamp, filter.to));

  const query = db
    .select()
    .from(usageHistory)
    .orderBy(desc(usageHistory.timestamp))
    .limit(limit)
    .offset(offset);

  const rows = conditions.length ? await query.where(and(...conditions)) : await query;

  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    provider: r.provider,
    model: r.model,
    connectionId: r.connectionId,
    apiKey: r.apiKey,
    endpoint: r.endpoint,
    promptTokens: r.promptTokens,
    completionTokens: r.completionTokens,
    cost: r.cost,
    status: r.status,
    tokens: r.tokens ? JSON.parse(r.tokens) : null,
    meta: r.meta ? JSON.parse(r.meta) : null,
  }));
}

export async function getUsageStats(filter = {}) {
  const db = getDb();
  const conditions = [];
  if (filter.from) conditions.push(gte(usageHistory.timestamp, filter.from));
  if (filter.to) conditions.push(lte(usageHistory.timestamp, filter.to));

  const query = db
    .select({
      provider: usageHistory.provider,
      model: usageHistory.model,
      requests: sql`count(*)`.mapWith(Number),
      promptTokens: sql`sum(${usageHistory.promptTokens})`.mapWith(Number),
      completionTokens: sql`sum(${usageHistory.completionTokens})`.mapWith(Number),
      cost: sql`sum(${usageHistory.cost})`.mapWith(Number),
    })
    .from(usageHistory)
    .groupBy(usageHistory.provider, usageHistory.model);

  const rows = conditions.length ? await query.where(and(...conditions)) : await query;
  return rows;
}

export async function getChartData(days = 30) {
  const db = getDb();
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(usageDaily)
    .where(gte(usageDaily.dateKey, from))
    .orderBy(usageDaily.dateKey);
  return rows.map((r) => ({ date: r.dateKey, ...JSON.parse(r.data) }));
}

// ─── Request logs (in-memory ring buffer for real-time console) ───────────────
const LOG_MAX = 500;
const _logs = [];

export function appendRequestLog(entry) {
  _logs.push({ ...entry, ts: Date.now() });
  if (_logs.length > LOG_MAX) _logs.shift();
}

export function getRecentLogs(limit = 100) {
  return _logs.slice(-limit);
}

// ─── Request details ──────────────────────────────────────────────────────────
export async function saveRequestDetail(data) {
  const db = getDb();
  await db
    .insert(requestDetails)
    .values({
      id: data.id,
      timestamp: data.timestamp || new Date().toISOString(),
      provider: data.provider ?? null,
      model: data.model ?? null,
      connectionId: data.connectionId ?? null,
      status: data.status ?? null,
      data: JSON.stringify(data),
    })
    .onConflictDoUpdate({
      target: requestDetails.id,
      set: { status: data.status ?? null, data: JSON.stringify(data) },
    });
}

export async function getRequestDetails(filter = {}, pagination = {}) {
  const db = getDb();
  const { limit = 50, offset = 0 } = pagination;
  const conditions = [];
  if (filter.provider) conditions.push(eq(requestDetails.provider, filter.provider));
  if (filter.model) conditions.push(eq(requestDetails.model, filter.model));
  if (filter.connectionId) conditions.push(eq(requestDetails.connectionId, filter.connectionId));
  if (filter.from) conditions.push(gte(requestDetails.timestamp, filter.from));

  const query = db
    .select()
    .from(requestDetails)
    .orderBy(desc(requestDetails.timestamp))
    .limit(limit)
    .offset(offset);

  const rows = conditions.length ? await query.where(and(...conditions)) : await query;
  return rows.map((r) => JSON.parse(r.data));
}

export async function getRequestDetailById(id) {
  const db = getDb();
  const rows = await db
    .select()
    .from(requestDetails)
    .where(eq(requestDetails.id, id))
    .limit(1);
  return rows[0] ? JSON.parse(rows[0].data) : null;
}
