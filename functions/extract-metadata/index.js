const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('extractMetadata', (cloudEvent) => {
  const message = cloudEvent.data.message;
  const data = message.data
    ? JSON.parse(Buffer.from(message.data, 'base64').toString())
    : {};

  console.log('[ExtractMetadata] Received event:', JSON.stringify(data));

  const metadata = {
    fileName:   data.fileName,
    fileSize:   data.fileSize,
    uploadedAt: data.uploadedAt,
    storagePath: data.filePath,
    extractedAt: new Date().toISOString()
  };

  console.log('[ExtractMetadata] Metadata extracted:', JSON.stringify(metadata));
});