const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('logActivity', (cloudEvent) => {
  const message = cloudEvent.data.message;
  const data = message.data
    ? JSON.parse(Buffer.from(message.data, 'base64').toString())
    : {};

  console.log('[LogActivity] Received event:', JSON.stringify(data));

  const log = {
    event:      'FILE_UPLOADED',
    fileName:   data.fileName,
    fileSize:   data.fileSize,
    uploadedAt: data.uploadedAt,
    loggedAt:   new Date().toISOString()
  };

  console.log('[LogActivity] Activity logged:', JSON.stringify(log));
});