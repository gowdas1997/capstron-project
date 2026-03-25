const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// ─────────────────────────────────────────────
// 🔧 MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─────────────────────────────────────────────
// 📂 STATIC FILES (Frontend)
// ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─────────────────────────────────────────────
// 🚀 ROUTES
// ─────────────────────────────────────────────
const authRoutes   = require('./routes/auth');   // ✅ AUTH ROUTES
const uploadRoutes = require('./routes/upload');
const fileRoutes   = require('./routes/files');

// ✅ CONNECT ROUTES
app.use('/api/auth', authRoutes);   // 🔥 VERY IMPORTANT
app.use('/api', uploadRoutes);
app.use('/api', fileRoutes);

// ─────────────────────────────────────────────
// ❤️ HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Capstone server is running!' });
});

// ─────────────────────────────────────────────
// 🌐 FRONTEND ROUTES
// ─────────────────────────────────────────────

// Dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

// Register page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'register.html'));
});

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html'));
});

// ─────────────────────────────────────────────
// ❌ 404 HANDLER
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// ─────────────────────────────────────────────
// 🚀 SERVER START
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Capstone server running on port ${PORT}`);
});