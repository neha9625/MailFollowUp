/**
 * Optional API-key auth for production deployments.
 * - If ADMIN_API_TOKEN is NOT set → auth is disabled (local development).
 * - If set → every /api request needs `Authorization: Bearer <token>`.
 *   Exceptions: the Gmail OAuth redirect + callback (full-page browser
 *   navigation cannot attach headers) and the health probe.
 */
const ApiError = require('../utils/apiError');

const EXEMPT_PATHS = ['/gmail/connect', '/gmail/callback', '/health'];

function authMiddleware(req, res, next) {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return next(); // auth disabled
  if (EXEMPT_PATHS.some((p) => req.path === p || req.path.startsWith(`${p}?`))) return next();

  const header = req.headers.authorization || '';
  if (header === `Bearer ${token}`) return next();

  next(new ApiError(401, 'Unauthorized. Provide a valid bearer token.', 'UNAUTHORIZED'));
}

module.exports = { authMiddleware };
