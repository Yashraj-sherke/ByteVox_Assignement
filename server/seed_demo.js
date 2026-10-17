const fs = require('fs');
const path = require('path');
const db = require('./db');
const { parseCSV } = require('./services/csvParser');

const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@bytevox.ai');
if (!demoUser) {
  console.log('Demo user not found.');
  process.exit(0);
}

// Check if dataset exists
const existingDs = db.prepare('SELECT id FROM datasets WHERE user_id = ?').get(demoUser.id);
let datasetId;

if (!existingDs) {
  const csvPath = path.join(__dirname, '..', 'sample_data.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const parsed = parseCSV(csvContent, 'sample_data.csv');

  const dsRes = db.prepare(`
    INSERT INTO datasets (user_id, filename, original_name, columns_meta, row_count, parsed_data, error_rows)
    VALUES (?, 'sample_data.csv', 'sample_data.csv', ?, ?, ?, ?)
  `).run(
    demoUser.id,
    JSON.stringify(parsed.columns),
    parsed.validRowCount,
    JSON.stringify(parsed.rows),
    JSON.stringify(parsed.errorRows)
  );
  datasetId = dsRes.lastInsertRowid;
  console.log('Seeded dataset for demo user, ID:', datasetId);
} else {
  datasetId = existingDs.id;
  console.log('Dataset already exists for demo user, ID:', datasetId);
}

// Check if report exists
const existingRep = db.prepare('SELECT id FROM reports WHERE user_id = ?').get(demoUser.id);

if (!existingRep) {
  const blocks = [
    {
      id: 'b1',
      type: 'text',
      title: 'Executive Summary',
      config: { content: 'Quarterly retail review with full calculation provenance. Click on any metric card or chart to inspect how the figures were computed and audit excluded rows.' }
    },
    {
      id: 'b2',
      type: 'metric',
      title: 'Total Gross Revenue',
      config: { column: 'total', aggregation: 'sum' }
    },
    {
      id: 'b3',
      type: 'metric',
      title: 'Revenue by Region',
      config: { column: 'total', aggregation: 'sum', groupBy: 'region' }
    },
    {
      id: 'b4',
      type: 'chart',
      title: 'Revenue Breakdown by Category',
      config: { chartType: 'bar', xColumn: 'category', yColumn: 'total', aggregation: 'sum' }
    },
    {
      id: 'b5',
      type: 'table',
      title: 'Top 5 Transactions by Value',
      config: { sortColumn: 'total', sortDirection: 'desc', limit: 5 }
    }
  ];

  const repRes = db.prepare(`
    INSERT INTO reports (user_id, dataset_id, title, blocks, filters)
    VALUES (?, ?, 'Q1 Retail Sales & Performance Audit', ?, '{}')
  `).run(demoUser.id, datasetId, JSON.stringify(blocks));
  console.log('Seeded sample report for demo user, ID:', repRes.lastInsertRowid);
} else {
  console.log('Report already exists for demo user, ID:', existingRep.id);
}

console.log('Seeding complete!');
