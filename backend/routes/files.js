const express  = require('express');
const router   = express.Router();
const { getPool, sql } = require('../db');
const { Storage } = require('@google-cloud/storage');
const { verifyToken } = require('./auth');
require('dotenv').config();

const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const bucket  = storage.bucket(process.env.GCS_BUCKET_NAME);

// ─────────────────────────────────────────────
// 📂 GET USER FILES (Protected)
// ─────────────────────────────────────────────
router.get('/files', verifyToken, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT id, file_name, file_size, file_type, uploaded_at
        FROM files
        WHERE uploaded_by = @userId
        ORDER BY uploaded_at DESC
      `);

    res.json(result.recordset);

  } catch (err) {
    console.error('[Files] List error:', err.message);
    res.status(500).json({ message: 'Failed to fetch files.' });
  }
});

// ─────────────────────────────────────────────
// 📥 DOWNLOAD FILE (SECURE)
// ─────────────────────────────────────────────
router.get('/files/:id/download', verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    if (isNaN(fileId)) {
      return res.status(400).json({ message: 'Invalid file ID.' });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, fileId)
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT file_name, file_size, file_type, file_path
        FROM files
        WHERE id = @id AND uploaded_by = @userId
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'File not found or access denied.' });

    const file = result.recordset[0];

    const gcsFile = bucket.file(file.file_path);

    const [exists] = await gcsFile.exists();
    if (!exists)
      return res.status(404).json({ message: 'File missing in storage.' });

    const [signedUrl] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000 // 15 minutes
    });

    res.json({
      downloadUrl: signedUrl,
      fileName: file.file_name,
      fileSize: file.file_size,
      fileType: file.file_type,
      expiresIn: '15 minutes'
    });

  } catch (err) {
    console.error('[Files] Download error:', err.message);
    res.status(500).json({ message: 'Download failed.' });
  }
});

module.exports = router;