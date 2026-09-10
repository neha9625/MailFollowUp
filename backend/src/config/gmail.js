/**
 * Google OAuth 2.0 client factory + Gmail scopes.
 * Secrets come ONLY from environment variables — never from the frontend.
 */
const { google } = require('googleapis');
const ApiError = require('../utils/apiError');

/** Gmail permissions: read/search messages + send messages. */
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function resolveRedirectUri() {
  return (
    `${process.env.GOOGLE_REDIRECT_URI}/api/gmail/callback`
  );
}

function createOAuthClient() {
  if (!isGoogleConfigured()) {
    throw new ApiError(
      500,
      'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend .env file.',
      'OAUTH_NOT_CONFIGURED'
    );
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    resolveRedirectUri()
  );
}

module.exports = { google, GMAIL_SCOPES, isGoogleConfigured, createOAuthClient, resolveRedirectUri };
