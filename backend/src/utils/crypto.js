/**
 * AES-256-GCM encryption for Gmail OAuth tokens at rest.
 * Key is derived from SESSION_SECRET (scrypt, static app salt).
 */
const crypto = require('crypto');

const SALT = 'gmail-followup-automation/v1';
const secret = process.env.SESSION_SECRET || 'insecure-dev-secret-change-me';
const KEY = crypto.scryptSync(secret, SALT, 32);

function encrypt(plain) {
  if (plain === undefined || plain === null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

function decrypt(payload) {
  if (!payload) return null;
  try {
    const [ivB64, tagB64, dataB64] = String(payload).split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch (err) {
    throw new Error('Failed to decrypt stored credentials — did SESSION_SECRET change? Reconnect Gmail.');
  }
}

module.exports = { encrypt, decrypt };
