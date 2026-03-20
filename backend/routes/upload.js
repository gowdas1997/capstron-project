const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();
const { getPool, sql } = require('../db');
require('dotenv').config();

// GCP imports — uncomment when deploying to GCP
// const { Storage } = require('@google-cloud/storage');
// const { PubSub }  = require('@google-cloud/pubsub');
// const storage  = new Storage({ projectId: process.env.GCP_PROJECT_ID });
// const pubsub   = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
// const bucket   = storage.bucket(process.env.GCS_BUCKET_NAME);

// Local uploads folder
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// All allowed file types
const ALLOWED_TYPES = {
  // Documents
  '.pdf':  'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc':  'application/msword',
  '.txt':  'text/plain',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  // Audio
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.m4a':  'audio/mp4',
  // Video
  '.mp4':  'video/mp4',
  '.avi':  'video/x-msvideo',
  '.mov':  'video/quicktime',
  '.mkv':  'video/x-matroska',
  '.webm': 'video/webm'
};

// LOCAL: Save to disk
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

// GCP: Memory storage — uncomment when deploying to GCP
// const gcpStorage = multer.memoryStorage();

const upload = multer({
  storage: localStorage,
  // storage: gcpStorage, // uncomment for GCP
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TYPES[ext]) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not allowed!`), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

const fileRecords = [];

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const ext      = path.extname(req.file.originalname).toLowerCase();
    const fileName = req.file.filename; // local disk filename

    // GCP: Save to GCS — uncomment when deploying to GCP
    // const fileName = Date.now() + '-' + req.file.originalname;
    // const gcsFile  = bucket.file(fileName);
    // await gcsFile.save(req.file.buffer, {
    //   contentType: ALLOWED_TYPES[ext] || 'application/octet-stream',
    //   resumable:   false
    // });
    // console.log(`[Capstone] Saved to GCS: ${fileName}`);

    const record = {
      id:         fileRecords.length + 1,
      fileName:   req.file.originalname,
      fileSize:   req.file.size,
      fileType:   ext.replace('.', '').toUpperCase(),
      filePath:   fileName,
      uploadedAt: new Date().toISOString()
    };

    fileRecords.push(record);

    // DB alli save maadi
    try {
      const pool = await getPool();
      await pool.request()
        .input('fileName', sql.NVarChar, req.file.originalname)
        .input('fileSize', sql.BigInt,   req.file.size)
        .input('fileType', sql.NVarChar, ext.replace('.', '').toUpperCase())
        .input('filePath', sql.NVarChar, fileName)
        .query(`INSERT INTO files (file_name, file_size, file_type, file_path)
                VALUES (@fileName, @fileSize, @fileType, @filePath)`);
      console.log(`[Capstone] Saved to DB: ${req.file.originalname}`);
    } catch (dbErr) {
      console.error('[Capstone] DB error:', dbErr.message);
    }

    console.log(`[Capstone] Uploaded locally: ${record.fileName}`);

    // GCP: Publish to Pub/Sub — uncomment when deploying to GCP
    // try {
    //   const dataBuffer = Buffer.from(JSON.stringify(record));
    //   const msgId = await pubsub.topic('file-uploaded').publish(dataBuffer);
    //   console.log(`[Capstone] Pub/Sub event published: ${msgId}`);
    // } catch (err) {
    //   console.error('[Capstone] Pub/Sub error:', err.message);
    // }

    res.status(200).json({
      message: 'File uploaded successfully!',
      file: record
    });

  } catch (err) {
    console.error('[Capstone] Upload error:', err.message);
    res.status(500).json({ message: 'Upload failed: ' + err.message });
  }
});

module.exports         = router;
module.exports.records = fileRecords;