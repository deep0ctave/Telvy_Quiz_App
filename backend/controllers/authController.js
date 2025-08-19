// src/controllers/authController.js
require('dotenv').config();
const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const jwtUtils = require('../config/jwt');
const crypto = require('crypto');
const { createAndSendOTP, generateOTP, sendOTP } = require('../utils/otp');

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS || '7', 10);

// ---------- Helpers ----------
function generateAccessToken(user) {
  return jwtUtils.sign({ 
    id: parseInt(user.id, 10), // Ensure ID is a number
    role: user.role, 
    username: user.username 
  });
}

// refresh token as a random opaque string (safer to store in DB)
function makeRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

// helper: clear expired refresh tokens for user (small maintenance)
async function clearExpiredRefreshTokensForUser(userId) {
  await db.query(`DELETE FROM refresh_tokens WHERE user_id=$1 AND expires_at <= NOW()`, [userId]);
}

// ---------- REGISTER (store payload in otps) ----------
async function register(req, res, next) {
  try {
    const { role, name, username, dob, email, gender, school, class: className, section, password, phone } = req.body;

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'role_must_be_student_or_teacher' });
    }

    // check duplicates in users table
    const dupCheck = await db.query(
      `SELECT 1 FROM users WHERE username=$1 OR email=$2 OR phone=$3`,
      [username, email, phone]
    );
    if (dupCheck.rowCount > 0) {
      return res.status(409).json({ error: 'user_already_exists' });
    }

    const pwHash = await hashPassword(password);
    const payload = {
      role, name, username, dob, email, gender,
      school, class: className, section,
      password_hash: pwHash, phone
    };

    await createAndSendOTP({
      userId: null,
      phone,
      purpose: 'register',
      payload
    });

    return res.json({ message: 'otp_sent_for_registration' });
  } catch (err) {
    next(err);
  }
}

// ---------- REQUEST / RESEND OTP ----------
async function requestOTP(req, res, next) {
  try {
    const { phone, purpose } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone_required' });

    const finalPurpose = purpose || 'register';

    if (finalPurpose === 'register') {
      // find latest pending registration
      const pending = await db.query(`
        SELECT id, payload FROM otps
        WHERE purpose='register' AND verified=false AND payload->>'phone' = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [phone]);

      if (pending.rowCount === 0) {
        return res.status(404).json({ error: 'pending_registration_not_found' });
      }

      const payload = pending.rows[0].payload;

      // invalidate old otp
      await db.query(`UPDATE otps SET verified=true WHERE id=$1`, [pending.rows[0].id]);

      // create new one with same payload
      await createAndSendOTP({
        userId: null,
        phone,
        purpose: 'register',
        payload // keep original payload
      });

      return res.json({ message: 'otp_resent' });
    }

    // non-register flows
    const user = await db.query(`SELECT id, phone FROM users WHERE phone=$1`, [phone]);
    if (user.rowCount === 0) return res.status(404).json({ error: 'user_not_found' });

    const userId = user.rows[0].id;

    // invalidate old otps for same purpose
    await db.query(
      `UPDATE otps SET verified=true WHERE user_id=$1 AND purpose=$2 AND verified=false`,
      [userId, finalPurpose]
    );

    await createAndSendOTP({
      userId,
      phone,
      purpose: finalPurpose,
      payload: null
    });

    return res.json({ message: 'otp_sent' });
  } catch (err) {
    next(err);
  }
}

// ---------- VERIFY OTP ----------
async function verifyOTP(req, res, next) {
  try {
    const { phone, otp, purpose } = req.body;
    const finalPurpose = purpose || 'register';

    let record;
    if (finalPurpose === 'register') {
      record = await db.query(`
        SELECT *
        FROM otps
        WHERE purpose='register'
          AND verified=false
          AND otp=$1
          AND payload->>'phone' = $2
        ORDER BY created_at DESC
        LIMIT 1
      `, [otp, phone]);
    } else {
      record = await db.query(`
        SELECT o.*
        FROM otps o
        JOIN users u ON o.user_id = u.id
        WHERE o.purpose=$1
          AND o.otp=$2
          AND u.phone=$3
          AND o.verified=false
        ORDER BY o.created_at DESC
        LIMIT 1
      `, [finalPurpose, otp, phone]);
    }

    if (record.rowCount === 0) {
      return res.status(400).json({ error: 'invalid_or_expired_otp' });
    }

    const otpRow = record.rows[0];
    if (new Date() > new Date(otpRow.otp_expires_at)) {
      return res.status(400).json({ error: 'otp_expired' });
    }

    if (finalPurpose === 'register') {
      const data = otpRow.payload;
      if (!data) return res.status(500).json({ error: 'registration_payload_missing' });

      const ins = await db.query(`
        INSERT INTO users 
          (role, name, username, dob, email, gender, school, class, section, password_hash, phone, verification_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)
        RETURNING id
      `, [
        data.role, data.name, data.username, data.dob, data.email, data.gender,
        data.school, data.class, data.section, data.password_hash, data.phone
      ]);

      // invalidate all old OTPs for same phone/purpose
      await db.query(
        `UPDATE otps 
         SET verified=true, user_id=$1 
         WHERE purpose='register' AND payload->>'phone'=$2 AND verified=false`,
        [ins.rows[0].id, phone]
      );

      return res.json({ message: 'user_verified_and_registered', user_id: ins.rows[0].id });
    }

    // other purposes
    await db.query(
      `UPDATE otps SET verified=true WHERE user_id=$1 AND purpose=$2 AND verified=false`,
      [otpRow.user_id, finalPurpose]
    );

    return res.json({ message: 'otp_verified' });
  } catch (err) {
    next(err);
  }
}


// ---------- LOGIN (access + refresh token, single login enforcement) ----------

async function login(req, res, next) {
  try {
    const { phone, username, password, forceLogin } = req.body;

    if (!phone && !username) {
      return res.status(400).json({ error: 'phone_or_username_required' });
    }

    // Fetch user by phone OR username
    const userQ = phone
      ? await db.query(`SELECT * FROM users WHERE phone=$1`, [phone])
      : await db.query(`SELECT * FROM users WHERE username=$1`, [username]);

    if (userQ.rowCount === 0) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    const user = userQ.rows[0];

    // Validate password
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    // Clean expired tokens
    await db.query(`DELETE FROM refresh_tokens WHERE user_id=$1 AND expires_at <= NOW()`, [user.id]);

    // Check for existing active session
    const existing = await db.query(
      `SELECT id FROM refresh_tokens WHERE user_id=$1 AND expires_at > NOW()`,
      [user.id]
    );
    if (existing.rowCount > 0 && !forceLogin) {
      return res.status(409).json({ error: 'active_session_exists' });
    }

    // If forceLogin, remove all old tokens
    if (forceLogin) {
      await db.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [user.id]);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user); // JWT with id, role, username
    const refreshToken = makeRefreshToken(); // Secure random string
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    // Store refresh token in DB
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, NOW())`,
      [user.id, refreshToken, expiresAt]
    );

    // Set refresh token cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
    });

    // Send access token to client
    return res.json({ 
      accessToken,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        verification_status: user.verification_status,
        user_state: user.user_state,
        created_at: user.created_at
      }
    });
  } catch (err) {
    next(err);
  }
}

