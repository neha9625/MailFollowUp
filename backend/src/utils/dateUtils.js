/**
 * Server-side date helpers. The weekday is ALWAYS detected here (backend) —
 * never trusted from the frontend. Timezone comes from APP_TIMEZONE.
 */
const { WEEKEND_DAYS } = require('./constants');

/**
 * @returns {{ weekday: string, date: string 'YYYY-MM-DD', time: 'HH:mm', timezone: string, isWeekend: boolean }}
 */
function getTodayInfo() {
  const timezone = process.env.APP_TIMEZONE || 'Asia/Kolkata';
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(now);
  // en-CA formats as YYYY-MM-DD
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  return { weekday, date, time, timezone, isWeekend: WEEKEND_DAYS.includes(weekday) };
}

module.exports = { getTodayInfo };
