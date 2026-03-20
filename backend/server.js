const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { Storage } = require('@google-cloud/storage');
const { PubSub }  = require('@google-cloud/pubsub');
require('dotenv').config();

const app     = express();
const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const pubsub  = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
const bucket  = storage.bucket(process.env.GCS_BUCKET_NAME);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Generate signed URL for direct browser upload
app.post('/api/get-upload-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    const gcsFileName = Date.now() + '-' + fileName;
    const file = bucket.file(gcsFileName);

    const [signedUrl] = await file.generateSignedPostPolicyV4({
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      conditions: [
        ['content-length-range', 0, 100 * 1024 * 1024] // 100MB
      ],
      fields: { 'Content-Type': fileType }
    });

    res.json({
      uploadUrl: signedUrl.url,
      fields:    signedUrl.fields,
      gcsFileName
    });
  } catch (err) {
    console.error('[Capstron] Signed URL error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// After upload — save record + publish Pub/Sub
app.post('/api/confirm-upload', async (req, res) => {
  try {
    const { fileName, fileSize, gcsFileName } = req.body;

    const record = {
      id:         Date.now(),
      fileName,
      fileSize,
      filePath:   gcsFileName,
      uploadedAt: new Date().toISOString()
    };

    console.log(`[Capstron] Confirmed upload: ${fileName}`);

    // Publish to Pub/Sub
    try {
      const msgId = await pubsub
        .topic('file-uploaded')
        .publish(Buffer.from(JSON.stringify(record)));
      console.log(`[Capstron] Pub/Sub published: ${msgId}`);
    } catch (e) {
      console.error('[Capstron] Pub/Sub error:', e.message);
    }

    res.json({ message: 'Upload confirmed!', file: record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Capstron server is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Capstron server running on http://localhost:${PORT}`);
});