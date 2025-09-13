// src/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false
});

module.exports = pool;

