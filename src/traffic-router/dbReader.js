// CJS reader for Traffic Router standalone process. Reads routerAlias from JSON cache
// at $DATA_DIR/mitm/aliases.json (synced by app from SQLite on startup + writes).
// JSON-only: no SQLite native binding required in Traffic Router bundle.
const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("./paths");

const CACHE_FILE = path.join(DATA_DIR, "mitm", "aliases.json");

function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch { return null; }
}

function getRouterAlias(toolName) {
  const all = readCache();
  return all?.[toolName] || null;
}

module.exports = { getRouterAlias };
