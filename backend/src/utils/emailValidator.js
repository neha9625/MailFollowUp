const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trims + lowercases an email address. */
function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/** Strict-enough email validation for lead lists. */
function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (email.length < 6 || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

/** Cleans a recipient name: collapses whitespace, caps length. */
function normalizeName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255);
}

module.exports = { isValidEmail, normalizeEmail, normalizeName, EMAIL_REGEX };
