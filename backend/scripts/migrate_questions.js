// scripts/migrate_questions.js
require('dotenv').config();
const pool = require('../config/db');

(async function migrate() {
  try {
    console.log('Starting questions table migration...');

    // Add difficulty column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy','medium','hard'))
      `);
      console.log('✓ Added difficulty column');
    } catch (err) {
      console.log('Difficulty column already exists or error:', err.message);
    }

    // Add tags column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS tags TEXT[]
      `);
      console.log('✓ Added tags column');
    } catch (err) {
      console.log('Tags column already exists or error:', err.message);
    }

    // Update existing questions to have default values
    await pool.query(`
      UPDATE questions 
      SET difficulty = 'medium' 
      WHERE difficulty IS NULL
    `);
    console.log('✓ Updated existing questions with default difficulty');

    await pool.query(`
      UPDATE questions 
      SET tags = ARRAY[]::TEXT[] 
      WHERE tags IS NULL
    `);
    console.log('✓ Updated existing questions with empty tags array');

    console.log('Migration completed successfully!');
    await pool.end();
  } catch (err) {
    console.error('Migration error:', err);
    await pool.end();
    process.exit(1);
  }
})();
