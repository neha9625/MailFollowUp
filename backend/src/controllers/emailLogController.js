const emailLogService = require('../services/emailLogService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

/** GET /api/email-logs — search + filters + pagination */
const list = asyncHandler(async (req, res) => {
  const result = await emailLogService.listLogs(req.validatedLogQuery);
  res.json({ success: true, data: result });
});

/** GET /api/email-logs/:id */
const getOne = asyncHandler(async (req, res) => {
  const log = await emailLogService.getLogById(req.params.id);
  if (!log) {
    throw new ApiError(404, `Email log #${req.params.id} not found.`, 'LOG_NOT_FOUND');
  }
  res.json({ success: true, data: { log } });
});

module.exports = { list, getOne };
