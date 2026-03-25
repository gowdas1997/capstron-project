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

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TYPES[ext]) cb(null, true);
    else cb(new Error('File type not allowed!'), false);
  },
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Protected upload route
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: 'No file uploaded.' });

  try {
    const ext      = path.extname(req.file.originalname).toLowerCase();
    const fileName = Date.now() + '-' + req.file.originalname;

    // Save to GCS
    const gcsFile = bucket.file(fileName);
    await gcsFile.save(req.file.buffer, {
      contentType: ALLOWED_TYPES[ext] || 'application/octet-stream',
      resumable: false
    });
    console.log('[Capstone] GCS SUCCESS:', fileName);

    // Save to DB with user id
    const pool = await getPool();
    await pool.request()
      .input('fileName',   sql.NVarChar, req.file.originalname)
      .input('fileSize',   sql.BigInt,   req.file.size)
      .input('fileType',   sql.NVarChar, ext)
      .input('filePath',   sql.NVarChar, fileName)
      .input('uploadedBy', sql.Int,      req.user.id)
      .query('INSERT INTO files (file_name, file_size, file_type, file_path, uploaded_by) VALUES (@fileName, @fileSize, @fileType, @filePath, @uploadedBy)');
    console.log('[Capstone] DB SUCCESS');

    // Pub/Sub
    try {
      const record = {
        fileName:   req.file.originalname,
        fileSize:   req.file.size,
        fileType:   ext,
        filePath:   fileName,
        uploadedBy: req.user.email,
        uploadedAt: new Date().toISOString()
      };
      const msgId = await pubsub.topic('file-uploaded').publish(Buffer.from(JSON.stringify(record)));
      console.log('[Capstone] PubSub SUCCESS:', msgId);
    } catch (pubErr) {
      console.error('[Capstone] PubSub error:', pubErr.message);
    }

    res.status(200).json({ message: 'File uploaded successfully!' });

  } catch (err) {
    console.error('[Capstone] Upload error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;