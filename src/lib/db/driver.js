import { ensureDirs, DATA_FILE } from "./paths.js";

// Use global to survive Next.js dev hot-reload (module state resets on reload)
if (!global._dbAdapter) global._dbAdapter = { instance: null, initPromise: null, logged: false };
const state = global._dbAdapter;

// On Vercel/serverless, skip native adapters entirely
const isServerless = !!process.env.VERCEL || !!process.env.RAILWAY || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

async function tryBunSqlite() {
  // Bun runtime only — built-in, no install needed
  if (!process.versions.bun || isServerless) return null;
  try {
    const { createBunSqliteAdapter } = await import("./adapters/bunSqliteAdapter.js");
    return await createBunSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] bun:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function tryBetterSqlite() {
  // Skip on Bun, Vercel/serverless — better-sqlite3 native bindings unsupported
  if (process.versions.bun || isServerless) return null;
  try {
    const { createBetterSqliteAdapter } = await import("./adapters/betterSqliteAdapter.js");
    return await createBetterSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] better-sqlite3 unavailable: ${e.message}`);
    return null;
  }
}

async function tryNodeSqlite() {
  // Built-in since Node 22.5.0 — no install needed. Skip under Bun or Vercel.
  if (process.versions.bun || isServerless) return null;
  const [maj, min] = process.versions.node.split(".").map(Number);
  if (maj < 22 || (maj === 22 && min < 5)) return null;
  try {
    const { createNodeSqliteAdapter } = await import("./adapters/nodeSqliteAdapter.js");
    return await createNodeSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] node:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function trySqlJs() {
  try {
    const { createSqlJsAdapter } = await import("./adapters/sqljsAdapter.js");
    return await createSqlJsAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] sql.js unavailable: ${e.message}`);
    return null;
  }
}

async function initAdapter() {
  const isDuringBuild = process.env.NEXT_PHASE === 'phase-production-build';

  // On serverless with DATABASE_URL, use Neon's HTTP-based serverless driver.
  // Unlike pg (TCP), it avoids cold-start timeouts and works within Vercel's 10s budget.
  if (process.env.DATABASE_URL && !isDuringBuild) {
    try {
      const { createNeonAdapter } = await import("./adapters/neonAdapter.js");
      const adapter = await createNeonAdapter(process.env.DATABASE_URL);
      const { runMigrationOnce } = await import("./migrate.js");
      await runMigrationOnce(adapter);
      console.log(`[DB] Driver: neon-serverless | DATABASE_URL configured`);
      return adapter;
    } catch (e) {
      console.warn(`[DB] Neon serverless failed, falling back: ${e.message}`);
    }
  }

  // On Vercel/serverless without DATABASE_URL, skip directly to sql.js.
  // Data won't persist across invocations, but the app remains functional.
  if (isServerless) {
    try {
      ensureDirs(); // Create /tmp/fusion/db before sql.js tries to persist there
      const { createSqlJsAdapter } = await import("./adapters/sqljsAdapter.js");
      const adapter = await createSqlJsAdapter(DATA_FILE);
      console.log(`[DB] Driver: sql.js (serverless) | file: ${DATA_FILE}`);
      const { runMigrationOnce } = await import("./migrate.js");
      await runMigrationOnce(adapter);
      return adapter;
    } catch (e) {
      console.error("[DB] Even sql.js failed on serverless:", e.message);
      throw e;
    }
  }

  ensureDirs();
  // Order per runtime:
  //   Bun:  bun:sqlite → sql.js
  //   Node: better-sqlite3 → node:sqlite (≥22.5) → sql.js
  let adapter = await tryBunSqlite();
  if (!adapter) adapter = await tryBetterSqlite();
  if (!adapter) adapter = await tryNodeSqlite();
  if (!adapter) adapter = await trySqlJs();
  if (!adapter) throw new Error("[DB] No SQLite driver available (bun/better/node/sql.js all failed)");

  if (!state.logged) {
    console.log(`[DB] Driver: ${adapter.driver} | file: ${DATA_FILE}`);
    state.logged = true;
  }

  const { runMigrationOnce } = await import("./migrate.js");
  await runMigrationOnce(adapter);
  return adapter;
}

export async function getAdapter() {
  if (state.instance) return state.instance;
  if (!state.initPromise) state.initPromise = initAdapter().then((a) => { state.instance = a; return a; });
  return state.initPromise;
}

export function getAdapterSync() {
  if (!state.instance) throw new Error("[DB] adapter not initialized — await getAdapter() first");
  return state.instance;
}
