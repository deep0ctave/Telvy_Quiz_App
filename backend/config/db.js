// src/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';

// Debug environment variables
console.log('Database Config Debug:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]');
console.log('DB_SSL:', sslEnabled);

// Validate required environment variables
const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

// Ensure password is a string
const password = String(process.env.DB_PASSWORD || '');

// Alternative: Use connection string if provided
const connectionString = process.env.DATABASE_URL;

const pool = connectionString 
  ? new Pool({
      connectionString: connectionString,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false
    });

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = pool;