// ---------- REFRESH (rotate refresh token) ----------
async function refreshToken(req, res, next) {
  console.log('Refresh token called');
  console.log('Cookies:', req.cookies);
  try {
    const cookieToken = req.cookies && req.cookies.refresh_token;
    console.log('Cookie token:', cookieToken);
    if (!cookieToken) return res.status(401).json({ error: 'no_refresh_token' });

    // find stored token row
    const storedQ = await db.query(`SELECT * FROM refresh_tokens WHERE token=$1`, [cookieToken]);
    if (storedQ.rows.length === 0) return res.status(401).json({ error: 'invalid_refresh_token' });

    const stored = storedQ.rows[0];
    if (new Date(stored.expires_at) <= new Date()) {
      // expired: remove and reject
      await db.query(`DELETE FROM refresh_tokens WHERE id=$1`, [stored.id]);
      res.clearCookie('refresh_token');
      return res.status(401).json({ error: 'refresh_token_expired' });
    }

    // load user
    const userQ = await db.query(`SELECT id, role, username FROM users WHERE id=$1`, [stored.user_id]);
    if (userQ.rows.length === 0) {
      await db.query(`DELETE FROM refresh_tokens WHERE id=$1`, [stored.id]);
      res.clearCookie('refresh_token');
      return res.status(404).json({ error: 'user_not_found' });
    }
    const user = userQ.rows[0];

    // rotate refresh token for safety
    const newRefreshToken = makeRefreshToken();
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    // replace DB row (transaction would be better in prod)
    await db.query(`UPDATE refresh_tokens SET token=$1, expires_at=$2, created_at=NOW() WHERE id=$3`, [newRefreshToken, newExpiresAt, stored.id]);

    // set cookie to new value
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
    });

    // issue fresh access token
    const accessToken = generateAccessToken(user);
    return res.json({ 
      accessToken,
      user: {
        id: user.id,
        role: user.role,
        username: user.username
      }
    });
  } catch (err) {
    next(err);
  }
}

// ---------- LOGOUT ----------
async function logout(req, res, next) {
  try {
    const cookieToken = req.cookies && req.cookies.refresh_token;
    if (cookieToken) {
      await db.query(`DELETE FROM refresh_tokens WHERE token=$1`, [cookieToken]);
    }
    res.clearCookie('refresh_token');
    return res.json({ message: 'logged_out' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, requestOTP, verifyOTP, login, refreshToken, logout };
