const Papa = require('papaparse');

/**
 * Date patterns we recognize, in order of specificity.
 */
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                    // 2024-01-15
  /^\d{4}\/\d{2}\/\d{2}$/,                  // 2024/01/15
  /^\d{2}\/\d{2}\/\d{4}$/,                  // 01/15/2024
  /^\d{2}-\d{2}-\d{4}$/,                    // 01-15-2024
  /^[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}$/,     // Jan 15 2024
  /^[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}$/,     // January 15, 2024
];

/**
 * Try to parse a value as a number.
 * Strips currency symbols, commas, and whitespace.
 * Returns the number or null if not a valid number.
 */
function tryParseNumber(value) {
  if (value === null || value === undefined) return null;
  const str = value.toString().trim();
  if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'tbd') return null;
  const cleaned = str.replace(/[$€£¥,\s]/g, '');
  if (cleaned === '') return null;
  if (cleaned === '') return null;
  const num = Number(cleaned);
  if (isNaN(num) || !isFinite(num)) return null;
  return num;
}

/**
 * Try to parse a value as a date and format as YYYY-MM-DD without timezone shifts.
 * Returns an ISO date string (YYYY-MM-DD) or null.
 */
function tryParseDate(value) {
  if (value === null || value === undefined) return null;
  const str = value.toString().trim();
  if (str === '' || str.toLowerCase() === 'null') return null;

  // Direct regex extraction to prevent timezone bugs
  // Format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime()) && date.getFullYear() === Number(y) && date.getMonth() === Number(m) - 1) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Format: MM/DD/YYYY or MM-DD-YYYY
  const mdyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime()) && date.getFullYear() === Number(y) && date.getMonth() === Number(m) - 1) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Format: Jan 15 2024 or January 15, 2024
  if (str.length > 5) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Guess the type of a column based on its values.
 * Strategy: sample up to 100 non-empty values.
 *   - If ≥80% parse as numbers → 'number'
 *   - If ≥70% parse as dates → 'date'
 *   - If unique values ≤ 20 and (sampleSize ≤ 10 or unique ≤ 70% of sample) → 'category'
 *   - Otherwise → 'text'
 */
function guessColumnType(values) {
  const nonEmpty = values.filter(v =>
    v !== null && v !== undefined && v.toString().trim() !== '' && v.toString().trim().toLowerCase() !== 'null'
  );

  if (nonEmpty.length === 0) return 'text';

  const sample = nonEmpty.slice(0, 100);
  const sampleSize = sample.length;

  // Try number
  const numberHits = sample.filter(v => tryParseNumber(v) !== null).length;
  if (numberHits / sampleSize >= 0.8) return 'number';

  // Try date
  const dateHits = sample.filter(v => tryParseDate(v) !== null).length;
  if (dateHits / sampleSize >= 0.7) return 'date';

  // Try category
  const uniqueValues = new Set(sample.map(v => v.toString().trim().toLowerCase()));
  const avgLen = sample.reduce((acc, v) => acc + v.toString().length, 0) / sampleSize;
  const hasRepetition = uniqueValues.size < sampleSize;
  if (uniqueValues.size <= 20 && avgLen < 35 && hasRepetition && uniqueValues.size <= sampleSize * 0.75) {
    return 'category';
  }

  return 'text';
}

/**
 * Parse a CSV string and return structured data with column metadata.
 *
 * Returns: {
 *   columns: [{ name, type, missingCount, sampleValues, uniqueValues }],
 *   rows: [ { col1: val1, ... }, ... ],
 *   errorRows: [ { row: number, data: {...}, reason: string } ],
 *   totalRowsRead: number,
 *   validRowCount: number
 * }
 */
function parseCSV(fileContent, filename) {
  // Validate content is not empty
  if (!fileContent || fileContent.trim().length === 0) {
    throw new Error('The file is empty.');
  }

  // Try to detect if it's really a CSV by checking the first line
  const firstLine = fileContent.split('\n')[0];
  if (!firstLine || firstLine.trim().length === 0) {
    throw new Error('The file has no header row.');
  }

  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: false, // We want to track empty lines
    transformHeader: h => h.trim(),
    dynamicTyping: false,  // We handle type conversion ourselves for traceability
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`Could not parse CSV: ${result.errors[0].message}`);
  }

  const headers = result.meta.fields || [];
  if (headers.length === 0) {
    throw new Error('No columns found in the CSV file.');
  }

  // Process rows: separate valid from error rows
  const validRows = [];
  const errorRows = [];

  result.data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is header, data is 0-indexed

    // Check if the entire row is empty
    const allEmpty = headers.every(h => {
      const val = row[h];
      return val === null || val === undefined || val.toString().trim() === '';
    });

    if (allEmpty) {
      errorRows.push({
        row: rowNum,
        data: row,
        reason: 'Entirely empty row',
      });
      return;
    }

    // Collect per-row parse warnings
    const warnings = [];

    // Check for PapaParse errors on this row
    const rowErrors = result.errors.filter(e => e.row === index);
    if (rowErrors.length > 0) {
      rowErrors.forEach(e => warnings.push(e.message));
    }

    if (warnings.length > 0) {
      errorRows.push({
        row: rowNum,
        data: row,
        reason: warnings.join('; '),
      });
    }

    // Still include the row in validRows even if it has warnings,
    // unless it was entirely empty (handled above)
    validRows.push(row);
  });

  // Build column metadata
  const columns = headers.map(name => {
    const values = validRows.map(r => r[name]);
    const missingCount = values.filter(v =>
      v === null || v === undefined || v.toString().trim() === '' || v.toString().trim().toLowerCase() === 'null'
    ).length;

    const type = guessColumnType(values);

    // Get sample values (up to 5 unique non-empty)
    const nonEmpty = values.filter(v => v !== null && v !== undefined && v.toString().trim() !== '');
    const unique = [...new Set(nonEmpty.map(v => v.toString().trim()))];
    const sampleValues = unique.slice(0, 5);

    return {
      name,
      type,
      missingCount,
      sampleValues,
      uniqueCount: unique.length,
    };
  });

  return {
    columns,
    rows: validRows,
    errorRows,
    totalRowsRead: result.data.length,
    validRowCount: validRows.length,
  };
}

module.exports = { parseCSV, guessColumnType, tryParseNumber, tryParseDate };
