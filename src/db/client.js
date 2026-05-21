import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema.js";

let _db = null;

export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("[DB] DATABASE_URL is not set. Configure Vercel Postgres in your project settings.");
    }
    const sql = neon(process.env.DATABASE_URL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}
