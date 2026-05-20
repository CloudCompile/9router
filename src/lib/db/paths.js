import path from "node:path";
import fs from "node:fs";
import { DATA_DIR } from "@/lib/dataDir.js";

// Handle in-memory mode or /tmp fallback
const baseDir = DATA_DIR || "/tmp/.fusion-inmem";
export const DB_DIR = path.join(baseDir, "db");
export const DATA_FILE = path.join(DB_DIR, "data.sqlite");
export const BACKUPS_DIR = path.join(DB_DIR, "backups");
export const LEGACY_FILES = {
  main: path.join(baseDir, "db.json"),
  usage: path.join(baseDir, "usage.json"),
  disabled: path.join(baseDir, "disabledModels.json"),
  details: path.join(baseDir, "request-details.json"),
};

export function ensureDirs() {
  if (!baseDir) return; // In-memory mode
  for (const dir of [baseDir, DB_DIR, BACKUPS_DIR]) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      if (e?.code !== "EEXIST") {
        console.warn(`[DB] Failed to create ${dir}: ${e.message}`);
      }
    }
  }
}
