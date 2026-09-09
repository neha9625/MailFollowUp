const ApiError = require('../utils/apiError');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Unexpected server error';
  let details = err.details || null;

  // MySQL duplicate (e.g. concurrent duplicate-send race)
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Duplicate entry detected — the record was already processed.';
  }
  // MySQL connection issues
  if (['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(err.code)) {
    statusCode = 503;
    code = 'DB_UNAVAILABLE';
    message = 'Database is unavailable or credentials are invalid. Check MYSQL_* settings.';
  }
  // Malformed JSON body
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Request body contains malformed JSON.';
  }
  // Multer upload limits
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    code = 'FILE_TOO_LARGE';
    message = `Uploaded file is too large. Maximum allowed size is ${
      process.env.MAX_UPLOAD_SIZE_MB || 5
    } MB.`;
  }

  if (!err.isOperational) {
    console.error('[UNHANDLED ERROR]', err);
  }

  if (res.headersSent) return next(err);

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
