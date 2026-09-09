/**
 * Template service — CRUD for weekday templates (FOLLOW_UP / NEW_EMAIL).
 * Unique business key: template_type + day_of_week.
 */
const { pool } = require('../config/database');
const ApiError = require('../utils/apiError');
const { TEMPLATE_TYPES, WEEKDAYS } = require('../utils/constants');

async function getAllGrouped() {
  const [rows] = await pool.query(
    `SELECT id, template_type, day_of_week, subject, body, is_active, created_at, updated_at
     FROM email_templates
     ORDER BY FIELD(template_type, 'FOLLOW_UP', 'NEW_EMAIL'),
              FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')`
  );
  const grouped = { FOLLOW_UP: [], NEW_EMAIL: [] };
  rows.forEach((row) => {
    if (grouped[row.template_type]) grouped[row.template_type].push(row);
  });
  return grouped;
}

async function getTemplate(type, day) {
  const [rows] = await pool.query(
    'SELECT * FROM email_templates WHERE template_type = ? AND day_of_week = ? LIMIT 1',
    [type, day]
  );
  return rows[0] || null;
}

async function getTemplateOr404(type, day) {
  const template = await getTemplate(type, day);
  if (!template) {
    throw new ApiError(
      404,
      `Template not found for type "${type}" and day "${day}".`,
      'TEMPLATE_NOT_FOUND'
    );
  }
  return template;
}

/** Loads both of today's templates; throws a clear error if either is missing. */
async function getTemplatesForDay(day) {
  const [rows] = await pool.query(
    "SELECT * FROM email_templates WHERE day_of_week = ? AND is_active = 1",
    [day]
  );
  const map = { FOLLOW_UP: null, NEW_EMAIL: null };
  rows.forEach((row) => {
    if (map[row.template_type] !== undefined) map[row.template_type] = row;
  });
  return map;
}

async function updateTemplate(type, day, { subject, body }) {
  const [result] = await pool.query(
    'UPDATE email_templates SET subject = ?, body = ? WHERE template_type = ? AND day_of_week = ?',
    [subject, body, type, day]
  );
  if (result.affectedRows === 0) {
    throw new ApiError(
      404,
      `Template not found for type "${type}" and day "${day}".`,
      'TEMPLATE_NOT_FOUND'
    );
  }
  return getTemplate(type, day);
}

/** Sanity helper used by boot-seeding diagnostics. */
async function countTemplates() {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM email_templates');
  return rows[0].count;
}

module.exports = {
  getAllGrouped,
  getTemplate,
  getTemplateOr404,
  getTemplatesForDay,
  updateTemplate,
  countTemplates,
  TEMPLATE_TYPES,
  WEEKDAYS,
};
