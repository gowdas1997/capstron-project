// backend/routes/auth.js
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const { getPool, sql } = require('../db');
const { requireAuth, requireAdmin } = require('../authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'capstone-secret-key-change-in-prod';
const JWT_EXPIRES = '8h';

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const pool = await getPool();

    // Check if user already exists
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM users WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email',    sql.NVarChar, email)
      .input('hash',     sql.NVarChar, hash)
      .query(`
        INSERT INTO users (username, email, password_hash, role)
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.role
        VALUES (@username, @email, @hash, 'user')
      `);

    const user = result.recordset[0];
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    console.log(`[Auth] New user registered: ${email}`);
    res.status(201).json({ token, username: user.username, role: user.role });

  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, username, password_hash, role FROM users WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    console.log(`[Auth] User logged in: ${email}`);
    res.json({ token, username: user.username, role: user.role });

  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ message: 'Login failed.' });
  }
});

// GET /api/auth/me — verify token and return user info
router.get('/auth/me', requireAuth, async (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// ─── ADMIN ROUTES ───────────────────────────────────────────────

// GET /api/admin/users — list all users (admin only)
router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('[Admin] List users error:', err.message);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// POST /api/admin/reset-password — reset any user's password (admin only)
router.post('/admin/reset-password', requireAuth, requireAdmin, async (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ message: 'userId and newPassword are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters.' });
  }

  try {
    const pool = await getPool();
    const hash = await bcrypt.hash(newPassword, 10);

    const result = await pool.request()
      .input('id',   sql.Int,      userId)
      .input('hash', sql.NVarChar, hash)
      .query('UPDATE users SET password_hash = @hash WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    console.log(`[Admin] Password reset for userId: ${userId} by admin: ${req.user.username}`);
    res.json({ message: 'Password reset successfully.' });

  } catch (err) {
    console.error('[Admin] Reset password error:', err.message);
    res.status(500).json({ message: 'Password reset failed.' });
  }
});

// POST /api/admin/set-role — change user role (admin only)
router.post('/admin/set-role', requireAuth, requireAdmin, async (req, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ message: 'userId and role are required.' });
  }
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Role must be user or admin.' });
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input('id',   sql.Int,      userId)
      .input('role', sql.NVarChar, role)
      .query('UPDATE users SET role = @role WHERE id = @id');

    res.json({ message: `Role updated to ${role}.` });
  } catch (err) {
    console.error('[Admin] Set role error:', err.message);
    res.status(500).json({ message: 'Failed to update role.' });
  }
});

module.exports = router;