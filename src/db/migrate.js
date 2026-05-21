import { neon } from "@neondatabase/serverless";

// Create all tables if they don't exist.
// Drizzle's push (drizzle-kit push) handles schema changes in dev.
// This runs at cold-start to ensure tables exist on a fresh Neon DB.
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS _meta (
  key VARCHAR PRIMARY KEY,
  value VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  data VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS providerconnections (
  id VARCHAR PRIMARY KEY,
  provider VARCHAR NOT NULL,
  authtype VARCHAR NOT NULL,
  name VARCHAR,
  email VARCHAR,
  priority INTEGER,
  isactive INTEGER DEFAULT 1,
  data VARCHAR NOT NULL,
  createdat VARCHAR NOT NULL,
  updatedat VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pc_provider ON providerconnections(provider);
CREATE INDEX IF NOT EXISTS idx_pc_provider_active ON providerconnections(provider, isactive);
CREATE INDEX IF NOT EXISTS idx_pc_priority ON providerconnections(provider, priority);

CREATE TABLE IF NOT EXISTS providernodes (
  id VARCHAR PRIMARY KEY,
  type VARCHAR,
  name VARCHAR,
  data VARCHAR NOT NULL,
  createdat VARCHAR NOT NULL,
  updatedat VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pn_type ON providernodes(type);

CREATE TABLE IF NOT EXISTS proxypools (
  id VARCHAR PRIMARY KEY,
  isactive INTEGER DEFAULT 1,
  teststatus VARCHAR,
  data VARCHAR NOT NULL,
  createdat VARCHAR NOT NULL,
  updatedat VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pp_active ON proxypools(isactive);
CREATE INDEX IF NOT EXISTS idx_pp_status ON proxypools(teststatus);

CREATE TABLE IF NOT EXISTS apikeys (
  id VARCHAR PRIMARY KEY,
  key VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  machineid VARCHAR,
  isactive INTEGER DEFAULT 1,
  createdat VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ak_key ON apikeys(key);

CREATE TABLE IF NOT EXISTS combos (
  id VARCHAR PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  kind VARCHAR,
  models VARCHAR NOT NULL,
  createdat VARCHAR NOT NULL,
  updatedat VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_combo_name ON combos(name);

CREATE TABLE IF NOT EXISTS kv (
  scope VARCHAR NOT NULL,
  key VARCHAR NOT NULL,
  value VARCHAR NOT NULL,
  PRIMARY KEY (scope, key)
);
CREATE INDEX IF NOT EXISTS idx_kv_scope ON kv(scope);

CREATE TABLE IF NOT EXISTS usagehistory (
  id SERIAL PRIMARY KEY,
  timestamp VARCHAR NOT NULL,
  provider VARCHAR,
  model VARCHAR,
  connectionid VARCHAR,
  apikey VARCHAR,
  endpoint VARCHAR,
  prompttokens INTEGER DEFAULT 0,
  completiontokens INTEGER DEFAULT 0,
  cost DECIMAL DEFAULT 0,
  status VARCHAR,
  tokens VARCHAR,
  meta VARCHAR
);
CREATE INDEX IF NOT EXISTS idx_uh_ts ON usagehistory(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_uh_provider ON usagehistory(provider);
CREATE INDEX IF NOT EXISTS idx_uh_model ON usagehistory(model);
CREATE INDEX IF NOT EXISTS idx_uh_conn ON usagehistory(connectionid);

CREATE TABLE IF NOT EXISTS usagedaily (
  datekey VARCHAR PRIMARY KEY,
  data VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS requestdetails (
  id VARCHAR PRIMARY KEY,
  timestamp VARCHAR NOT NULL,
  provider VARCHAR,
  model VARCHAR,
  connectionid VARCHAR,
  status VARCHAR,
  data VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rd_ts ON requestdetails(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rd_provider ON requestdetails(provider);
CREATE INDEX IF NOT EXISTS idx_rd_model ON requestdetails(model);
CREATE INDEX IF NOT EXISTS idx_rd_conn ON requestdetails(connectionid);
`;

let _migrated = false;

export async function ensureSchema() {
  if (_migrated) return;
  _migrated = true;

  if (!process.env.DATABASE_URL) return;

  try {
    const sql = neon(process.env.DATABASE_URL);
    // Execute each statement (neon HTTP doesn't support multi-statement strings)
    const stmts = CREATE_SQL
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of stmts) {
      await sql(stmt);
    }
  } catch (e) {
    console.error("[DB] Schema init failed:", e.message);
    throw e;
  }
}
