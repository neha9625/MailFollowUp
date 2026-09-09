/**
 * Gmail service — the ONLY place that talks to the Gmail API.
 * Controller → this service → Gmail API (googleapis + OAuth 2.0).
 *
 * Responsibilities:
 *  - OAuth: authorization URL, callback token exchange, status, disconnect
 *  - Token lifecycle: encrypted storage (AES-256-GCM) + automatic refresh
 *  - Search: detect previous communication with an address (from:/to:)
 *  - Send: RFC-2822 MIME message with text + HTML alternative
 *  - Resilience: 429/403 rate-limit retry with exponential backoff
 */
const crypto = require('crypto');
const { pool } = require('../config/database');
const { createOAuthClient, GMAIL_SCOPES, isGoogleConfigured, google } = require('../config/gmail');
const { encrypt, decrypt } = require('../utils/crypto');
const ApiError = require('../utils/apiError');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ─────────────────────────── token persistence ─────────────────────────── */

async function getConnectionRow() {
  const [rows] = await pool.query('SELECT * FROM gmail_connections WHERE id = 1');
  return rows[0] || null;
}

async function saveConnection({ googleEmail, accessToken, refreshToken, expiryDate, scope }) {
  const existing = await getConnectionRow();
  // Google may omit refresh_token on re-consent; keep the previous one if so.
  const effectiveRefreshToken = refreshToken || (existing ? decrypt(existing.refresh_token_enc) : null);

  await pool.query(
    `INSERT INTO gmail_connections
       (id, google_email, access_token_enc, refresh_token_enc, token_expiry, scope, is_connected, connected_at, last_error)
     VALUES (1, ?, ?, ?, ?, ?, 1, NOW(), NULL)
     ON DUPLICATE KEY UPDATE
       google_email = VALUES(google_email),
       access_token_enc = VALUES(access_token_enc),
       refresh_token_enc = VALUES(refresh_token_enc),
       token_expiry = VALUES(token_expiry),
       scope = VALUES(scope),
       is_connected = 1,
       connected_at = NOW(),
       last_error = NULL`,
    [
      googleEmail,
      encrypt(accessToken),
      encrypt(effectiveRefreshToken),
      expiryDate ? new Date(expiryDate) : null,
      scope || GMAIL_SCOPES.join(' '),
    ]
  );
}

async function updateAccessToken(accessToken, expiryDate) {
  await pool.query(
    'UPDATE gmail_connections SET access_token_enc = ?, token_expiry = ?, last_error = NULL WHERE id = 1',
    [encrypt(accessToken), expiryDate ? new Date(expiryDate) : null]
  );
}

async function markConnectionError(message) {
  try {
    await pool.query('UPDATE gmail_connections SET last_error = ? WHERE id = 1', [
      String(message).slice(0, 500),
    ]);
  } catch (err) {
    console.error('[gmail] failed to record connection error:', err.message);
  }
}

/* ─────────────────────────────── OAuth flow ─────────────────────────────── */

function getAuthorizationUrl() {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // ask for a refresh token
    prompt: 'consent', // force refresh token every time
    include_granted_scopes: true,
    scope: GMAIL_SCOPES,
  });
}

/** Exchanges the ?code= from Google for tokens and stores them encrypted. */
async function handleOAuthCallback(code) {
  const client = createOAuthClient();
  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch (err) {
    console.error('[gmail] OAuth token exchange failed:', err.response?.data || err.message);
    throw new ApiError(
      400,
      'Google OAuth authorization failed. The code may be expired or already used — please try connecting again.',
      'OAUTH_FAILURE'
    );
  }
  client.setCredentials(tokens);

  const gmail = google.gmail({ version: 'v1', auth: client });
  const profile = await gmail.users.getProfile({ userId: 'me' });
  const googleEmail = profile.data.emailAddress;

  await saveConnection({
    googleEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token, // may be null on re-consent
    expiryDate: tokens.expiry_date,
    scope: tokens.scope,
  });

  console.log(`[gmail] connected as ${googleEmail}`);
  return { email: googleEmail };
}

