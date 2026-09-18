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

async function migrateEmailLogSender() {
  const [columns] = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'email_logged'
       AND column_name = 'sent_from_email' LIMIT 1`
  );
  if (!columns.length) {
    await pool.query(
      `ALTER TABLE email_logged
       ADD COLUMN sent_from_email VARCHAR(255) NULL DEFAULT NULL
       COMMENT 'Connected Gmail account used to send the message' AFTER email_record_id`
    );
  }

  const [indexes] = await pool.query(
    `SELECT DISTINCT index_name FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'email_logged'
       AND index_name IN ('uq_email_logs_record_process_date', 'uq_email_logs_record_process_date_sender')`
  );
  const indexNames = indexes.map((row) => row.index_name);
  if (indexNames.includes('uq_email_logs_record_process_date')) {
    await pool.query('ALTER TABLE email_logged DROP INDEX uq_email_logs_record_process_date');
  }
  if (!indexNames.includes('uq_email_logs_record_process_date_sender')) {
    await pool.query(
      `ALTER TABLE email_logged
       ADD UNIQUE KEY uq_email_logs_record_process_date_sender
       (email_record_id, process_date, sent_from_email)`
    );
  }

  // Rows created before sender tracking can be attributed to the only account
  // that was connected at migration time.
  await pool.query(
    `UPDATE email_logged l
     INNER JOIN gmail_connections c ON c.id = 1 AND c.google_email IS NOT NULL
     SET l.sent_from_email = c.google_email
     WHERE l.sent_from_email IS NULL`
  );
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
    await migrateEmailLogSender();
    console.log('[db] schema auto-sync complete (tables + default templates ensured)');
  }
  await testConnection();
  console.log(`[db] connected to MySQL database "${DB_NAME}"`);
}

module.exports = { pool, testConnection, initializeDatabase, runSqlFile, DB_NAME };
