#!/usr/bin/env node
/** Applies sql/schema.sql (idempotent). Usage: npm run db:migrate */
require('dotenv').config();
const path = require('path');
const { runSqlFile } = require('../config/database');

(async () => {
  try {
    await runSqlFile(path.join(__dirname, '..', '..', 'sql', 'schema.sql'));
    console.log('✔ schema applied');
    process.exit(0);
  } catch (err) {
    console.error('✖ migration failed:', err.message);
    process.exit(1);
  }
})();
