#!/usr/bin/env node
/** Generates ../samples/sample_leads.xlsx (includes 1 invalid + 1 duplicate row). */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

(async () => {
  const rows = [
    ['Email', 'Name'],
    ['john@example.com', 'John'],
    ['sarah@example.com', 'Sarah'],
    ['michael@example.com', 'Michael'],
    ['priya@example.com', 'Priya'],
    ['ahmed@example.com', 'Ahmed'],
    ['emma@example.com', 'Emma'],
    ['not-an-email', 'Broken Row'],          // invalid email
    ['sarah@example.com', 'Sarah Duplicate'], // duplicate email
    ['', 'No Email'],                         // missing email
  ];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads');
  rows.forEach((r) => sheet.addRow(r));
  sheet.getColumn(1).width = 32;
  sheet.getColumn(2).width = 24;

  const outDir = path.join(__dirname, '..', '..', '..', 'samples');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'sample_leads.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log(`✔ sample Excel written to ${outPath}`);
})();
