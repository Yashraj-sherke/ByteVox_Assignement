const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { parseCSV } = require('../services/csvParser');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All dataset routes require authentication
router.use(authMiddleware);

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files are accepted. Please upload a file with a .csv extension.'));
    }
    // Check MIME type loosely (some systems report different MIME types for CSV)
    const allowedMimes = ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'];
    if (!allowedMimes.includes(file.mimetype)) {
      // Still allow it but with a warning — many systems misreport CSV MIME type
    }
    cb(null, true);
  },
});

/**
 * POST /api/datasets/upload
 * Upload and parse a CSV file.
 */
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File is too large. Maximum size is 10 MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded. Please select a CSV file.' });
    }

    try {
      // Read file content
      const filePath = req.file.path;
      let fileContent;
      try {
        fileContent = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(filePath));
        if (fileContent.includes('\0')) throw new Error('Binary content');
      } catch {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Could not decode this CSV. Save it as UTF-8 CSV and upload it again.' });
      }

      // Parse the CSV
      const parsed = parseCSV(fileContent, req.file.originalname);

      // Store in database
      const result = db.prepare(`
        INSERT INTO datasets (user_id, filename, original_name, columns_meta, row_count, parsed_data, error_rows)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.userId,
        req.file.filename,
        req.file.originalname,
        JSON.stringify(parsed.columns),
        parsed.validRowCount,
        JSON.stringify(parsed.rows),
        JSON.stringify(parsed.errorRows)
      );

      // Clean up the uploaded file (data is now in the DB)
      try { fs.unlinkSync(filePath); } catch {}

      res.status(201).json({
        id: result.lastInsertRowid,
        originalName: req.file.originalname,
        columns: parsed.columns,
        rowCount: parsed.validRowCount,
        totalRowsRead: parsed.totalRowsRead,
        errorRows: parsed.errorRows,
        errorRowCount: parsed.errorRows.length,
      });
    } catch (parseErr) {
      // Clean up the uploaded file on error
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: parseErr.message });
    }
  });
});

/**
 * GET /api/datasets
 * List all datasets for the authenticated user.
 */
router.get('/', (req, res) => {
  const datasets = db.prepare(
    'SELECT id, original_name, row_count, columns_meta, created_at FROM datasets WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);

  res.json(datasets.map(d => ({
    ...d,
    columns_meta: JSON.parse(d.columns_meta),
  })));
});

/**
 * GET /api/datasets/:id
 * Get a single dataset's profile (columns, errors, sample data).
 * Enforces ownership at query level.
 */
router.get('/:id', (req, res) => {
  const dataset = db.prepare(
    'SELECT * FROM datasets WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found.' });
  }

  res.json({
    id: dataset.id,
    originalName: dataset.original_name,
    columns: JSON.parse(dataset.columns_meta),
    rowCount: dataset.row_count,
    errorRows: JSON.parse(dataset.error_rows),
    sampleRows: JSON.parse(dataset.parsed_data).slice(0, 20),
    createdAt: dataset.created_at,
  });
});

/**
 * DELETE /api/datasets/:id
 * Delete a dataset and its associated reports.
 * Enforces ownership at query level.
 */
router.delete('/:id', (req, res) => {
  const dataset = db.prepare(
    'SELECT id FROM datasets WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found.' });
  }

  // Delete share links for associated reports
  db.prepare(`
    DELETE FROM share_links WHERE report_id IN (SELECT id FROM reports WHERE dataset_id = ?)
  `).run(dataset.id);

  // Delete reports
  db.prepare('DELETE FROM reports WHERE dataset_id = ?').run(dataset.id);

  // Delete dataset
  db.prepare('DELETE FROM datasets WHERE id = ?').run(dataset.id);

  res.json({ success: true });
});

module.exports = router;
