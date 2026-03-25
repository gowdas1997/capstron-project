const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Capstone server is running!' });
});

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const { requireAuth } = require('./authMiddleware');
const uploadRoutes = require('./routes/upload');
const fileRoutes   = require('./routes/files');
app.use('/api', requireAuth, uploadRoutes);
app.use('/api', requireAuth, fileRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Capstone server running on port ${PORT}`);
});
