import pkg from 'pg';
const { Pool } = pkg;

// Neon PostgreSQL adapter for serverless
export async function createPostgresAdapter(connectionString) {
  if (!connectionString) {
    throw new Error('[DB] DATABASE_URL not configured');
  }

  // Use connection pooling for serverless
  const pool = new Pool({
    connectionString,
    max: 1, // Single connection per function
    idleTimeoutMillis: 8000,
    connectionTimeoutMillis: 8000, // 8s timeout (Vercel has 10s limit, with overhead)
  });

  // Test connection
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB] PostgreSQL connection verified');
  } catch (e) {
    throw new Error(`[DB] PostgreSQL connection failed: ${e.message}`);
  }

  // Statement cache
  const stmtCache = new Map();
  const preparedStatements = new Map();

  async function prepare(sql) {
    if (preparedStatements.has(sql)) {
      return preparedStatements.get(sql);
    }
    // Note: pg doesn't require explicit prepare, but we cache the SQL
    preparedStatements.set(sql, sql);
    return sql;
  }

  async function run(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return {
        changes: result.rowCount || 0,
        lastID: result.rows[0]?.id,
      };
    } finally {
      client.release();
    }
  }

  async function get(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows[0] || null;
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
      // Create a transaction-specific adapter that uses the same client
      const txAdapter = {
        run: async (sql, params = []) => {
          const result = await client.query(sql, params);
          return { changes: result.rowCount || 0, lastID: result.rows[0]?.id };
        },
        get: async (sql, params = []) => {
          const result = await client.query(sql, params);
          return result.rows[0] || null;
        },
        all: async (sql, params = []) => {
          const result = await client.query(sql, params);
          return result.rows;
        },
        exec: async (sql) => {
          await client.query(sql);
        },
        transaction: async (innerFn) => {
          // Nested transactions use savepoints
          const sp = `sp_${Math.random().toString(36).slice(2)}`;
          await client.query(`SAVEPOINT ${sp}`);
          try {
            const result = await innerFn(txAdapter);
            await client.query(`RELEASE ${sp}`);
            return result;
          } catch (e) {
            try { await client.query(`ROLLBACK TO ${sp}`); } catch {}
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
    driver: 'postgresql',
    prepare,
    run,
    get,
    all,
    exec,
    transaction,
    close,
    raw: pool,
  };
}
