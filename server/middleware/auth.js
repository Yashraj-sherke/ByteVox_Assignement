const jwt = require('jsonwebtoken');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'test') return crypto.randomBytes(32).toString('hex');
  if (process.env.NODE_ENV === 'production') throw new Error('Set JWT_SECRET before starting in production.');
  const directory = path.join(__dirname, '..', 'data');
  fs.mkdirSync(directory, { recursive: true });
  const secretPath = path.join(directory, '.jwt-secret');
  try { fs.writeFileSync(secretPath, crypto.randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return fs.readFileSync(secretPath, 'utf8').trim();
}
const SECRET = loadSecret();

/**
 * Middleware that verifies JWT from Authorization header.
 * Sets req.userId on success, returns 401 on failure.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

module.exports = { authMiddleware, SECRET };
