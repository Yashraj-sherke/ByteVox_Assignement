// Vitest globals enabled (describe, it, expect)
const {
  applyFilters,
  aggregate,
  computeMetric,
  computeChart,
  computeTable,
  computeReport,
} = require('../services/aggregation');

describe('Aggregation Service & Show Your Work Provenance', () => {
  const sampleRows = [
    { order_id: '1', date: '2024-01-10', category: 'Electronics', total: '100.50', qty: '2' },
    { order_id: '2', date: '2024-01-15', category: 'Electronics', total: '50.00', qty: '1' },
    { order_id: '3', date: '2024-01-20', category: 'Clothing', total: '75.25', qty: '3' },
    { order_id: '4', date: '2024-02-05', category: 'Clothing', total: 'invalid_num', qty: '1' },
    { order_id: '5', date: '2024-02-12', category: 'Electronics', total: '200.00', qty: '4' },
    { order_id: '6', date: 'bad_date', category: 'Food', total: '25.00', qty: '5' },
    { order_id: '7', date: '2024-03-01', category: null, total: '10.00', qty: '1' },
  ];

  describe('Basic aggregate() math', () => {
    const nums = [10, 20, 30, 40];

    it('calculates sum correctly', () => {
      expect(aggregate(nums, 'sum')).toBe(100);
    });

    it('calculates average correctly', () => {
      expect(aggregate(nums, 'average')).toBe(25);
    });

    it('calculates count correctly', () => {
      expect(aggregate(nums, 'count')).toBe(4);
    });

    it('calculates min and max correctly', () => {
      expect(aggregate(nums, 'min')).toBe(10);
      expect(aggregate(nums, 'max')).toBe(40);
    });

    it('handles empty lists gracefully', () => {
      expect(aggregate([], 'sum')).toBeNull();
    });
  });

  describe('Report-level Filtering', () => {
    it('filters by category accurately and tracks reasons', () => {
      const filters = {
        category: { column: 'category', values: ['Electronics'] }
      };
      const { included, exclusionReasons } = applyFilters(sampleRows, filters);

      expect(included.length).toBe(3);
      expect(included.every(r => r.category === 'Electronics')).toBe(true);
      expect(exclusionReasons.length).toBeGreaterThan(0);
    });

    it('filters by dateRange and rejects bad dates or out-of-range dates', () => {
      const filters = {
        dateRange: {
          column: 'date',
          start: '2024-01-01',
          end: '2024-01-31'
        }
      };
      const { included, exclusionReasons } = applyFilters(sampleRows, filters);

      // Rows 1, 2, 3 are in Jan 2024.
      // Row 4 & 5 are Feb. Row 6 has bad_date. Row 7 is March.
      expect(included.length).toBe(3);
      expect(included.map(r => r.order_id)).toEqual(['1', '2', '3']);

      // Bad date in row 6 must be recorded in exclusionReasons
      const badDateReason = exclusionReasons.find(r => r.reason.includes('Invalid date'));
      expect(badDateReason).toBeDefined();
    });
  });

  describe('computeMetric with Show-Your-Work', () => {
    it('computes sum of total with non-numeric exclusion tracking', () => {
      const config = { column: 'total', aggregation: 'sum' };
      const res = computeMetric(sampleRows, config, {});

      // Valid totals: 100.5 + 50 + 75.25 + 200 + 25 + 10 = 460.75
      // Row 4 has 'invalid_num' and must be excluded with reason
      expect(res.value).toBe(460.75);
      expect(res.showWork.rowsIncluded).toBe(6);
      expect(res.showWork.rowsExcluded).toBe(1);
      expect(res.showWork.exclusionReasons.some(r => r.reason.includes('non-numeric'))).toBe(true);
      expect(res.showWork.operation).toBe('SUM(total)');
    });

    it('computes metric grouped by category', () => {
      const config = { column: 'total', aggregation: 'sum', groupBy: 'category' };
      const res = computeMetric(sampleRows, config, {});

      expect(res.groups).toBeDefined();
      const elecGroup = res.groups.find(g => g.group === 'Electronics');
      // 100.5 + 50 + 200 = 350.5
      expect(elecGroup.value).toBe(350.5);
    });
  });

  describe('computeChart and computeTable', () => {
    it('computes chart bar data with correct aggregation', () => {
      const config = {
        chartType: 'bar',
        xColumn: 'category',
        yColumn: 'total',
        aggregation: 'sum'
      };
      const res = computeChart(sampleRows, config, {});

      expect(res.chartType).toBe('bar');
      expect(Array.isArray(res.chartData)).toBe(true);
      const electronics = res.chartData.find(d => d.label === 'Electronics');
      expect(electronics.value).toBe(350.5);
      expect(res.showWork.operation).toContain('SUM(total) GROUP BY category');
    });

    it('computes sorted top rows table with limit', () => {
      const config = {
        sortColumn: 'total',
        sortDirection: 'desc',
        limit: 2
      };
      const res = computeTable(sampleRows, config, {});

      expect(res.rows.length).toBe(2);
      expect(res.rows[0].order_id).toBe('5'); // 200.00
      expect(res.rows[1].order_id).toBe('1'); // 100.50
      expect(res.showWork.rowsIncluded).toBe(2);
      expect(res.showWork.rowsExcluded).toBe(sampleRows.length - 2);
    });
  });
});

describe('Messy input regression cases', () => {
  it('groups prototype-like category names without losing rows', () => {
    const result = computeMetric([{kind:'__proto__', total:'5'}, {kind:'constructor',total:'7'}], {column:'total',aggregation:'sum',groupBy:'kind'}, {});
    expect(result.groups).toEqual(expect.arrayContaining([{group:'__proto__',value:5},{group:'constructor',value:7}]));
    expect(result.showWork.rowsIncluded).toBe(2);
  });
  it('counts every filtered row in charts even when the numeric cell is blank', () => {
    const result = computeChart([{kind:'A',total:''},{kind:'A',total:'bad'}], {chartType:'bar',xColumn:'kind',yColumn:'total',aggregation:'count'}, {});
    expect(result.chartData).toEqual([{label:'A',value:2}]);
    expect(result.showWork.rowsExcluded).toBe(0);
    expect(result.showWork.operation).toContain('COUNT(*)');
  });
  it('orders line charts by the x axis rather than highest value', () => {
    const result = computeChart([{date:'2024-02-01',total:'100'},{date:'2024-01-01',total:'2'}], {chartType:'line',xColumn:'date',yColumn:'total',aggregation:'sum'}, {});
    expect(result.chartData.map(point => point.label)).toEqual(['2024-01-01','2024-02-01']);
  });
  it('keeps zero-valued category labels', () => {
    expect(computeMetric([{kind:0,total:'5'}],{column:'total',aggregation:'sum',groupBy:'kind'},{}).groups).toEqual([{group:'0',value:5}]);
  });
  it('accounts for every exclusion exactly once', () => {
    const result = computeMetric([{kind:'A',total:'bad'},{kind:'B',total:'2'},{kind:'A',total:'3'}],{column:'total',aggregation:'sum'},{category:{column:'kind',values:['A']}});
    expect(result.showWork.rowsIncluded + result.showWork.rowsExcluded).toBe(3);
    expect(result.showWork.exclusionReasons.reduce((n,r)=>n+r.count,0)).toBe(result.showWork.rowsExcluded);
  });
});
