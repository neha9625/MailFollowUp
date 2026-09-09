#!/usr/bin/env node
/**
 * Headless automation trigger — same service & safety rules as the UI button.
 * Usage: npm run automation:run   (wire this to cron/Task Scheduler if desired)
 * Example crontab (Mon–Fri 10:00 IST):
 *   0 10 * * 1-5 cd /path/to/backend && node src/scripts/runAutomation.js >> automation.log 2>&1
 */
require('dotenv').config();

const { initializeDatabase } = require('../config/database');
const { runAutomation } = require('../services/emailAutomationService');
const { getTodayInfo } = require('../utils/dateUtils');

(async () => {
  const today = getTodayInfo();
  console.log(`[cron] triggered on ${today.weekday} ${today.date} (${today.timezone})`);
  try {
    await initializeDatabase();
    const summary = await runAutomation({ triggeredBy: 'cron' });
    console.log('[cron] summary:', JSON.stringify({
      sent: summary.sent,
      followUps: summary.followUpsSent,
      newEmails: summary.newEmailsSent,
      failed: summary.failed,
      skipped: summary.skipped,
    }));
    process.exit(0);
  } catch (err) {
    console.error('[cron] automation failed:', err.message);
    process.exit(1);
  }
})();
