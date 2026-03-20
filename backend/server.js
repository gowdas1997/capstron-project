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

// LOCAL: File upload via multer
const uploadRoutes = require('./routes/upload');
const fileRoutes   = require('./routes/files');
app.use('/api', uploadRoutes);
app.use('/api', fileRoutes);

// GCP: Signed URL — uncomment when deploying to GCP
// app.post('/api/get-upload-url', async (req, res) => { ... });

// GCP: Confirm upload + Pub/Sub — uncomment when deploying to GCP  
// app.post('/api/confirm-upload', async (req, res) => { ... });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Capstone server is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Capstone server running on http://localhost:${PORT}`);
});