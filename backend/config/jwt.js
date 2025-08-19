// src/config/jwt.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verify(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Session management functions
 */
async function createSession(userId, token, ip = null, ua = null, forceLogin = false) {
  if (forceLogin) {
    await db.query(`UPDATE sessions SET valid=false WHERE user_id=$1`, [userId]);
  } else {
    const existing = await db.query(`SELECT id FROM sessions WHERE user_id=$1 AND valid=true`, [userId]);
    if (existing.rows.length > 0) {
      return { error: 'active_session_exists' };
    }
  }
  const ins = await db.query(`INSERT INTO sessions (user_id, jwt_token, ip, user_agent) VALUES ($1,$2,$3,$4) RETURNING id`, [userId, token, ip, ua]);
  return { token, session_id: ins.rows[0].id };
}

async function invalidateSessionByToken(token) {
  await db.query(`UPDATE sessions SET valid=false WHERE jwt_token=$1`, [token]);
}

module.exports = { sign, verify, createSession, invalidateSessionByToken };
