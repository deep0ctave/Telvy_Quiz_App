const db = require('../config/db');
const userStatsService = require('../services/userStatsService');
const schoolStatsService = require('../services/schoolStatsService');

async function populateUserStats() {
  try {
    console.log('Starting user stats population...');
    
    // First, create the table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Overall statistics
        total_quizzes_taken INTEGER DEFAULT 0,
        total_attempts INTEGER DEFAULT 0,
        total_questions_attempted INTEGER DEFAULT 0,
        total_questions_answered INTEGER DEFAULT 0,
        total_questions_correct INTEGER DEFAULT 0,
        
        -- Score statistics
        average_score DECIMAL(5,2) DEFAULT 0.00,
        best_score DECIMAL(5,2) DEFAULT 0.00,
        worst_score DECIMAL(5,2) DEFAULT 100.00,
        
        -- Time statistics
        total_time_minutes DECIMAL(10,2) DEFAULT 0.00,
        average_time_per_quiz DECIMAL(8,2) DEFAULT 0.00,
        
        -- Status counts
        completed_attempts INTEGER DEFAULT 0,
        in_progress_attempts INTEGER DEFAULT 0,
        
        -- Timestamps
        first_attempt_at TIMESTAMP,
        last_attempt_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(user_id)
      )
    `);
    
    console.log('✅ User stats table created/verified');
    
    // Initialize stats for all existing users
    await userStatsService.initializeUserStats();
    
    // Initialize school stats
    await schoolStatsService.initializeSchoolStats();
    
    console.log('✅ User and school stats population completed successfully');
    
  } catch (error) {
    console.error('❌ Error populating user stats:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  populateUserStats()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = populateUserStats;
