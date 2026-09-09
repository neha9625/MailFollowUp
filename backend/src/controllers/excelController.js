const excelService = require('../services/excelService');
const asyncHandler = require('../utils/asyncHandler');

/** POST /api/excel/upload — multipart file field "file" */
const upload = asyncHandler(async (req, res) => {
  const result = await excelService.processUpload(req.file.buffer, req.file.originalname);
  res.status(201).json({ success: true, data: result });
});

/** GET /api/excel/active */
const getActive = asyncHandler(async (req, res) => {
  const file = await excelService.getActiveFile();
  if (!file) {
    return res.json({ success: true, data: { file: null, recordCount: 0 } });
  }
  const recordCount = await excelService.getActiveRecordCount(file.id);
  res.json({ success: true, data: { file, recordCount } });
});

/** GET /api/excel/history */
const getHistory = asyncHandler(async (req, res) => {
  const files = await excelService.getUploadHistory();
  res.json({ success: true, data: { files } });
});

module.exports = { upload, getActive, getHistory };
