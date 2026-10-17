const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { computeReport } = require('../services/aggregation');
const { validateReport } = require('../services/reportValidation');

const router = express.Router();

// All report routes require authentication
router.use(authMiddleware);

/**
 * POST /api/reports
 * Create a new report for a dataset.
 */
router.post('/', (req, res) => {
  const { datasetId, title } = req.body;

  const titleError = validateReport({ title }, []);
  if (titleError) return res.status(400).json({ error: titleError });

  if (!datasetId) {
    return res.status(400).json({ error: 'Dataset ID is required.' });
  }

  // Verify the dataset belongs to this user
  const dataset = db.prepare(
    'SELECT id FROM datasets WHERE id = ? AND user_id = ?'
  ).get(datasetId, req.userId);

  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found.' });
  }

  const result = db.prepare(
    'INSERT INTO reports (user_id, dataset_id, title) VALUES (?, ?, ?)'
  ).run(req.userId, datasetId, title || 'Untitled Report');

  res.status(201).json({
    id: result.lastInsertRowid,
    datasetId,
    title: title || 'Untitled Report',
    blocks: [],
    filters: {},
  });
});

/**
 * GET /api/reports
 * List all reports for the authenticated user.
 */
router.get('/', (req, res) => {
  const reports = db.prepare(`
    SELECT r.id, r.title, r.dataset_id, r.created_at, r.updated_at, d.original_name as dataset_name
    FROM reports r
    JOIN datasets d ON r.dataset_id = d.id
    WHERE r.user_id = ?
    ORDER BY r.updated_at DESC
  `).all(req.userId);

  res.json(reports);
});

/**
 * GET /api/reports/:id
 * Get a single report with computed block results.
 * Enforces ownership at query level.
 */
router.get('/:id', (req, res) => {
  const report = db.prepare(
    'SELECT * FROM reports WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  // Load the dataset
  const dataset = db.prepare(
    'SELECT * FROM datasets WHERE id = ? AND user_id = ?'
  ).get(report.dataset_id, req.userId);

  if (!dataset) {
    return res.status(404).json({ error: 'Associated dataset not found.' });
  }

  const blocks = JSON.parse(report.blocks);
  const filters = JSON.parse(report.filters);
  const rows = JSON.parse(dataset.parsed_data);
  const columns = JSON.parse(dataset.columns_meta);

  // Compute all blocks
  const computedBlocks = computeReport(rows, blocks, filters);

  res.json({
    id: report.id,
    title: report.title,
    datasetId: report.dataset_id,
    datasetName: dataset.original_name,
    blocks: computedBlocks,
    filters,
    columns,
    rowCount: dataset.row_count,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
  });
});

/**
 * PUT /api/reports/:id
 * Update a report's title, blocks, or filters.
 * Enforces ownership at query level.
 */
router.put('/:id', (req, res) => {
  const report = db.prepare(
    'SELECT * FROM reports WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  const { title, blocks, filters } = req.body;

  const source = db.prepare('SELECT columns_meta FROM datasets WHERE id = ? AND user_id = ?').get(report.dataset_id, req.userId);
  if (!source) return res.status(404).json({ error: 'Associated dataset not found.' });
  const validationError = validateReport({ title, blocks, filters }, JSON.parse(source.columns_meta));
  if (validationError) return res.status(400).json({ error: validationError });

  // Validate blocks structure
  if (blocks !== undefined) {
    if (!Array.isArray(blocks)) {
      return res.status(400).json({ error: 'Blocks must be an array.' });
    }
    for (const block of blocks) {
      if (!block.id || !block.type || !block.config) {
        return res.status(400).json({ error: 'Each block must have an id, type, and config.' });
      }
      if (!['metric', 'chart', 'table', 'text'].includes(block.type)) {
        return res.status(400).json({ error: `Invalid block type: ${block.type}` });
      }
    }
  }

  // Update
  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (blocks !== undefined) {
    updates.push('blocks = ?');
    params.push(JSON.stringify(blocks));
  }
  if (filters !== undefined) {
    updates.push('filters = ?');
    params.push(JSON.stringify(filters));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided.' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id, req.userId);

  db.prepare(
    `UPDATE reports SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  ).run(...params);

  // Return the updated report with computed results
  const updated = db.prepare(
    'SELECT * FROM reports WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  const dataset = db.prepare(
    'SELECT * FROM datasets WHERE id = ? AND user_id = ?'
  ).get(updated.dataset_id, req.userId);

  const updatedBlocks = JSON.parse(updated.blocks);
  const updatedFilters = JSON.parse(updated.filters);
  const rows = JSON.parse(dataset.parsed_data);
  const columns = JSON.parse(dataset.columns_meta);

  const computedBlocks = computeReport(rows, updatedBlocks, updatedFilters);

  res.json({
    id: updated.id,
    title: updated.title,
    datasetId: updated.dataset_id,
    datasetName: dataset.original_name,
    blocks: computedBlocks,
    filters: updatedFilters,
    columns,
    rowCount: dataset.row_count,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  });
});

/**
 * DELETE /api/reports/:id
 * Delete a report and its share links.
 * Enforces ownership at query level.
 */
router.delete('/:id', (req, res) => {
  const report = db.prepare(
    'SELECT id FROM reports WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  db.prepare('DELETE FROM share_links WHERE report_id = ?').run(report.id);
  db.prepare('DELETE FROM reports WHERE id = ?').run(report.id);

  res.json({ success: true });
});

module.exports = router;