async function getConnectionStatus() {
  const configured = isGoogleConfigured();
  const row = await getConnectionRow();
  if (!row || !row.is_connected) {
    return {
      configured,
      connected: false,
      email: null,
      connectedAt: null,
      lastError: row ? row.last_error : null,
      scopes: GMAIL_SCOPES,
    };
  }
  return {
    configured,
    connected: true,
    email: row.google_email,
    connectedAt: row.connected_at,
    lastError: row.last_error,
    scopes: String(row.scope || '').split(' ').filter(Boolean),
  };
}

/** Returns an authenticated gmail client or throws 409 GMAIL_NOT_CONNECTED. */
async function getConnectedGmail() {
  const row = await getConnectionRow();
  if (!row || !row.is_connected || !decrypt(row.refresh_token_enc || '')) {
    throw new ApiError(
      409,
      'Gmail is not connected. Open the Gmail Connection page and connect your account first.',
      'GMAIL_NOT_CONNECTED'
    );
  }

  const refreshToken = decrypt(row.refresh_token_enc);
  const accessToken = decrypt(row.access_token_enc);
  const expiryMs = row.token_expiry ? new Date(row.token_expiry).getTime() : 0;

  const client = createOAuthClient();

  // Refresh proactively if the access token is missing/expiring (<60s left)
  if (!accessToken || !expiryMs || Date.now() >= expiryMs - 60_000) {
    try {
      client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await client.refreshAccessToken();
      await updateAccessToken(credentials.access_token, credentials.expiry_date);
      client.setCredentials({ ...credentials, refresh_token: refreshToken });
    } catch (err) {
      console.error('[gmail] token refresh failed:', err.response?.data || err.message);
      await markConnectionError('Token refresh failed — please reconnect your Gmail account.');
      throw new ApiError(
        401,
        'The Gmail session has expired or was revoked. Please reconnect your Gmail account.',
        'GMAIL_TOKEN_EXPIRED'
      );
    }
  } else {
    client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  }

  return { gmail: google.gmail({ version: 'v1', auth: client }), email: row.google_email, auth: client };
}

/** Revokes the token at Google (best effort) and clears the stored connection. */
async function disconnect() {
  const row = await getConnectionRow();
  if (row && row.access_token_enc) {
    try {
      const client = createOAuthClient();
      client.setCredentials({ access_token: decrypt(row.access_token_enc) });
      await client.revokeToken();
    } catch (err) {
      console.warn('[gmail] token revoke failed (clearing locally anyway):', err.message);
    }
  }
  await pool.query(
    `UPDATE gmail_connections SET google_email = NULL, access_token_enc = NULL,
       refresh_token_enc = NULL, token_expiry = NULL, scope = NULL,
       is_connected = 0, last_error = NULL, connected_at = NULL
     WHERE id = 1`
  );
  console.log('[gmail] disconnected');
  return { connected: false };
}

/* ──────────────────────────── error resilience ──────────────────────────── */

function getHttpStatusCode(err) {
  return err.status || err.statusCode || err.code && Number(err.code) || err.response?.status || null;
}

function isRateLimitError(err) {
  const status = getHttpStatusCode(err);
  if (status === 429) return true;
  if (status === 403) {
    const reasons = (err.errors || []).map((e) => e.reason).join(',');
    return /rateLimit|userRateLimit|quotaExceeded|dailyLimit|rate/i.test(reasons || '');
  }
  return false;
}

function isAuthError(err) {
  const status = getHttpStatusCode(err);
  return status === 401 || /invalid credentials|invalid_grant/i.test(err.message || '');
}

/** Retries rate-limited Gmail calls with exponential backoff. */
async function withGmailRetry(fn, maxRetries = 3) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxRetries || !isRateLimitError(err)) throw err;
      const backoff = 1000 * 2 ** attempt + Math.floor(Math.random() * 500);
      console.warn(`[gmail] rate limited — retry ${attempt + 1}/${maxRetries} in ${backoff}ms`);
      await sleep(backoff);
      attempt += 1;
    }
  }
}

