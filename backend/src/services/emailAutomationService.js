/**
 * emailAutomationService — the heart of the system.
 *
 * Flow (backend-enforced, weekday detected server-side):
 *   1. Get today's weekday (APP_TIMEZONE). Saturday/Sunday → refuse to run.
 *   2. Verify Gmail is connected (409 otherwise).
 *   3. Get active Excel records (400 if none).
 *   4. Load today's FOLLOW_UP + NEW_EMAIL templates (400 if missing).
 *   5. For each record:
 *        duplicate check → Gmail search → pick template → render → send → log
 *   6. Return a full summary.
 */
const gmailService = require('./gmailService');
const excelService = require('./excelService');
const templateService = require('./templateService');
const emailLogService = require('./emailLogService');
const { renderTemplate } = require('../utils/templateRenderer');
const { getTodayInfo } = require('../utils/dateUtils');
const ApiError = require('../utils/apiError');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Marks an already-processed record as SKIPPED (type copied from its SUCCESS log). */
async function logSkipped(record, existingLog, weekday, reason) {
  return emailLogService.createLog({
    emailRecordId: record.id,
    email: record.email,
    name: record.name,
    mailFound: existingLog ? existingLog.mail_found : null,
    emailType: existingLog ? existingLog.email_type : 'NEW_EMAIL',
    templateType: weekday,
    subject: existingLog ? existingLog.subject : null,
    status: 'SKIPPED',
    errorMessage: reason,
    processDate: null, // NULL keeps the unique index satisfied for future retries
  });
}

/**
 * @param {{triggeredBy?: string}} options
 * @returns {Promise<object>} run summary
 */
