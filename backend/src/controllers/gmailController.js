const gmailService = require('../services/gmailService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

/** Browser navigations (full-page) accept text/html — API clients get JSON. */
function wantsHtml(req) {
  return String(req.headers.accept || '').includes('text/html');
}

function redirectToConnectionPage(res, params) {
  const query = new URLSearchParams(params).toString();
  res.redirect(`${frontendUrl}/gmail${query ? `?${query}` : ''}`);
}

/** GET /api/gmail/connect — 302 redirect to the Google consent screen */
const connect = asyncHandler(async (req, res) => {
  try {
    const authUrl = gmailService.getAuthorizationUrl();
    if (wantsHtml(req)) return res.redirect(authUrl);
    return res.json({ success: true, data: { authorizationUrl: authUrl } });
  } catch (err) {
    if (wantsHtml(req)) {
      return redirectToConnectionPage(res, { status: 'error', message: err.message });
    }
    throw err;
  }
});

/** GET /api/gmail/callback — Google redirects back here with ?code=... */
const callback = asyncHandler(async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('[gmail] OAuth denied by user or failed:', error);
    return redirectToConnectionPage(res, {
      status: 'error',
      message: `Google authorization was not completed (${error}).`,
    });
  }
  if (!code) {
    return redirectToConnectionPage(res, {
      status: 'error',
      message: 'Missing authorization code in callback.',
    });
  }

  try {
    const { email } = await gmailService.handleOAuthCallback(code);
    redirectToConnectionPage(res, { status: 'connected', email });
  } catch (err) {
    console.error('[gmail] OAuth callback failed:', err.message);
    redirectToConnectionPage(res, {
      status: 'error',
      message: err.message,
    });
  }
});

/** GET /api/gmail/status */
const getStatus = asyncHandler(async (req, res) => {
  const status = await gmailService.getConnectionStatus();
  res.json({ success: true, data: status });
});

/** POST /api/gmail/disconnect */
const disconnect = asyncHandler(async (req, res) => {
  const result = await gmailService.disconnect();
  res.json({ success: true, data: result });
});

module.exports = { connect, callback, getStatus, disconnect };
