const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { computeReport } = require('../services/aggregation');

const router = express.Router();

/**
 * POST /api/share
 * Create a share link for a report. Requires authentication.
 */
router.post('/', authMiddleware, (req, res) => {
  const { reportId, expiresInHours } = req.body;

  if (!reportId) {
    return res.status(400).json({ error: 'Report ID is required.' });
  }

  // Verify report belongs to this user
  const report = db.prepare(
    'SELECT id FROM reports WHERE id = ? AND user_id = ?'
  ).get(reportId, req.userId);

  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  if (expiresInHours !== undefined && expiresInHours !== null &&
      (typeof expiresInHours !== 'number' || !Number.isFinite(expiresInHours) || expiresInHours < 0 || expiresInHours > 8760)) {
    return res.status(400).json({ error: 'Expiry must be a number from 0 to 8760 hours.' });
  }

  // Generate a secure token
  const token = uuidv4();

  // Calculate expiry
  let expiresAt = null;
  if (expiresInHours && expiresInHours > 0) {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + expiresInHours);
    expiresAt = expiry.toISOString();
  }

  db.prepare(
    'INSERT INTO share_links (report_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(reportId, token, expiresAt);

  res.status(201).json({
    token,
    expiresAt,
    url: `/shared/${token}`,
  });
});

/**
 * GET /api/share/links/:reportId
 * List all share links for a report. Requires authentication.
 */
router.get('/links/:reportId', authMiddleware, (req, res) => {
  // Verify report belongs to this user
  const report = db.prepare(
    'SELECT id FROM reports WHERE id = ? AND user_id = ?'
  ).get(req.params.reportId, req.userId);

  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  const links = db.prepare(
    'SELECT id, token, expires_at, revoked, created_at FROM share_links WHERE report_id = ? ORDER BY created_at DESC'
  ).all(report.id);

  res.json(links);
});

/**
 * POST /api/share/revoke/:token
 * Revoke a share link. Requires authentication.
 */
router.post('/revoke/:token', authMiddleware, (req, res) => {
  // Find the share link and verify the report belongs to this user
  const link = db.prepare(`
    SELECT sl.id, sl.report_id
    FROM share_links sl
    JOIN reports r ON sl.report_id = r.id
    WHERE sl.token = ? AND r.user_id = ?
  `).get(req.params.token, req.userId);

  if (!link) {
    return res.status(404).json({ error: 'Share link not found.' });
  }

  db.prepare('UPDATE share_links SET revoked = 1 WHERE id = ?').run(link.id);

  res.json({ success: true, message: 'Share link revoked.' });
});

/**
 * GET /api/share/:token
 * View a shared report. NO authentication required.
 * Only returns the report content — never the raw dataset or other data.
 */
router.get('/:token', (req, res) => {
  res.set('Cache-Control', 'no-store');
  // Find the share link
  const link = db.prepare(
    'SELECT * FROM share_links WHERE token = ?'
  ).get(req.params.token);

  if (!link) {
    return res.status(404).json({ error: 'Share link not found or has been removed.' });
  }

  // Check if revoked
  if (link.revoked) {
    return res.status(403).json({ error: 'This share link has been revoked by the owner.' });
  }

  // Check if expired
  if (link.expires_at) {
    const expiry = new Date(link.expires_at);
    if (new Date() > expiry) {
      return res.status(403).json({ error: 'This share link has expired.' });
    }
  }

  // Load the report
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(link.report_id);
  if (!report) {
    return res.status(404).json({ error: 'The report associated with this link no longer exists.' });
  }

  // Load the dataset (but we DO NOT expose raw data)
  const dataset = db.prepare('SELECT parsed_data, columns_meta, original_name, row_count FROM datasets WHERE id = ?').get(report.dataset_id);
  if (!dataset) {
    return res.status(404).json({ error: 'The dataset for this report no longer exists.' });
  }

  const blocks = JSON.parse(report.blocks);
  const filters = JSON.parse(report.filters);
  const rows = JSON.parse(dataset.parsed_data);
  const columns = JSON.parse(dataset.columns_meta);

  // Compute all blocks server-side
  const computedBlocks = computeReport(rows, blocks, filters);

  // Return ONLY the computed report — no raw data, no dataset access
  res.json({
    title: report.title,
    datasetName: dataset.original_name,
    blocks: computedBlocks,
    filters,
    columns: columns.map(c => ({ name: c.name, type: c.type })), // Only name and type, not sample values
    rowCount: dataset.row_count,
    createdAt: report.created_at,
    isShared: true,
  });
});

module.exports = router;