async function runAutomation(options = {}) {
  const triggeredBy = options.triggeredBy || 'manual';
  const { weekday, date, timezone } = getTodayInfo();

  // 1. Weekend guard — no email is ever sent Sat/Sun
  if (weekday === 'Saturday' || weekday === 'Sunday') {
    throw new ApiError(
      400,
      'Automation is not configured for weekends.',
      'WEEKEND_NOT_CONFIGURED'
    );
  }

  // 2. Gmail must be connected
  const gmailStatus = await gmailService.getConnectionStatus();
  if (!gmailStatus.connected) {
    throw new ApiError(
      409,
      'Gmail is not connected. Connect your Gmail account on the Gmail Connection page before running automation.',
      'GMAIL_NOT_CONNECTED'
    );
  }

  // 3. Active Excel file + records
  const activeFile = await excelService.getActiveFile();
  if (!activeFile) {
    throw new ApiError(
      400,
      'No active Excel file. Upload one on the Excel Management page first.',
      'NO_ACTIVE_FILE'
    );
  }
  const records = await excelService.getActiveRecords();
  if (records.length === 0) {
    throw new ApiError(
      400,
      'The active Excel file contains no valid records to process.',
      'NO_RECORDS'
    );
  }

  // 4. Today's templates
  const templates = await templateService.getTemplatesForDay(weekday);
  if (!templates.FOLLOW_UP) {
    throw new ApiError(
      400,
      `Missing FOLLOW_UP template for ${weekday}. Add it on the Email Templates page.`,
      'MISSING_TEMPLATE'
    );
  }
  if (!templates.NEW_EMAIL) {
    throw new ApiError(
      400,
      `Missing NEW_EMAIL template for ${weekday}. Add it on the Email Templates page.`,
      'MISSING_TEMPLATE'
    );
  }

  console.log(
    `[automation] run started (${triggeredBy}) | ${weekday} ${date} (${timezone}) | ` +
      `file "${activeFile.file_name}" | ${records.length} records`
  );

  const startedAt = new Date();
  const delayMs = Math.max(0, Number(process.env.GMAIL_SEND_DELAY_MS ?? 400));

  const summary = {
    triggeredBy,
    fileId: activeFile.id,
    fileName: activeFile.file_name,
    weekday,
    date,
    timezone,
    totalRecords: records.length,
    sent: 0,
    followUpsSent: 0,
    newEmailsSent: 0,
    failed: 0,
    skipped: 0,
    results: [],
    startedAt,
    finishedAt: null,
  };

  // 5. Sequential processing keeps us well inside Gmail rate limits
  for (const record of records) {
    try {
      // ── Duplicate-send protection (application level) ──
      const existingLog = await emailLogService.getSuccessfulLogOnDate(record.id, date);
      if (existingLog) {
        await logSkipped(
          record,
          existingLog,
          weekday,
          `Duplicate prevented — an email was already sent successfully today (${date}).`
        );
        summary.skipped += 1;
        summary.results.push({ email: record.email, name: record.name, status: 'SKIPPED', reason: 'Already processed today' });
        continue;
      }

      // ── Gmail search: previous communication? ──
      const search = await gmailService.searchPreviousEmail(record.email);
      const found = search.found;
      const template = found ? templates.FOLLOW_UP : templates.NEW_EMAIL;
      const emailType = found ? 'FOLLOW_UP' : 'NEW_EMAIL';

      // ── Render today's template with real variables ──
      const rendered = renderTemplate(template, { name: record.name, email: record.email });

      // ── Thread follow-ups onto the previous conversation when possible ──
      let threadId = null;
      let inReplyTo = null;
      if (found && search.messageId) {
        try {
          const headers = await gmailService.getMessageHeaders(search.messageId);
          threadId = search.threadId;
          inReplyTo = headers.messageId;
        } catch (err) {
          console.warn(`[automation] could not read thread headers for ${record.email}:`, err.message);
        }
      }

      // ── Send ──
      const sent = await gmailService.sendEmail({
        to: record.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        threadId,
        inReplyTo,
      });

      // ── Log SUCCESS (unique index = DB-level duplicate protection) ──
      const logResult = await emailLogService.createLog({
        emailRecordId: record.id,
        email: record.email,
        name: record.name,
        mailFound: found ? 1 : 0,
        emailType,
        templateType: weekday,
        subject: rendered.subject,
        gmailMessageId: sent.id,
        gmailThreadId: sent.threadId,
        status: 'SUCCESS',
        sentAt: new Date(),
        processDate: date,
      });

      if (logResult.duplicate) {
        summary.skipped += 1;
        summary.results.push({ email: record.email, name: record.name, status: 'SKIPPED', reason: 'Duplicate prevented at database level' });
      } else {
        summary.sent += 1;
        if (found) summary.followUpsSent += 1;
        else summary.newEmailsSent += 1;
        summary.results.push({
          email: record.email,
          name: record.name,
          mailFound: found,
          emailType,
          status: 'SUCCESS',
          messageId: sent.id,
        });
      }
      console.log(
        `[automation] ${found ? 'FOLLOW_UP' : 'NEW_EMAIL'} → ${record.email} (${record.name}) OK`
      );
    } catch (err) {
      // ── Log FAILED and continue with the next record ──
      const message = gmailService.describeGmailError(err);
      console.error(`[automation] FAILED for ${record.email}: ${message}`);
      try {
        await emailLogService.createLog({
          emailRecordId: record.id,
          email: record.email,
          name: record.name,
          mailFound: null,
          emailType: 'NEW_EMAIL',
          templateType: weekday,
          subject: null,
          status: 'FAILED',
          errorMessage: message,
          processDate: null, // allows a retry later today
        });
      } catch (logErr) {
        console.error('[automation] failed to write FAILED log:', logErr.message);
      }
      summary.failed += 1;
      summary.results.push({ email: record.email, name: record.name, status: 'FAILED', error: message });
    }

    if (delayMs > 0) await sleep(delayMs); // pacing between Gmail calls
  }

  summary.finishedAt = new Date();
  console.log(
    `[automation] run finished | sent: ${summary.sent} (follow-ups ${summary.followUpsSent}, ` +
      `new ${summary.newEmailsSent}), failed: ${summary.failed}, skipped: ${summary.skipped}`
  );
  return summary;
}

module.exports = { runAutomation };
