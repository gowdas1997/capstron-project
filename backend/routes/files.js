const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

// GCS Setup
const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const bucket  = storage.bucket(process.env.GCS_BUCKET_NAME);

// GET /api/files — DB inda ella files list
router.get('/files', async (req, res) => {
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM files ORDER BY uploaded_at DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('[Capstone] Files list error:', err.message);
    res.status(500).json({ message: 'Failed to fetch files.' });
  }
});

// GET /api/files/:id/download — Controlled access via GCS Signed URL
router.get('/files/:id/download', async (req, res) => {
  try {
    // Step 1: DB inda file details get
    const pool   = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .query('SELECT * FROM files WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const file = result.recordset[0];

    // Step 2: GCS Signed URL generate (15 min valid)
    // Controlled access - URL expire aaguttade!
    const gcsFile = bucket.file(file.file_path);

    // File GCS alli ide antha check
    const [exists] = await gcsFile.exists();
    if (!exists) {
      return res.status(404).json({ message: 'File missing in storage.' });
    }

    // Signed URL generate - 15 min only valid
    const [signedUrl] = await gcsFile.getSignedUrl({
      action:  'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    console.log(`[Capstone] Signed URL generated for: ${file.file_name}`);

    // Step 3: Signed URL return
    res.json({
      downloadUrl: signedUrl,
      fileName:    file.file_name,
      fileSize:    file.file_size,
      fileType:    file.file_type,
      expiresIn:   '15 minutes'
    });

  } catch (err) {
    console.error('[Capstone] Download error:', err.message);
    res.status(500).json({ message: 'Download failed.' });
  }
});

module.exports = router;