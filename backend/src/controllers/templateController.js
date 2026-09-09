const templateService = require('../services/templateService');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/templates — grouped by FOLLOW_UP / NEW_EMAIL */
const getAll = asyncHandler(async (req, res) => {
  const grouped = await templateService.getAllGrouped();
  res.json({ success: true, data: grouped });
});

/** GET /api/templates/:type/:day */
const getOne = asyncHandler(async (req, res) => {
  const template = await templateService.getTemplateOr404(req.params.type, req.params.day);
  res.json({ success: true, data: { template } });
});

/** PUT /api/templates/:type/:day */
const update = asyncHandler(async (req, res) => {
  const template = await templateService.updateTemplate(
    req.params.type,
    req.params.day,
    req.validatedTemplate
  );
  console.log(`[templates] updated ${req.params.type}/${req.params.day}`);
  res.json({ success: true, data: { template } });
});

module.exports = { getAll, getOne, update };
