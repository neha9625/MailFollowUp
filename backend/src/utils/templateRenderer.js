/**
 * Renders email templates by replacing {{name}} and {{email}}.
 * Produces plain text + safe HTML (auto paragraphs, escaped content).
 */
const TEMPLATE_VAR_REGEX = /\{\{\s*([A-Za-z_]\w*)\s*\}\}/g;

function interpolate(text, vars) {
  return String(text || '').replace(TEMPLATE_VAR_REGEX, (match, key) => {
    const value = vars[key.toLowerCase()];
    return value === undefined || value === null ? '' : String(value);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Converts a plain-text email body into simple HTML paragraphs. */
function textToHtml(text) {
  return String(text)
    .split(/\r?\n\r?\n+/)
    .filter((p) => p.trim().length > 0)
    .map(
      (para) =>
        `<p style="margin:0 0 14px 0;">${escapeHtml(para).replace(/\r?\n/g, '<br/>')}</p>`
    )
    .join('');
}

/**
 * @param {{subject: string, body: string}} template
 * @param {{name: string, email: string}} vars
 * @returns {{subject: string, text: string, html: string}}
 */
function renderTemplate(template, vars) {
  const name = String(vars.name || '').trim();
  const email = String(vars.email || '').trim();
  const display = name.charAt(0).toUpperCase() + name.slice(1);
  const ctx = { name, email, Name: display, NAME: name.toUpperCase() };

  const subject = interpolate(template.subject, ctx).replace(/\s+/g, ' ').trim();
  const text = interpolate(template.body, ctx).trim();
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;` +
    `line-height:1.6;color:#1f2937;">${textToHtml(text)}</div>`;

  return { subject, text, html };
}

/** Sample variables for template previews in the UI. */
const SAMPLE_VARS = { name: 'John', email: 'john@example.com' };

module.exports = { renderTemplate, interpolate, textToHtml, SAMPLE_VARS };
