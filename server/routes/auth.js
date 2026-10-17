const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Create a new account.
 */
router.post('/register', (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Check if email already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Hash password and create user
  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(
    email.toLowerCase().trim(),
    passwordHash
  );

  const token = jwt.sign({ userId: result.lastInsertRowid }, SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, email: email.toLowerCase().trim() },
  });
});

/**
 * POST /api/auth/login
 * Sign in to an existing account.
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: { id: user.id, email: user.email },
  });
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth).
 */
router.get('/me', (req, res) => {
  // This endpoint needs auth middleware applied at the router level
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], SECRET);
    const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
});

module.exports = router;
