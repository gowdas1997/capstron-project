const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const bucket  = storage.bucket(process.env.GCS_BUCKET_NAME);

// GET /api/files — list all files from DB
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

// GET /api/files/:id/download — generate GCS Signed URL (15 min)
router.get('/files/:id/download', async (req, res) => {
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .query('SELECT * FROM files WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const file    = result.recordset[0];
    const gcsFile = bucket.file(file.file_path);

    const [exists] = await gcsFile.exists();
    if (!exists) {
      return res.status(404).json({ message: 'File missing in storage.' });
    }

    const [signedUrl] = await gcsFile.getSignedUrl({
      action:  'read',
      expires: Date.now() + 15 * 60 * 1000,
    });

    console.log(`[Capstone] Signed URL generated for: ${file.file_name}`);

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