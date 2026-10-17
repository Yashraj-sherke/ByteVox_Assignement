const { tryParseNumber, tryParseDate } = require('./csvParser');

/**
 * Apply report-level filters to rows.
 * Tracks which rows are excluded and why.
 *
 * @param {Array} rows - The dataset rows
 * @param {Object} filters - { dateRange?: { column, start, end }, category?: { column, values } }
 * @returns {{ included: Array, exclusionReasons: Array<{ reason: string, count: number }> }}
 */
function applyFilters(rows, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return { included: rows, exclusionReasons: [] };
  }

  const reasonCounts = Object.create(null);
  const included = [];

  for (const row of rows) {
    let excluded = false;
    let reason = null;

    // Date range filter
    if (!excluded && filters.dateRange && filters.dateRange.column) {
      const { column, start, end } = filters.dateRange;
      const rawVal = row[column];
      const dateVal = tryParseDate(rawVal);

      if (!dateVal && (rawVal === null || rawVal === undefined || rawVal.toString().trim() === '' || rawVal.toString().trim().toLowerCase() === 'null')) {
        excluded = true;
        reason = `Missing date value in '${column}'`;
      } else if (!dateVal) {
        excluded = true;
        reason = `Invalid date value in '${column}' ("${rawVal}")`;
      } else {
        if (start && dateVal < start) {
          excluded = true;
          reason = `Date in '${column}' is before ${start}`;
        }
        if (!excluded && end && dateVal > end) {
          excluded = true;
          reason = `Date in '${column}' is after ${end}`;
        }
      }
    }

    // Category filter
    if (!excluded && filters.category && filters.category.column && filters.category.values && filters.category.values.length > 0) {
      const { column, values } = filters.category;
      const cellVal = (row[column] ?? '').toString().trim();
      if (!values.includes(cellVal)) {
        excluded = true;
        reason = `'${column}' value "${cellVal}" not in selected filter [${values.join(', ')}]`;
      }
    }

    if (excluded) {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    } else {
      included.push(row);
    }
  }

  const exclusionReasons = Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count }));
  return { included, exclusionReasons };
}

/**
 * Aggregate an array of numbers with the given operation.
 */
function aggregate(values, operation) {
  if (values.length === 0) return null;

  switch (operation) {
    case 'sum':
      return round(values.reduce((a, b) => a + b, 0));
    case 'average':
      return round(values.reduce((a, b) => a + b, 0) / values.length);
    case 'count':
      return values.length;
    case 'min':
      return round(values.reduce((a, b) => Math.min(a, b)));
    case 'max':
      return round(values.reduce((a, b) => Math.max(a, b)));
    default:
      throw new Error(`Unknown aggregation: ${operation}`);
  }
}

