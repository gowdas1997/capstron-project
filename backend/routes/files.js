const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const fileRecords = require('./upload').records;
const uploadDir   = path.join(__dirname, '..', 'uploads');

// GET /api/files — ಎಲ್ಲಾ files list
router.get('/files', (req, res) => {
  res.json(fileRecords);
});

// GET /api/files/:id/download — file download
router.get('/files/:id/download', (req, res) => {
  const file = fileRecords.find(f => f.id === parseInt(req.params.id));

  if (!file) {
    return res.status(404).json({ message: 'File not found.' });
  }

  const filePath = path.join(uploadDir, file.filePath);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File missing.' });
  }

  res.download(filePath, file.fileName);
});

module.exports = router;