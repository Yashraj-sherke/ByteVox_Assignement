const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const datasetRoutes = require('./routes/datasets');
const reportRoutes = require('./routes/reports');
const shareRoutes = require('./routes/share');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration: allow client Vite dev server and standard headers
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/share', shareRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'An internal server error occurred.'
  });
});

// Start listening if not imported as module (e.g., in test)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
