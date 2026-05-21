import { neon } from '@neondatabase/serverless';

// Convert SQLite-style ? placeholders to PostgreSQL-style $1, $2, ...
function pgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Neon HTTP adapter — one HTTP request per query, no TCP/WebSocket setup.
// No true transaction isolation (each query is stateless), but ops within
// one Lambda invocation are serial so race conditions are not a concern.
export async function createNeonAdapter(connectionString) {
  if (!connectionString) {
    throw new Error('[DB] DATABASE_URL not configured');
  }

  const sql = neon(connectionString);

  // Test connectivity
  try {
    await sql`SELECT 1`;
    console.log('[DB] Neon HTTP connection verified');
  } catch (e) {
    throw new Error(`[DB] Neon HTTP connection failed: ${e.message}`);
  }

  async function run(query, params = []) {
    const rows = await sql(pgSql(query), params);
    return { changes: rows.length, lastID: rows[0]?.id ?? null };
  }

  async function get(query, params = []) {
    const rows = await sql(pgSql(query), params);
    return rows[0] ?? null;
  }

  async function all(query, params = []) {
    return await sql(pgSql(query), params);
  }

  async function exec(query) {
    await sql(pgSql(query));
  }

  // "Transaction" here just runs fn with the same adapter — no DB-level isolation.
  // Acceptable for a single-user tool where concurrent writes are not expected.
  async function transaction(fn) {
    return await fn({ run, get, all, exec, transaction });
  }

  async function close() {}

  return {
    driver: 'neon-serverless',
    run,
    get,
    all,
    exec,
    transaction,
    close,
    raw: sql,
  };
}
