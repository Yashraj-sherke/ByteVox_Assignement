// Vitest globals enabled (describe, it, expect)
const { parseCSV, guessColumnType, tryParseNumber, tryParseDate } = require('../services/csvParser');

describe('CSV Parser & Bad File Handling', () => {
  it('throws an error on completely empty file input', () => {
    expect(() => parseCSV('', 'empty.csv')).toThrow(/empty/i);
    expect(() => parseCSV('   \n  \n  ', 'whitespace.csv')).toThrow(/empty/i);
  });

  it('correctly tracks completely blank rows in errorRows rather than silently dropping', () => {
    const csvContent = `id,name,amount\n1,Alice,100\n,,,\n2,Bob,200\n,,,,`;
    const result = parseCSV(csvContent, 'test.csv');

    expect(result.validRowCount).toBe(2);
    expect(result.errorRows.length).toBe(2);
    expect(result.errorRows[0].reason).toContain('Entirely empty row');
  });

  it('profiles columns and detects missing values without dropping rows with nulls', () => {
    const csvContent = `id,date,category,price\n1,2024-01-01,Tech,99.99\n2,,Tech,\n3,2024-01-03,,149.50`;
    const result = parseCSV(csvContent, 'sample.csv');

    expect(result.validRowCount).toBe(3);
    const dateCol = result.columns.find(c => c.name === 'date');
    const priceCol = result.columns.find(c => c.name === 'price');
    const categoryCol = result.columns.find(c => c.name === 'category');

    expect(dateCol.missingCount).toBe(1);
    expect(priceCol.missingCount).toBe(1);
    expect(categoryCol.missingCount).toBe(1);
  });

  it('accurately guesses types: number, date, category, text', () => {
    expect(guessColumnType(['10', '25.5', '$100.00', '42', 'N/A'])).toBe('number');
    expect(guessColumnType(['2024-01-01', '01/15/2024', 'Jan 22 2024', '2024/02/01', 'bad_date'])).toBe('date');
    expect(guessColumnType(['North', 'South', 'North', 'East', 'South', 'West', 'North'])).toBe('category');
    expect(guessColumnType(['Express delivery needed', 'Customer requested blue', 'Special gift wrap'])).toBe('text');
  });

  it('tryParseNumber handles currency, commas, and invalid tokens', () => {
    expect(tryParseNumber('$1,249.99')).toBe(1249.99);
    expect(tryParseNumber('-45.00')).toBe(-45);
    expect(tryParseNumber('TBD')).toBeNull();
    expect(tryParseNumber('N/A')).toBeNull();
    expect(tryParseNumber('')).toBeNull();
  });

  it('tryParseDate standardizes varied date representations', () => {
    expect(tryParseDate('2024-01-15')).toBe('2024-01-15');
    expect(tryParseDate('01/15/2024')).toBe('2024-01-15');
    expect(tryParseDate('invalid-date-string')).toBeNull();
  });
});
