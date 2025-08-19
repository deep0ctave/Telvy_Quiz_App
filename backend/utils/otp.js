require('dotenv').config();
const db = require('../config/db');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

async function createAndSendOTP({ userId = null, phone = null, purpose, payload = null }) {
  const otp = generateOTP();
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
  const otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await db.query(
    `INSERT INTO otps (user_id, phone, purpose, otp, otp_expires_at, payload, verified)
     VALUES ($1, $2, $3, $4, $5, $6, false)`,
    [userId, phone, purpose, otp, otpExpiresAt, payload ? JSON.stringify(payload) : null]
  );

  // Simulate sending OTP
  console.log(`[SIMULATED OTP] phone=${phone || 'n/a'} user=${userId || 'n/a'} purpose=${purpose} otp=${otp} (expires ${otpExpiresAt.toISOString()})`);

  return otp;
}

module.exports = { generateOTP, createAndSendOTP };
