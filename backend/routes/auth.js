const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const { getPool, sql } = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// ─────────────────────────────────────────────
// 🔐 VERIFY TOKEN
// ─────────────────────────────────────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token)
    return res.status(401).json({ message: 'Access denied. No token.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

// ─────────────────────────────────────────────
// 🛡️ ADMIN CHECK
// ─────────────────────────────────────────────
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin access required.' });

  next();
}

// ─────────────────────────────────────────────
// 🔐 REGISTER
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ message: 'All fields are required.' });

  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });

  try {
    const pool = await getPool();

    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM users WHERE email = @email');

    if (existing.recordset.length > 0)
      return res.status(409).json({ message: 'Email already registered.' });

    const hashed = await bcrypt.hash(password, 10);

    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email',    sql.NVarChar, email)
      .input('password', sql.NVarChar, hashed)
      .input('role',     sql.NVarChar, 'user')
      .query(`
        INSERT INTO users (username, email, password, role)
        VALUES (@username, @email, @password, @role)
      `);

    console.log(`[Auth] Registered: ${email}`);

    res.status(201).json({
      message: 'Registration successful! Please login.'
    });

  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// ─────────────────────────────────────────────
// 🔑 LOGIN
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required.' });

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');

    if (result.recordset.length === 0)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const user = result.recordset[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`[Auth] Login: ${email}`);

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ message: 'Login failed.' });
  }
});

// ─────────────────────────────────────────────
// 👤 GET CURRENT USER
// ─────────────────────────────────────────────
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// ─────────────────────────────────────────────
// 🧑‍💼 GET ALL USERS (ADMIN)
// ─────────────────────────────────────────────
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .query(`
        SELECT id, username, email, role, created_at
        FROM users
        ORDER BY created_at DESC
      `);

    res.json(result.recordset);

  } catch (err) {
    console.error('[Auth] Users error:', err.message);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// ─────────────────────────────────────────────
// 🔄 RESET PASSWORD (ADMIN)
// ─────────────────────────────────────────────
router.post('/reset-password', verifyToken, isAdmin, async (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword)
    return res.status(400).json({ message: 'User ID and password required.' });

  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });

  try {
    const pool = await getPool();

    const hashed = await bcrypt.hash(newPassword, 10);

    const result = await pool.request()
      .input('id', sql.Int, userId)
      .input('password', sql.NVarChar, hashed)
      .query('UPDATE users SET password = @password WHERE id = @id');

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ message: 'User not found.' });

    console.log(`[Auth] Password reset for user ID: ${userId}`);

    res.json({ message: 'Password reset successful!' });

  } catch (err) {
    console.error('[Auth] Reset error:', err.message);
    res.status(500).json({ message: 'Password reset failed.' });
  }
});

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = router;
module.exports.verifyToken = verifyToken;