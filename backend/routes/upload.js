const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const router   = express.Router();
const { getPool, sql } = require('../db');
require('dotenv').config();

const { Storage } = require('@google-cloud/storage');
const storage  = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const bucket   = storage.bucket(process.env.GCS_BUCKET_NAME);

const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  console.log("🚀 UPLOAD API HIT");  
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const fileName = Date.now() + '-' + req.file.originalname;

    // =========================
    // 1. Upload to GCS
    // =========================
    const gcsFile = bucket.file(fileName);
    await gcsFile.save(req.file.buffer);
    console.log('[Capstone] GCS SUCCESS:', fileName);

    // =========================
    // 2. Save file metadata to DB
    // =========================
    const pool = await getPool();

    await pool.request()
      .input('fileName',   sql.NVarChar, req.file.originalname)
      .input('fileSize',   sql.BigInt,   req.file.size)
      .input('fileType',   sql.NVarChar, path.extname(req.file.originalname))
      .input('filePath',   sql.NVarChar, fileName)
      .input('uploadedBy', sql.Int,      req.user.id)
      .query(`
        INSERT INTO files (file_name, file_size, file_type, file_path, uploaded_by)
        VALUES (@fileName, @fileSize, @fileType, @filePath, @uploadedBy)
      `);

    console.log('[Capstone] DB SUCCESS');

    // =========================
    // 3. Fetch user email
    // =========================
    const userResult = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT email FROM users WHERE id = @id');

    const userEmail = userResult.recordset[0]?.email || '';

    console.log("USER EMAIL FROM DB:", userEmail);

    if (!userEmail) {
      console.error("❌ ERROR: userEmail is missing from DB!");
    }

    // =========================
    // 4. Prepare Pub/Sub message
    // =========================
    const record = {
      fileName:   req.file.originalname,
      fileSize:   req.file.size,
      fileType:   path.extname(req.file.originalname),
      filePath:   fileName,
      uploadedBy: req.user.id,
      userEmail:  userEmail,   // 🔥 IMPORTANT
      uploadedAt: new Date().toISOString()
    };

    console.log("FINAL RECORD SENT TO PUBSUB:", record);

    // =========================
    // 5. Publish to Pub/Sub (FIXED METHOD)
    // =========================
    try {
      const msgId = await pubsub.topic('file-uploaded').publishMessage({
        data: Buffer.from(JSON.stringify(record))
      });

      console.log('[Capstone] PubSub SUCCESS:', msgId);

    } catch (pubErr) {
      console.error('[Capstone] PubSub ERROR:', pubErr.message);
    }

    // =========================
    // 6. Response
    // =========================
    res.status(200).json({ message: 'File uploaded successfully!' });

  } catch (err) {
    console.error('[Capstone] ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;