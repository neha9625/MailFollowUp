const emailAutomationService = require('../services/emailAutomationService');
const asyncHandler = require('../utils/asyncHandler');

/** POST /api/automation/run — processes the active Excel list for today's weekday */
const run = asyncHandler(async (req, res) => {
  const summary = await emailAutomationService.runAutomation({ triggeredBy: 'dashboard' });
  res.json({ success: true, data: { summary } });
});

module.exports = { run };
