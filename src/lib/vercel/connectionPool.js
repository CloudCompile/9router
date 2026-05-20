// Singleton connection pool for Vercel serverless
// Reuses database connections across function invocations
let poolInstance = null;

export async function getPooledConnection() {
  if (poolInstance) return poolInstance;

  const { getAdapter } = await import("../db/driver.js");
  poolInstance = await getAdapter();

  // Reset on function timeout to prevent stale connections
  if (process.env.VERCEL) {
    process.on("beforeExit", () => {
      try {
        if (poolInstance?.close) poolInstance.close();
      } catch (e) {
        console.log("[Pool] Close error:", e.message);
      }
      poolInstance = null;
    });
  }

  return poolInstance;
}

export async function execQuery(fn) {
  const adapter = await getPooledConnection();
  return fn(adapter);
}
