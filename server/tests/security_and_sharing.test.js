// Vitest globals enabled (describe, it, expect, beforeAll, afterAll)
const http = require('http');
const db = require('../db');
const app = require('../index');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { SECRET } = require('../middleware/auth');

let server;
let baseUrl;

beforeAll(async () => {
  // Start server on random available port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Security, Ownership Enforcement & Sharing Links', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let user1ReportId;
  let user1DatasetId;

  beforeAll(() => {
    // Clean tables for tests
    db.prepare('DELETE FROM share_links').run();
    db.prepare('DELETE FROM reports').run();
    db.prepare('DELETE FROM datasets').run();
    db.prepare('DELETE FROM users').run();

    // Setup user 1
    const pwhash1 = bcrypt.hashSync('pass123', 8);
    const u1 = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run('user1@example.com', pwhash1);
    user1Id = u1.lastInsertRowid;
    user1Token = jwt.sign({ userId: user1Id }, SECRET, { expiresIn: '1h' });

    // Setup user 2
    const pwhash2 = bcrypt.hashSync('pass456', 8);
    const u2 = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run('user2@example.com', pwhash2);
    user2Id = u2.lastInsertRowid;
    user2Token = jwt.sign({ userId: user2Id }, SECRET, { expiresIn: '1h' });

    // User 1 dataset
    const sampleData = [{ id: 1, region: 'North', sales: 150 }];
    const d1 = db.prepare(`
      INSERT INTO datasets (user_id, filename, original_name, columns_meta, row_count, parsed_data)
      VALUES (?, 'test.csv', 'test.csv', '[]', 1, ?)
    `).run(user1Id, JSON.stringify(sampleData));
    user1DatasetId = d1.lastInsertRowid;

    // User 1 report
    const r1 = db.prepare(`
      INSERT INTO reports (user_id, dataset_id, title, blocks, filters)
      VALUES (?, ?, 'User 1 Confidential Report', '[]', '{}')
    `).run(user1Id, user1DatasetId);
    user1ReportId = r1.lastInsertRowid;
  });

  it('ENFORCES OWNERSHIP: User 2 cannot access User 1 report', async () => {
    const res = await fetch(`${baseUrl}/api/reports/${user1ReportId}`, {
      headers: {
        Authorization: `Bearer ${user2Token}`
      }
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Report not found');
  });

  it('ENFORCES OWNERSHIP: User 2 cannot access or view User 1 dataset', async () => {
    const res = await fetch(`${baseUrl}/api/datasets/${user1DatasetId}`, {
      headers: {
        Authorization: `Bearer ${user2Token}`
      }
    });

    expect(res.status).toBe(404);
  });

  it('ENFORCES OWNERSHIP: User 2 cannot modify User 1 report', async () => {
    const res = await fetch(`${baseUrl}/api/reports/${user1ReportId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${user2Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'Hacked Report Title' })
    });

    expect(res.status).toBe(404);

    // Verify User 1 title didn't change
    const check = db.prepare('SELECT title FROM reports WHERE id = ?').get(user1ReportId);
    expect(check.title).toBe('User 1 Confidential Report');
  });

  it('SHARING: Valid unexpired share link allows read-only report view without auth', async () => {
    // Create share link for user 1 report
    const shareRes = await fetch(`${baseUrl}/api/share`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reportId: user1ReportId, expiresInHours: 24 })
    });

    expect(shareRes.status).toBe(201);
    const { token } = await shareRes.json();
    expect(token).toBeDefined();

    // Anonymous viewer accesses the share link without any Authorization header
    const viewRes = await fetch(`${baseUrl}/api/share/${token}`);
    expect(viewRes.status).toBe(200);
    const sharedData = await viewRes.json();

    expect(sharedData.title).toBe('User 1 Confidential Report');
    expect(sharedData.isShared).toBe(true);
    // Crucial security test: Raw data and user identity must NOT be leaked
    expect(sharedData.parsed_data).toBeUndefined();
    expect(sharedData.userId).toBeUndefined();
  });

  it('SHARING: Revoked share link returns 403 Forbidden', async () => {
    // Create link
    const linkToken = 'revoked-token-test-' + Date.now();
    db.prepare('INSERT INTO share_links (report_id, token, revoked) VALUES (?, ?, 1)')
      .run(user1ReportId, linkToken);

    // Attempt to access revoked link
    const res = await fetch(`${baseUrl}/api/share/${linkToken}`);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('revoked');
  });

  it('SHARING: Expired share link returns 403 Forbidden', async () => {
    // Create already expired link (expired 2 hours ago)
    const linkToken = 'expired-token-test-' + Date.now();
    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO share_links (report_id, token, expires_at, revoked) VALUES (?, ?, ?, 0)')
      .run(user1ReportId, linkToken, pastTime);

    // Attempt to access expired link
    const res = await fetch(`${baseUrl}/api/share/${linkToken}`);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('expired');
  });

  it('SHARING: User cannot revoke someone else share link', async () => {
    // User 1 creates link
    const linkToken = 'u1-secret-link-' + Date.now();
    db.prepare('INSERT INTO share_links (report_id, token) VALUES (?, ?)')
      .run(user1ReportId, linkToken);

    // User 2 attempts to revoke User 1 link
    const res = await fetch(`${baseUrl}/api/share/revoke/${linkToken}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user2Token}`
      }
    });

    expect(res.status).toBe(404);

    // Link must still not be revoked
    const linkInDb = db.prepare('SELECT revoked FROM share_links WHERE token = ?').get(linkToken);
    expect(linkInDb.revoked).toBe(0);
  });
});
