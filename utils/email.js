const nodemailer = require('nodemailer');
const randToken = require('rand-token');
const db = require('../models');
const { Token } = db;

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3360';


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bookloopesmad@gmail.com',
        pass: 'irrj bvps vajy lizy'
    }
});

const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: 'bookloopesmad@gmail.com',
    to,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw new Error('Error sending email');
  }
};

const sendVerificationEmail = async (user, transaction) => {
    const token = randToken.generate(20);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour
  
    await Token.create({
      tokenKey: token,
      userId: user.userId,
      tokenType: 'emailConfirmation',
      expiresAt
    }, { transaction }); // Include transaction here
  
    const html = `<p>Please verify your email by clicking <a href="${API_BASE_URL}/users/verify-email?token=${token}">here</a>.</p>`;
    await sendEmail(user.email, 'Email Verification', html);
  };
  

const sendPasswordResetEmail = async (user) => {
  const token = randToken.generate(20);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

  await Token.create({
    tokenKey: token,
    userId: user.id,
    tokenType: 'passwordReset',
    expiresAt
  });

  const html = `<p>Reset your password by clicking <a href="${API_BASE_URL}/users/reset-password?token=${token}">here</a>.</p>`;
  await sendEmail(user.email, 'Password Reset', html);
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
