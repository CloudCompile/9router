import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Required for Node.js WebSocket support in @neondatabase/serverless
neonConfig.webSocketConstructor = ws;

// Neon serverless adapter — uses @neondatabase/serverless which handles
// cold starts much better than plain pg on Vercel
export async function createNeonAdapter(connectionString) {
  if (!connectionString) {
    throw new Error('[DB] DATABASE_URL not configured');
  }

  const pool = new Pool({ connectionString, max: 1 });

  // Test connectivity
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB] Neon serverless connection verified');
  } catch (e) {
    await pool.end();
    throw new Error(`[DB] Neon serverless connection failed: ${e.message}`);
  }

  async function run(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return { changes: result.rowCount || 0, lastID: result.rows[0]?.id ?? null };
    } finally {
      client.release();
    }
  }

  async function get(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows[0] ?? null;
    } finally {
      client.release();
    }
  }

  async function all(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async function exec(sql) {
    const client = await pool.connect();
    try {
      await client.query(sql);
    } finally {
      client.release();
    }
  }

  async function transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txAdapter = {
        run: async (sql, params = []) => {
          const result = await client.query(sql, params);
          return { changes: result.rowCount || 0, lastID: result.rows[0]?.id ?? null };
        },
        get: async (sql, params = []) => {
          const result = await client.query(sql, params);
          return result.rows[0] ?? null;
        },
        all: async (sql, params = []) => {
          const result = await client.query(sql, params);
          return result.rows;
        },
        exec: async (sql) => {
          await client.query(sql);
        },
        transaction: async (innerFn) => {
          const sp = `sp_${Math.random().toString(36).slice(2)}`;
          await client.query(`SAVEPOINT ${sp}`);
          try {
            const result = await innerFn(txAdapter);
            await client.query(`RELEASE SAVEPOINT ${sp}`);
            return result;
          } catch (e) {
            try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch {}
            throw e;
          }
        },
      };
      const result = await fn(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async function close() {
    await pool.end();
  }

  return {
    driver: 'neon-serverless',
    run,
    get,
    all,
    exec,
    transaction,
    close,
    raw: pool,
  };
}
