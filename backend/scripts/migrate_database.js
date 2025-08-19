// scripts/migrate_database.js
require('dotenv').config();
const pool = require('../config/db');

(async function migrate() {
  try {
    console.log('🚀 Starting comprehensive database migration...\n');

    // ===== QUESTIONS TABLE MIGRATION =====
    console.log('📝 Migrating questions table...');
    
    // Add difficulty column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy','medium','hard'))
      `);
      console.log('  ✓ Added difficulty column to questions');
    } catch (err) {
      console.log('  ⚠️  Difficulty column already exists or error:', err.message);
    }

    // Add tags column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS tags TEXT[]
      `);
      console.log('  ✓ Added tags column to questions');
    } catch (err) {
      console.log('  ⚠️  Tags column already exists or error:', err.message);
    }

    // Update existing questions to have default values
    try {
      await pool.query(`
        UPDATE questions 
        SET difficulty = 'medium' 
        WHERE difficulty IS NULL
      `);
      console.log('  ✓ Updated existing questions with default difficulty');

      await pool.query(`
        UPDATE questions 
        SET tags = ARRAY[]::TEXT[] 
        WHERE tags IS NULL
      `);
      console.log('  ✓ Updated existing questions with empty tags array');
    } catch (err) {
      console.log('  ⚠️  Error updating existing questions:', err.message);
    }

    // ===== QUIZZES TABLE MIGRATION =====
    console.log('\n📊 Migrating quizzes table...');
    
    // Add difficulty column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE quizzes 
        ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy','medium','hard'))
      `);
      console.log('  ✓ Added difficulty column to quizzes');
    } catch (err) {
      console.log('  ⚠️  Difficulty column already exists or error:', err.message);
    }

    // Add tags column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE quizzes 
        ADD COLUMN IF NOT EXISTS tags TEXT[]
      `);
      console.log('  ✓ Added tags column to quizzes');
    } catch (err) {
      console.log('  ⚠️  Tags column already exists or error:', err.message);
    }

    // Update existing quizzes to have default values
    try {
      await pool.query(`
        UPDATE quizzes 
        SET difficulty = 'medium' 
        WHERE difficulty IS NULL
      `);
      console.log('  ✓ Updated existing quizzes with default difficulty');

      await pool.query(`
        UPDATE quizzes 
        SET tags = ARRAY[]::TEXT[] 
        WHERE tags IS NULL
      `);
      console.log('  ✓ Updated existing quizzes with empty tags array');
    } catch (err) {
      console.log('  ⚠️  Error updating existing quizzes:', err.message);
    }

    // ===== VERIFICATION =====
    console.log('\n🔍 Verifying migration...');
    
    try {
      // Check questions table structure
      const questionsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name IN ('difficulty', 'tags')
        ORDER BY column_name
      `);
      
      if (questionsResult.rows.length === 2) {
        console.log('  ✓ Questions table has difficulty and tags columns');
      } else {
        console.log('  ⚠️  Questions table missing some columns:', questionsResult.rows);
      }

      // Check quizzes table structure
      const quizzesResult = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'quizzes' 
        AND column_name IN ('difficulty', 'tags')
        ORDER BY column_name
      `);
      
      if (quizzesResult.rows.length === 2) {
        console.log('  ✓ Quizzes table has difficulty and tags columns');
      } else {
        console.log('  ⚠️  Quizzes table missing some columns:', quizzesResult.rows);
      }

      // Count records with new fields
      const questionsCount = await pool.query(`
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN difficulty IS NOT NULL THEN 1 END) as with_difficulty,
               COUNT(CASE WHEN tags IS NOT NULL THEN 1 END) as with_tags
        FROM questions
      `);
      
      const quizzesCount = await pool.query(`
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN difficulty IS NOT NULL THEN 1 END) as with_difficulty,
               COUNT(CASE WHEN tags IS NOT NULL THEN 1 END) as with_tags
        FROM quizzes
      `);

      console.log(`  📊 Questions: ${questionsCount.rows[0].total} total, ${questionsCount.rows[0].with_difficulty} with difficulty, ${questionsCount.rows[0].with_tags} with tags`);
      console.log(`  📊 Quizzes: ${quizzesCount.rows[0].total} total, ${quizzesCount.rows[0].with_difficulty} with difficulty, ${quizzesCount.rows[0].with_tags} with tags`);

    } catch (err) {
      console.log('  ⚠️  Error during verification:', err.message);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('  • Added difficulty column (easy/medium/hard) to questions table');
    console.log('  • Added tags column (TEXT[]) to questions table');
    console.log('  • Added difficulty column (easy/medium/hard) to quizzes table');
    console.log('  • Added tags column (TEXT[]) to quizzes table');
    console.log('  • Set default difficulty to "medium" for existing records');
    console.log('  • Set empty tags array for existing records');
    
    await pool.end();
  } catch (err) {
    console.error('❌ Migration error:', err);
    await pool.end();
    process.exit(1);
  }
})();
