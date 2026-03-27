const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendEmail = async (event) => {
  try {
    const data = JSON.parse(
      Buffer.from(event.data, 'base64').toString()
    );

    console.log('Received:', data);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: data.userEmail,
      subject: 'File Uploaded Successfully.',

      // ✅ PROFESSIONAL HTML TEMPLATE
      html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">

          <!-- Header -->
          <h2 style="color: #4CAF50; text-align: center; margin-bottom: 20px;">
            File Upload Successful
          </h2>

          <!-- Greeting -->
          <p style="font-size: 16px;">
            Hi <strong>${data.userName || 'User'}</strong>,
          </p>

          <!-- Message -->
          <p style="color: #555; font-size: 14px;">
            Your file has been uploaded successfully. Below are the details:
          </p>

          <!-- File Details Box -->
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>File Name:</strong> ${data.fileName}</p>
            <p style="margin: 5px 0;"><strong>Uploaded At:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <!-- CTA Message -->
          <p style="font-size: 14px; color: #333;">
            You can now access your file from the application dashboard.
          </p>

          <!-- Divider -->
          <hr style="margin: 20px 0;" />

          <!-- Footer -->
          <p style="font-size: 12px; color: #888; text-align: center;">
            This is an automated message from <b>Capstone Application</b>.
          </p>

        </div>
      </div>
      `
    });

    console.log('Email sent ✅');

  } catch (error) {
    console.error('Error sending email:', error);
  }
};
