const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

// GCP imports — uncomment when deploying to GCP
// const { Storage } = require('@google-cloud/storage');
// const { PubSub }  = require('@google-cloud/pubsub');

const app = express();

// GCP setup — uncomment when deploying to GCP
// const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
// const pubsub  = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
// const bucket  = storage.bucket(process.env.GCS_BUCKET_NAME);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// File upload routes
const uploadRoutes = require('./routes/upload');
const fileRoutes   = require('./routes/files');
app.use('/api', uploadRoutes);
app.use('/api', fileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Capstone server is running!' });
});

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Capstone server running on port ${PORT}`);
});