const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const router   = express.Router();
const { getPool, sql } = require('../db');
const { verifyToken } = require('./auth');
require('dotenv').config();

const { Storage } = require('@google-cloud/storage');
const storage  = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const bucket   = storage.bucket(process.env.GCS_BUCKET_NAME);

const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });

// Allowed file types
const ALLOWED_TYPES = {
  '.pdf':  'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc':  'application/msword',
  '.txt':  'text/plain',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.m4a':  'audio/mp4',
  '.mp4':  'video/mp4',
  '.avi':  'video/x-msvideo',
  '.mov':  'video/quicktime',
  '.mkv':  'video/x-matroska',
  '.webm': 'video/webm'
};

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_TYPES[ext]) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed!'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// ─────────────────────────────────────────────
// 📤 UPLOAD FILE (Protected)
// ─────────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No file uploaded.' });

    const ext = path.extname(req.file.originalname).toLowerCase();

    // ✅ Safe filename
    const safeName = req.file.originalname.replace(/\s+/g, '_');
    const fileName = `${Date.now()}-${safeName}`;

    // Upload to GCS
    const gcsFile = bucket.file(fileName);

    await gcsFile.save(req.file.buffer, {
      contentType: ALLOWED_TYPES[ext] || 'application/octet-stream',
      resumable: false
    });

    console.log('[Upload] GCS SUCCESS:', fileName);

    // Save in DB
    const pool = await getPool();

    await pool.request()
      .input('fileName',   sql.NVarChar, req.file.originalname)
      .input('fileSize',   sql.BigInt,   req.file.size)
      .input('fileType',   sql.NVarChar, ext)
      .input('filePath',   sql.NVarChar, fileName)
      .input('uploadedBy', sql.Int,      req.user.id)
      .query(`
        INSERT INTO files 
        (file_name, file_size, file_type, file_path, uploaded_by)
        VALUES 
        (@fileName, @fileSize, @fileType, @filePath, @uploadedBy)
      `);

    console.log('[Upload] DB SUCCESS');

    // Pub/Sub event (optional but good)
    try {
      const record = {
        fileName:   req.file.originalname,
        fileSize:   req.file.size,
        fileType:   ext,
        filePath:   fileName,
        uploadedBy: req.user.email,
        uploadedAt: new Date().toISOString()
      };

      const msgId = await pubsub
        .topic('file-uploaded')
        .publish(Buffer.from(JSON.stringify(record)));

      console.log('[Upload] PubSub SUCCESS:', msgId);

    } catch (pubErr) {
      console.error('[Upload] PubSub ERROR:', pubErr.message);
    }

    res.status(200).json({
      message: 'File uploaded successfully!'
    });

  } catch (err) {
    console.error('[Upload] ERROR:', err.message);

    // Handle multer error
    if (err.message === 'File type not allowed!') {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({
      message: 'Upload failed.'
    });
  }
});

module.exports = router;