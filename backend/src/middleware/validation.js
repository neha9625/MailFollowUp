/**
 * Upload + payload validation middleware.
 * All checks are whitelist/regex based; nothing from the client is trusted.
 */
const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/apiError');
const { TEMPLATE_TYPES, WEEKDAYS } = require('../utils/constants');

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB || 5) * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new ApiError(
          400,
          `Invalid file type "${ext || 'unknown'}". Only .xlsx and .xls files are allowed.`,
          'INVALID_FILE_TYPE'
        )
      );
    }
    cb(null, true);
  },
});

/** Wraps multer so its errors flow into the central error handler. */
function excelUploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) {
      return next(
        new ApiError(400, 'No file received. Attach an Excel file in the "file" field.', 'NO_FILE')
      );
    }
    next();
  });
}

/** Validates :type and :day path params for template routes. */
function validateTemplateParams(req, res, next) {
  const { type, day } = req.params;
  if (!TEMPLATE_TYPES.includes(type)) {
    return next(
      new ApiError(400, `Invalid template type "${type}". Valid: ${TEMPLATE_TYPES.join(', ')}.`, 'INVALID_TEMPLATE_TYPE')
    );
  }
  if (!WEEKDAYS.includes(day)) {
    return next(
      new ApiError(400, `Invalid day "${day}". Valid weekdays: ${WEEKDAYS.join(', ')}.`, 'INVALID_DAY')
    );
  }
  next();
}

/** Validates the template update payload. */
function validateTemplateUpdate(req, res, next) {
  const { subject, body } = req.body || {};
  if (typeof subject !== 'string' || !subject.trim()) {
    return next(new ApiError(400, 'Subject is required.', 'VALIDATION_ERROR', { field: 'subject' }));
  }
  if (subject.trim().length > 500) {
    return next(new ApiError(400, 'Subject must be 500 characters or fewer.', 'VALIDATION_ERROR', { field: 'subject' }));
  }
  if (typeof body !== 'string' || !body.trim()) {
    return next(new ApiError(400, 'Email body is required.', 'VALIDATION_ERROR', { field: 'body' }));
  }
  if (body.trim().length > 20000) {
    return next(new ApiError(400, 'Email body must be 20,000 characters or fewer.', 'VALIDATION_ERROR', { field: 'body' }));
  }
  req.validatedTemplate = { subject: subject.trim(), body: body.trim() };
  next();
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_VALUES = ['SUCCESS', 'FAILED', 'SKIPPED'];

/** Sanitizes email-logs list query params. */
function validateLogQuery(req, res, next) {
  const q = req.query || {};
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize, 10) || 20));
  const status = STATUS_VALUES.includes(q.status) ? q.status : null;
  const emailType = TEMPLATE_TYPES.includes(q.emailType) ? q.emailType : null;
  const search = typeof q.search === 'string' ? q.search.trim().slice(0, 255) : '';
  const dateFrom = DATE_REGEX.test(q.dateFrom || '') ? q.dateFrom : null;
  const dateTo = DATE_REGEX.test(q.dateTo || '') ? q.dateTo : null;

  req.validatedLogQuery = { page, pageSize, status, emailType, search, dateFrom, dateTo };
  next();
}

module.exports = {
  excelUploadMiddleware,
  validateTemplateParams,
  validateTemplateUpdate,
  validateLogQuery,
};
