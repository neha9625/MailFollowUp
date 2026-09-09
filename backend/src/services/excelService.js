/**
 * Excel service — parsing, validation and atomic replacement of the active list.
 * Parsing: ExcelJS (.xlsx) + SheetJS (.xls legacy). Storage: MySQL transactions.
 */
const path = require('path');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const { pool } = require('../config/database');
const ApiError = require('../utils/apiError');
const { isValidEmail, normalizeEmail, normalizeName } = require('../utils/emailValidator');

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
const REQUIRED_HEADERS = ['email', 'name'];
const INVALID_FORMAT_MESSAGE =
  'This file format is not valid. Upload an Excel file with exactly two columns: Email in the first column and Name in the second column.';

function cellToString(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    if (value.text !== undefined) return String(value.text);
    if (value.result !== undefined) return String(value.result);
    if (Array.isArray(value.richText)) return value.richText.map((rt) => rt.text).join('');
    if (value.hyperlink) return String(value.text || value.hyperlink);
    return '';
  }
  return String(value).trim();
}

/** Reads any supported workbook into a raw matrix of strings. */
async function readWorkbookMatrix(buffer, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new ApiError(400, 'Only .xlsx and .xls files are allowed.', 'INVALID_FILE_TYPE');
  }

  if (ext === '.xlsx') {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch (err) {
      throw new ApiError(400, 'The .xlsx file could not be read. It may be corrupted.', 'EXCEL_PARSE_ERROR');
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new ApiError(400, 'The Excel file contains no worksheets.', 'EXCEL_EMPTY');
    const matrix = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      matrix.push(values.map(cellToString));
    });
    return matrix;
  }

  // .xls via SheetJS
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    throw new ApiError(400, 'The .xls file could not be read. It may be corrupted.', 'EXCEL_PARSE_ERROR');
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ApiError(400, 'The Excel file contains no worksheets.', 'EXCEL_EMPTY');
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
}

/**
 * Validates the raw matrix against business rules.
 * @returns {{records: Array<{email,name}>, invalidRows: Array, duplicates: number,
 *            totalDataRows: number, validRecords: number, invalidRecords: number}}
 */
function parseRows(matrix) {
  if (!matrix || matrix.length === 0) {
    throw new ApiError(400, 'The uploaded Excel file is empty.', 'EXCEL_EMPTY');
  }

  const nonEmptyColumnIndexes = new Set();
  matrix.forEach((row) => {
    (row || []).forEach((cell, index) => {
      if (cellToString(cell)) nonEmptyColumnIndexes.add(index);
    });
  });
  const header = (matrix[0] || []).map((h) => cellToString(h).toLowerCase());

  if (
    nonEmptyColumnIndexes.size !== 2 ||
    !nonEmptyColumnIndexes.has(0) ||
    !nonEmptyColumnIndexes.has(1) ||
    header[0] !== REQUIRED_HEADERS[0] ||
    header[1] !== REQUIRED_HEADERS[1]
  ) {
    throw new ApiError(400, INVALID_FORMAT_MESSAGE, 'INVALID_EXCEL_FORMAT');
  }

  const records = [];
  const invalidRows = [];
  const seen = new Set();
  let duplicates = 0;

  for (let r = 1; r < matrix.length; r += 1) {
    const row = matrix[r];
    if (!row || row.every((c) => String(c || '').trim() === '')) continue; // skip blank rows
    const rowNumber = r + 1;
    const rawEmail = cellToString(row[0]);
    const rawName = cellToString(row[1]);
    const email = normalizeEmail(rawEmail);
    const name = normalizeName(rawName);

    const errors = [];
    if (!rawEmail) errors.push('Email is empty');
    else if (!isValidEmail(email)) errors.push(`Invalid email address "${rawEmail}"`);
    if (!name) errors.push('Name is empty');

    if (errors.length === 0) {
      if (seen.has(email)) {
        duplicates += 1;
        invalidRows.push({ rowNumber, email, name, reason: 'Duplicate email within the file (kept first occurrence only)' });
        continue;
      }
      seen.add(email);
      records.push({ email, name });
    } else {
      invalidRows.push({ rowNumber, email: rawEmail, name, reason: errors.join('; ') });
    }
  }

  if (records.length === 0) {
    throw new ApiError(
      400,
      'No valid records found. Every data row is missing, duplicated, or has an invalid email.',
      'NO_VALID_RECORDS',
      { invalidRows: invalidRows.slice(0, 100) }
    );
  }

  const maxRows = Number(process.env.MAX_EXCEL_ROWS || 10000);
  if (records.length > maxRows) {
    throw new ApiError(
      400,
      `The file contains ${records.length} valid rows. Maximum allowed is ${maxRows}.`,
      'TOO_MANY_ROWS'
    );
  }

  return {
    records,
    invalidRows,
    duplicates,
    totalDataRows: records.length + invalidRows.length,
    validRecords: records.length,
    invalidRecords: invalidRows.length,
  };
}