/** Round to 2 decimal places to avoid floating point noise */
function round(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Build a human-readable filter description for the show-work panel.
 */
function describeFilters(filters) {
  const parts = [];
  if (filters.dateRange && filters.dateRange.column) {
    const { column, start, end } = filters.dateRange;
    if (start && end) parts.push(`${column} between ${start} and ${end}`);
    else if (start) parts.push(`${column} on or after ${start}`);
    else if (end) parts.push(`${column} on or before ${end}`);
  }
  if (filters.category && filters.category.column && filters.category.values && filters.category.values.length > 0) {
    parts.push(`${filters.category.column} in [${filters.category.values.join(', ')}]`);
  }
  return parts.length > 0 ? parts.join(' AND ') : null;
}

/**
 * Build a SQL-like operation string for the show-work panel.
 */
function buildOperationString(aggName, column, groupBy, filters) {
  let op = `${aggName}(${column})`;
  if (groupBy) op += ` GROUP BY ${groupBy}`;
  const filterDesc = describeFilters(filters);
  if (filterDesc) op += ` WHERE ${filterDesc}`;
  return op;
}

/**
 * Compute a metric block.
 *
 * @param {Array} allRows - Full dataset rows
 * @param {Object} config - { column, aggregation, groupBy? }
 * @param {Object} filters - Report-level filters
 * @returns {{ value, groups?, showWork }}
 */
function computeMetric(allRows, config, filters) {
  const { column, aggregation, groupBy } = config;

  // Step 1: Apply report-level filters
  const { included: filteredRows, exclusionReasons: filterReasons } = applyFilters(allRows, filters);

  // Step 2: Extract valid values for the target column
  const validRows = [];
  let invalidCount = 0;

  if (aggregation === 'count') {
    // For count, we count all filtered rows (or group them)
    for (const row of filteredRows) {
      validRows.push(row);
    }
  } else {
    for (const row of filteredRows) {
      const num = tryParseNumber(row[column]);
      if (num !== null) {
        validRows.push({ ...row, __numVal: num });
      } else {
        invalidCount++;
      }
    }
  }

  // Step 3: Compute
  let value = null;
  let groups = null;

  if (groupBy) {
    const grouped = Object.create(null);
    for (const row of validRows) {
      const key = (row[groupBy] ?? '(empty)').toString().trim() || '(empty)';
      if (!grouped[key]) grouped[key] = [];
      if (aggregation === 'count') {
        grouped[key].push(1);
      } else {
        grouped[key].push(row.__numVal);
      }
    }

    groups = Object.entries(grouped)
      .map(([group, values]) => ({
        group,
        value: aggregate(values, aggregation),
      }))
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  } else {
    if (aggregation === 'count') {
      value = validRows.length;
    } else {
      const nums = validRows.map(r => r.__numVal);
      value = aggregate(nums, aggregation);
    }
  }

  // Step 4: Build show-your-work
  const allExclusionReasons = [...filterReasons];
  if (invalidCount > 0) {
    allExclusionReasons.push({
      reason: `Missing or non-numeric value in '${column}'`,
      count: invalidCount,
    });
  }

  const aggLabel = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
  let description = `${aggLabel} of the '${column}' column`;
  if (aggregation === 'count') description = `Count of rows`;
  if (groupBy) description += `, grouped by '${groupBy}'`;
  const filterDesc = describeFilters(filters);
  if (filterDesc) description += `, filtered where ${filterDesc}`;
  description += '.';

  const operation = buildOperationString(
    aggregation.toUpperCase(),
    aggregation === 'count' ? '*' : column,
    groupBy,
    filters
  );

  return {
    value,
    groups,
    showWork: {
      description,
      operation,
      totalRows: allRows.length,
      rowsIncluded: validRows.length,
      rowsExcluded: allRows.length - validRows.length,
      exclusionReasons: allExclusionReasons,
    },
  };
}

/**
 * Compute a chart block.
 *
 * @param {Array} allRows - Full dataset rows
 * @param {Object} config - { chartType, xColumn, yColumn, aggregation }
 * @param {Object} filters - Report-level filters
 * @returns {{ chartData, showWork }}
 */
function computeChart(allRows, config, filters) {
  const { chartType, xColumn, yColumn, aggregation } = config;

  // Apply filters
  const { included: filteredRows, exclusionReasons: filterReasons } = applyFilters(allRows, filters);

  // Group by xColumn and aggregate yColumn
  const grouped = Object.create(null);
  let invalidCount = 0;

  for (const row of filteredRows) {
    const label = (row[xColumn] ?? '(empty)').toString().trim() || '(empty)';
    const num = aggregation === 'count' ? 1 : tryParseNumber(row[yColumn]);

    if (num !== null) {
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(num);
    } else {
      invalidCount++;
    }
  }

  const chartData = Object.entries(grouped)
    .map(([label, values]) => ({
      label,
      value: aggregate(values, aggregation),
    }))
    .sort((a, b) => chartType === 'line'
      ? a.label.localeCompare(b.label, undefined, { numeric: true })
      : (b.value || 0) - (a.value || 0));

  // Show work
  const allExclusionReasons = [...filterReasons];
  if (invalidCount > 0) {
    allExclusionReasons.push({
      reason: `Missing or non-numeric value in '${yColumn}'`,
      count: invalidCount,
    });
  }

  const aggLabel = aggregation.toUpperCase();
  let description = `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart showing ${aggLabel}(${yColumn}) grouped by '${xColumn}'`;
  const filterDesc = describeFilters(filters);
  if (filterDesc) description += `, filtered where ${filterDesc}`;
  description += '.';

  const validCount = filteredRows.length - invalidCount;

  return {
    chartData,
    chartType,
    showWork: {
      description,
      operation: buildOperationString(aggLabel, aggregation === 'count' ? '*' : yColumn, xColumn, filters),
      totalRows: allRows.length,
      rowsIncluded: validCount,
      rowsExcluded: allRows.length - validCount,
      exclusionReasons: allExclusionReasons,
    },
  };
}

/**
 * Compute a table block (top N rows sorted by a column).
 *
 * @param {Array} allRows - Full dataset rows
 * @param {Object} config - { sortColumn, sortDirection, limit, columns? }
 * @param {Object} filters - Report-level filters
 * @returns {{ rows, columns, showWork }}
 */
function computeTable(allRows, config, filters) {
  const { sortColumn, sortDirection = 'desc', limit = 10 } = config;

  // Apply filters
  const { included: filteredRows, exclusionReasons: filterReasons } = applyFilters(allRows, filters);

  // Sort rows
  const sortable = [];
  let invalidCount = 0;

  for (const row of filteredRows) {
    const num = tryParseNumber(row[sortColumn]);
    if (num !== null) {
      sortable.push({ ...row, __sortVal: num });
    } else {
      invalidCount++;
    }
  }

  sortable.sort((a, b) =>
    sortDirection === 'desc' ? b.__sortVal - a.__sortVal : a.__sortVal - b.__sortVal
  );

  const topRows = sortable.slice(0, limit).map(r => {
    const { __sortVal, ...clean } = r;
    return clean;
  });

  // Get column names from the first row
  const columns = allRows.length > 0 ? Object.keys(allRows[0]) : [];

  // Show work
  const allExclusionReasons = [...filterReasons];
  if (invalidCount > 0) {
    allExclusionReasons.push({
      reason: `Missing or non-numeric value in sort column '${sortColumn}'`,
      count: invalidCount,
    });
  }
  const notInTop = Math.max(0, sortable.length - limit);
  if (notInTop > 0) {
    allExclusionReasons.push({
      reason: `Not in top ${limit} by '${sortColumn}'`,
      count: notInTop,
    });
  }

  const dirLabel = sortDirection === 'desc' ? 'descending' : 'ascending';
  let description = `Top ${limit} rows sorted by '${sortColumn}' in ${dirLabel} order`;
  const filterDesc = describeFilters(filters);
  if (filterDesc) description += `, filtered where ${filterDesc}`;
  description += '.';

  let operation = `SELECT * ORDER BY ${sortColumn} ${sortDirection.toUpperCase()} LIMIT ${limit}`;
  if (filterDesc) operation += ` WHERE ${filterDesc}`;

  return {
    rows: topRows,
    columns,
    showWork: {
      description,
      operation,
      totalRows: allRows.length,
      rowsIncluded: topRows.length,
      rowsExcluded: allRows.length - topRows.length,
      exclusionReasons: allExclusionReasons,
    },
  };
}

/**
 * Compute all blocks in a report.
 *
 * @param {Array} allRows - Full dataset rows
 * @param {Array} blocks - Array of block definitions
 * @param {Object} filters - Report-level filters
 * @returns {Array} Array of computed block results
 */
function computeReport(allRows, blocks, filters) {
  return blocks.map(block => {
    try {
      switch (block.type) {
        case 'metric':
          return { ...block, result: computeMetric(allRows, block.config, filters) };
        case 'chart':
          return { ...block, result: computeChart(allRows, block.config, filters) };
        case 'table':
          return { ...block, result: computeTable(allRows, block.config, filters) };
        case 'text':
          return { ...block, result: { content: block.config.content } };
        default:
          return { ...block, result: { error: `Unknown block type: ${block.type}` } };
      }
    } catch (err) {
      return { ...block, result: { error: err.message } };
    }
  });
}

module.exports = {
  applyFilters,
  aggregate,
  computeMetric,
  computeChart,
  computeTable,
  computeReport,
};
