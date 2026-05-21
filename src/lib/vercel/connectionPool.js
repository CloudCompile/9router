// Neon HTTP is stateless — no pooling needed. Just re-export the Drizzle client.
export { getDb as getPooledConnection } from "@/db/client.js";

export async function execQuery(fn) {
  const { getDb } = await import("@/db/client.js");
  return fn(getDb());
}
