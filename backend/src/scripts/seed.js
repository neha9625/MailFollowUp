#!/usr/bin/env node
/** Applies sql/seed.sql (INSERT IGNORE — never overwrites edits). Usage: npm run db:seed */
require('dotenv').config();
const path = require('path');
const { runSqlFile } = require('../config/database');

(async () => {
  try {
    await runSqlFile(path.join(__dirname, '..', '..', 'sql', 'seed.sql'));
    console.log('✔ default templates seeded');
    process.exit(0);
  } catch (err) {
    console.error('✖ seeding failed:', err.message);
    process.exit(1);
  }
})();