/** Deactivates the previous file and inserts file + records atomically. */
async function replaceActiveFile(parsed, fileName) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [previous] = await conn.query(
      'SELECT id, file_name FROM uploaded_file WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );
    const previousFile = previous[0] || null;

    await conn.query('UPDATE uploaded_file SET is_active = 0 WHERE is_active = 1');

    const [fileResult] = await conn.query(
      `INSERT INTO uploaded_file (file_name, total_records, valid_records, invalid_records, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [fileName, parsed.totalDataRows, parsed.validRecords, parsed.invalidRecords]
    );
    const fileId = fileResult.insertId;

    const values = parsed.records.map((rec) => [fileId, rec.email, rec.name]);
    const CHUNK = 500;
    for (let i = 0; i < values.length; i += CHUNK) {
      await conn.query('INSERT INTO email_records (file_id, email, name) VALUES ?', [
        values.slice(i, i + CHUNK),
      ]);
    }

    await conn.commit();
    return { fileId, previousFile };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Full upload pipeline: parse → validate → transactional replace. */
async function processUpload(buffer, originalName) {
  const matrix = await readWorkbookMatrix(buffer, originalName);
  const parsed = parseRows(matrix);
  const { fileId, previousFile } = await replaceActiveFile(parsed, originalName);

  console.log(
    `[excel] uploaded "${originalName}" → file #${fileId} | valid: ${parsed.validRecords}, ` +
      `invalid: ${parsed.invalidRecords}, duplicates: ${parsed.duplicates}`
  );

  return {
    file: {
      id: fileId,
      file_name: originalName,
      total_records: parsed.totalDataRows,
      valid_records: parsed.validRecords,
      invalid_records: parsed.invalidRecords,
      is_active: 1,
    },
    summary: {
      totalRecords: parsed.totalDataRows,
      validRecords: parsed.validRecords,
      invalidRecords: parsed.invalidRecords,
      duplicates: parsed.duplicates,
      invalidRows: parsed.invalidRows.slice(0, 200),
      previousFile: previousFile ? { id: previousFile.id, file_name: previousFile.file_name } : null,
    },
  };
}

async function getActiveFile() {
  const [rows] = await pool.query(
    'SELECT * FROM uploaded_file WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
  );
  return rows[0] || null;
}

async function getActiveRecordCount(fileId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM email_records WHERE file_id = ?',
    [fileId]
  );
  return rows[0].count;
}

async function getActiveRecords() {
  const [rows] = await pool.query(
    `SELECT er.id, er.email, er.name
     FROM email_records er
     INNER JOIN uploaded_file uf ON uf.id = er.file_id
     WHERE uf.is_active = 1
     ORDER BY er.id ASC`
  );
  return rows;
}

async function getUploadHistory(limit = 50) {
  const [rows] = await pool.query(
    'SELECT * FROM uploaded_file ORDER BY is_active DESC, uploaded_at DESC, id DESC LIMIT ?',
    [Number(limit)]
  );
  return rows;
}

module.exports = {
  processUpload,
  parseRows,
  readWorkbookMatrix,
  getActiveFile,
  getActiveRecordCount,
  getActiveRecords,
  getUploadHistory,
  ALLOWED_EXTENSIONS,
};
