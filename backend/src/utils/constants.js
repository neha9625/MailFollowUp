const TEMPLATE_TYPES = ['FOLLOW_UP', 'NEW_EMAIL'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const LOG_STATUSES = ['SUCCESS', 'FAILED', 'SKIPPED'];

const WEEKEND_DAYS = ['Saturday', 'Sunday'];

/** Template variables supported by the renderer. */
const TEMPLATE_VARIABLES = ['name', 'email'];

module.exports = { TEMPLATE_TYPES, WEEKDAYS, LOG_STATUSES, WEEKEND_DAYS, TEMPLATE_VARIABLES };
