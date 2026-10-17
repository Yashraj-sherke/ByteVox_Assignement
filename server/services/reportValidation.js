// Validate report definitions before they enter storage or computation.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const operations = ['sum', 'average', 'count', 'min', 'max'];
function validateReport({ title, blocks, filters }, columns) {
  const names = new Set(columns.map(column => column.name));
  const validColumn = name => typeof name === 'string' && names.has(name);
  if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.length > 200)) return 'Title must contain 1 to 200 characters.';
  if (blocks !== undefined) {
    if (!Array.isArray(blocks) || blocks.length > 50) return 'A report can contain up to 50 blocks.';
    const ids = new Set();
    for (const block of blocks) {
      if (!object(block) || !['string','number'].includes(typeof block.id) || ids.has(block.id) || !object(block.config)) return 'Each block needs a unique ID and a configuration.';
      ids.add(block.id);
      if (block.title !== undefined && (typeof block.title !== 'string' || block.title.length > 200)) return 'Block titles must be at most 200 characters.';
      const c = block.config;
      if (block.type === 'metric' || block.type === 'chart') {
        if (!operations.includes(c.aggregation)) return 'Unknown aggregation operation.';
        if (block.type === 'metric' && c.aggregation !== 'count' && !validColumn(c.column)) return 'Choose a valid metric column.';
        if (block.type === 'metric' && c.groupBy && !validColumn(c.groupBy)) return 'Choose a valid grouping column.';
        if (block.type === 'chart' && (!['bar','line'].includes(c.chartType) || !validColumn(c.xColumn) || (c.aggregation !== 'count' && !validColumn(c.yColumn)))) return 'Choose valid chart columns and a bar or line chart.';
      } else if (block.type === 'table') {
        if (!validColumn(c.sortColumn) || !['asc','desc'].includes(c.sortDirection || 'desc') || !Number.isInteger(c.limit ?? 10) || (c.limit ?? 10) < 1 || (c.limit ?? 10) > 100) return 'Tables need a valid sort column and a row limit from 1 to 100.';
      } else if (block.type === 'text') {
        if (typeof c.content !== 'string' || c.content.length > 10000) return 'Notes must be text up to 10,000 characters.';
      } else return 'Unknown block type.';
    }
  }
  if (filters !== undefined) {
    if (!object(filters)) return 'Filters must be an object.';
    if (filters.dateRange) {
      const d = filters.dateRange;
      if (!object(d) || !validColumn(d.column)) return 'Choose a valid date filter column.';
      for (const value of [d.start,d.end]) if (value && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))) return 'Filter dates must use YYYY-MM-DD.';
      if (d.start && d.end && d.start > d.end) return 'Start date must be before the end date.';
    }
    if (filters.category) {
      const c = filters.category;
      if (!object(c) || !validColumn(c.column) || !Array.isArray(c.values) || c.values.length > 1000 || c.values.some(value => typeof value !== 'string')) return 'Choose a valid category column and text values.';
    }
  }
  return null;
}
module.exports = { validateReport };
