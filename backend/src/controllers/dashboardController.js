const excelService = require('../services/excelService');
const gmailService = require('../services/gmailService');
const templateService = require('../services/templateService');
const emailLogService = require('../services/emailLogService');
const { getTodayInfo } = require('../utils/dateUtils');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/dashboard — everything the Dashboard needs in one call */
const getDashboard = asyncHandler(async (req, res) => {
  const today = getTodayInfo();

  const [activeFile, gmailStatus, stats, recentLogsResult] = await Promise.all([
    excelService.getActiveFile(),
    gmailService.getConnectionStatus(),
    emailLogService.getStats(),
    emailLogService.listLogs({ page: 1, pageSize: 5 }),
  ]);

  const recordCount = activeFile ? await excelService.getActiveRecordCount(activeFile.id) : 0;

  const templates = today.isWeekend
    ? { FOLLOW_UP: null, NEW_EMAIL: null }
    : await templateService.getTemplatesForDay(today.weekday);

  res.json({
    success: true,
    data: {
      today,
      activeFile: activeFile
        ? { ...activeFile, recordCount }
        : null,
      stats,
      gmail: {
        connected: gmailStatus.connected,
        email: gmailStatus.email,
        configured: gmailStatus.configured,
        connectedAt: gmailStatus.connectedAt,
        lastError: gmailStatus.lastError,
      },
      templates: {
        FOLLOW_UP: templates.FOLLOW_UP
          ? { subject: templates.FOLLOW_UP.subject, day_of_week: templates.FOLLOW_UP.day_of_week }
          : null,
        NEW_EMAIL: templates.NEW_EMAIL
          ? { subject: templates.NEW_EMAIL.subject, day_of_week: templates.NEW_EMAIL.day_of_week }
          : null,
      },
      recentLogs: recentLogsResult.logs,
    },
  });
});

module.exports = { getDashboard };
