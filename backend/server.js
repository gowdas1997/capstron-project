const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// ─────────────────────────────────────────────
// 🔧 MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors({
  origin: '*', // You can restrict later for security
}));

app.use(express.json());

// ─────────────────────────────────────────────
// 🚀 IMPORT ROUTES
// ─────────────────────────────────────────────
const authRoutes   = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const fileRoutes   = require('./routes/files');

// ─────────────────────────────────────────────
// 🔗 API ROUTES
// ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', fileRoutes);

// ─────────────────────────────────────────────
// ❤️ HEALTH CHECK (FOR LB)
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Capstone Backend',
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────
// ❌ INVALID ROUTES HANDLER
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Invalid API route'
  });
});

// ─────────────────────────────────────────────
// 🚀 START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Capstone backend running on port ${PORT}`);
});