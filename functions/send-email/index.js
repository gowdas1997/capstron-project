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
      subject: 'File Uploaded Successfully',
      text: `Your file "${data.fileName}" uploaded successfully`
    });

    console.log('Email sent ✅');

  } catch (error) {
    console.error(error);
  }
};