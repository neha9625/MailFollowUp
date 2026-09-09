/**
 * Email log service — permanent history of every automation result.
 * Includes the DB-level duplicate-send protection helper.
 */
const { pool } = require('../config/database');

/**
 * Inserts one email_logs row.
 * If the unique key (email_record_id, process_date) collides — i.e. another
 * run already recorded a SUCCESS for this record today — the insert is
 * treated as a duplicate (idempotent), never a crash.
 */
async function createLog(entry) {
  const {
    emailRecordId = null,
    email,
    name = null,
    mailFound = null,
    emailType,
    templateType,
    subject = null,
    gmailMessageId = null,
    gmailThreadId = null,
    status,
    errorMessage = null,
    sentAt = null,
    processDate = null,
  } = entry;

  try {
    const [result] = await pool.query(
      `INSERT INTO email_logged
         (email_record_id, email, name, mail_found, email_type, template_type,
          subject, gmail_message_id, gmail_thread_id, status, error_message, sent_at, process_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emailRecordId,
        email,
        name,
        mailFound,
        emailType,
        templateType,
        subject,
        gmailMessageId,
        gmailThreadId,
        status,
        errorMessage,
        sentAt,
        processDate,
      ]
    );
    return { id: result.insertId, duplicate: false };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.warn(`[logs] duplicate prevented for ${email} on ${processDate}`);
      return { id: null, duplicate: true };
    }
    throw err;
  }
}

/** Returns the existing SUCCESS log for a record on a given date, if any. */
async function getSuccessfulLogOnDate(emailRecordId, dateYyyyMmDd) {
  if (!emailRecordId || !dateYyyyMmDd) return null;
  const [rows] = await pool.query(
    `SELECT id, email, name, mail_found, email_type, template_type, subject
     FROM email_logged
     WHERE email_record_id = ? AND process_date = ? AND status = 'SUCCESS'
     ORDER BY id DESC LIMIT 1`,
    [emailRecordId, dateYyyyMmDd]
  );
  return rows[0] || null;
}

/**
 * Filtered, paginated log listing.
 * All values are bound parameters — SQL injection safe.
 */
async function listLogs({ page, pageSize, status, emailType, search, dateFrom, dateTo }) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(email LIKE ? OR name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (emailType) {
    where.push('email_type = ?');
    params.push(emailType);
  }
  if (dateFrom) {
    where.push('created_at >= ?');
    params.push(`${dateFrom} 00:00:00`);
  }
  if (dateTo) {
    where.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)', );
    params.push(`${dateTo} 00:00:00`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM email_logged ${whereSql}`,
    params
  );

  const offset = (page - 1) * pageSize;
  const [logs] = await pool.query(
    `SELECT id, email_record_id, email, name, mail_found, email_type, template_type,
            subject, gmail_message_id, gmail_thread_id, status, error_message,
            sent_at, process_date, created_at
     FROM email_logged ${whereSql}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

async function getLogById(id) {
  const [rows] = await pool.query('SELECT * FROM email_logged WHERE id = ? LIMIT 1', [Number(id)]);
  return rows[0] || null;
}

/** Aggregate counters for the dashboard. */
async function getStats() {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*)                                                              AS totalLogs,
       COALESCE(SUM(status = 'SUCCESS'), 0)                                  AS successCount,
       COALESCE(SUM(status = 'FAILED'), 0)                                   AS failedCount,
       COALESCE(SUM(status = 'SKIPPED'), 0)                                  AS skippedCount,
       COALESCE(SUM(email_type = 'FOLLOW_UP' AND status = 'SUCCESS'), 0)     AS followUpsSent,
       COALESCE(SUM(email_type = 'NEW_EMAIL' AND status = 'SUCCESS'), 0)     AS newEmailsSent,
       COALESCE(SUM(mail_found = 1), 0)                                      AS mailsFound,
       COALESCE(SUM(status = 'SUCCESS' AND sent_at >= CURDATE()), 0)         AS sentToday
     FROM email_logged`
  );
  const r = rows[0];
  // mysql2 returns BIGINT SUMs as strings — normalize to numbers
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v) || 0]));
}

module.exports = { createLog, getSuccessfulLogOnDate, listLogs, getLogById, getStats };