/** Human-readable message for failed sends (stored in email_logs). */
function describeGmailError(err) {
  const status = getHttpStatusCode(err);
  const detail = err.errors?.[0]?.message || err.response?.data?.error_description || err.message;
  if (status === 429) return `Gmail rate limit reached: ${detail}`;
  if (status === 403 && /daily/i.test(detail || '')) return `Gmail daily sending limit reached: ${detail}`;
  if (status === 403) return `Gmail permission/quota error: ${detail}`;
  if (status === 401 || status === 403) return `Gmail authorization error: ${detail}`;
  if (status === 400) return `Gmail rejected the message: ${detail}`;
  if (['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND'].includes(err.code)) {
    return `Network failure while contacting Gmail (${err.code}). Please try again.`;
  }
  return detail || 'Unknown Gmail API error';
}

/* ───────────────────────────── search + send ────────────────────────────── */

/**
 * Detects whether previous Gmail communication exists with the address.
 * Query searches BOTH directions across the mailbox (incl. Sent),
 * excluding Google Chat:  from:(x@y.com) OR to:(x@y.com) -in:chats
 */
async function searchPreviousEmail(emailAddress) {
  const { gmail } = await getConnectedGmail();
  const q = `from:(${emailAddress}) OR to:(${emailAddress}) -in:chats`;
  const res = await withGmailRetry(() =>
    gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: 1,
      fields: 'messages(id,threadId),resultSizeEstimate',
    })
  );
  const messages = res.data.messages || [];
  return {
    found: messages.length > 0,
    messageId: messages.length ? messages[0].id : null,
    threadId: messages.length ? messages[0].threadId : null,
    query: q,
  };
}

/** Fetches Message-ID/Subject headers of a message (for threading replies). */
async function getMessageHeaders(messageId) {
  const { gmail } = await getConnectedGmail();
  const res = await withGmailRetry(() =>
    gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['Message-ID', 'Subject'],
    })
  );
  const headers = res.data.payload?.headers || [];
  return {
    messageId: headers.find((h) => h.name === 'Message-ID')?.value || null,
    subject: headers.find((h) => h.name === 'Subject')?.value || null,
  };
}

function encodeSubject(subject) {
  if (!/[^\x00-\x7F]/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

/** Builds an RFC-2822 multipart/alternative MIME message. */
function buildMimeMessage({ from, to, subject, text, html, inReplyTo }) {
  const boundary = `=_gmail_followup_${crypto.randomBytes(10).toString('hex')}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomBytes(12).toString('hex')}@${from.split('@')[1] || 'local'}>`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    `--${boundary}--`,
    '',
  ].join('\r\n');
  return `${headers.join('\r\n')}\r\n\r\n${body}`;
}

const toBase64Url = (str) =>
  Buffer.from(str, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Sends an email via the connected Gmail account.
 * When `threadId`/`inReplyTo` are provided (follow-ups), the message is
 * threaded onto the previous conversation.
 */
async function sendEmail({ to, subject, text, html, threadId = null, inReplyTo = null }) {
  const { gmail, email: fromAddress } = await getConnectedGmail();
  const raw = buildMimeMessage({ from: fromAddress, to, subject, text, html, inReplyTo });
  const requestBody = { raw: toBase64Url(raw) };
  if (threadId) requestBody.threadId = threadId;

  const res = await withGmailRetry(() =>
    gmail.users.messages.send({ userId: 'me', requestBody })
  );
  return {
    id: res.data.id,
    threadId: res.data.threadId || threadId || null,
    from: fromAddress,
  };
}

module.exports = {
  GMAIL_SCOPES,
  getAuthorizationUrl,
  handleOAuthCallback,
  getConnectionStatus,
  getConnectedGmail,
  searchPreviousEmail,
  getMessageHeaders,
  sendEmail,
  disconnect,
  describeGmailError,
  withGmailRetry,
};
