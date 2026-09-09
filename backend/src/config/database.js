/**
 * MySQL connection pool + boot-time initialization.
 * - Parameterized queries only (SQL-injection safe).
 * - DB_AUTO_SYNC=true runs sql/schema.sql + sql/seed.sql (both idempotent).
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_NAME = "zampliastaging";

const baseConfig = {
  host: "zampliadevdb.mysql.database.azure.com",
  port: 3306,
  user: "zampliadevdb@zampliadevdb",
  password: "*kT52^VsETy4f6x$",
};

const pool = mysql.createPool({
  ...baseConfig,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: false,
});

async function runSqlFile(absolutePath) {
  const sql = fs.readFileSync(absolutePath, 'utf8');
  const conn = await mysql.createConnection({ ...baseConfig, multipleStatements: true });
  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

async function testConnection() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0] && rows[0].ok === 1;
}

/**
 * Creates schema/seed if DB_AUTO_SYNC !== 'false', then verifies connectivity.
 * Safe to call on every boot — schema.sql and seed.sql are idempotent.
 */
async function initializeDatabase() {
  const autoSync = String(process.env.DB_AUTO_SYNC ?? 'true') !== 'false';
  if (autoSync) {
    const sqlDir = path.join(__dirname, '..', '..', 'sql');
    await runSqlFile(path.join(sqlDir, 'schema.sql'));
    await runSqlFile(path.join(sqlDir, 'seed.sql'));
    console.log('[db] schema auto-sync complete (tables + default templates ensured)');
  }
  await testConnection();
  console.log(`[db] connected to MySQL database "${DB_NAME}"`);
}

module.exports = { pool, testConnection, initializeDatabase, runSqlFile, DB_NAME };
