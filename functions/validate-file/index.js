const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('validateFile', (cloudEvent) => {
  const message = cloudEvent.data.message;
  const data = message.data
    ? JSON.parse(Buffer.from(message.data, 'base64').toString())
    : {};

  console.log('[ValidateFile] Received event:', JSON.stringify(data));

  const allowedTypes = ['.pdf', '.docx'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const fileName = data.fileName || '';
  const fileSize = data.fileSize || 0;
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

  if (!allowedTypes.includes(ext)) {
    console.error(`[ValidateFile] INVALID type: ${fileName}`);
    return;
  }

  if (fileSize > maxSize) {
    console.error(`[ValidateFile] INVALID size: ${fileSize} bytes`);
    return;
  }

  console.log(`[ValidateFile] VALID file: ${fileName} (${fileSize} bytes)`);
});