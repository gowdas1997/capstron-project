const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { PubSub } = require('@google-cloud/pubsub');
const router   = express.Router();

const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  ['.pdf', '.docx'].includes(ext)
    ? cb(null, true)
    : cb(new Error('Only PDF and DOCX allowed!'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const fileRecords = [];

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const record = {
    id:         fileRecords.length + 1,
    fileName:   req.file.originalname,
    fileSize:   req.file.size,
    filePath:   req.file.filename,
    uploadedAt: new Date().toISOString()
  };

  fileRecords.push(record);
  console.log(`[Capstron] Uploaded: ${record.fileName}`);

  try {
    const dataBuffer = Buffer.from(JSON.stringify(record));
    const msgId = await pubsub.topic('file-uploaded').publish(dataBuffer);
    console.log(`[Capstron] Pub/Sub event published: ${msgId}`);
  } catch (err) {
    console.error('[Capstron] Pub/Sub error:', err.message);
  }

  res.status(200).json({
    message: 'File uploaded successfully!',
    file: record
  });
});

module.exports         = router;
module.exports.records = fileRecords;