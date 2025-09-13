const db = require('../config/db');

/**
 * Update school statistics when a user's stats change
 */
async function updateSchoolStats(schoolName, userStatsChange) {
  try {
    if (!schoolName) return;
    
    console.log(`[DEBUG] updateSchoolStats - Updating stats for school: ${schoolName}`);
    
    // Get current school stats
    const currentStats = await db.query(
      'SELECT * FROM school_stats WHERE school_name = $1',
      [schoolName]
    );
    
    if (currentStats.rows.length === 0) {
      // Create new school stats record
      await db.query(`
        INSERT INTO school_stats (
          school_name, total_students, active_students, total_quizzes_taken, 
          total_attempts, total_questions_attempted, total_questions_answered, 
          total_questions_correct, average_score, best_score, worst_score,
          total_time_minutes, average_time_per_quiz, first_attempt_at, last_attempt_at,
          created_at, updated_at
        ) VALUES (
          $1, 1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
        )
      `, [
        schoolName,
        userStatsChange.totalQuizzesTaken || 0,
        userStatsChange.totalAttempts || 0,
        userStatsChange.totalQuestionsAttempted || 0,
        userStatsChange.totalQuestionsAnswered || 0,
        userStatsChange.totalQuestionsCorrect || 0,
        userStatsChange.averageScore || 0,
        userStatsChange.bestScore || 0,
        userStatsChange.worstScore || 100,
        userStatsChange.totalTimeMinutes || 0,
        userStatsChange.averageTimePerQuiz || 0,
        userStatsChange.firstAttemptAt || null,
        userStatsChange.lastAttemptAt || null
      ]);
    } else {
      // Update existing school stats
      const stats = currentStats.rows[0];
      
      // Recalculate school stats from all students in the school
      const schoolUserStats = await db.query(`
        SELECT 
          COUNT(*) as total_students,
          COUNT(CASE WHEN total_attempts > 0 THEN 1 END) as active_students,
          SUM(total_quizzes_taken) as total_quizzes_taken,
          SUM(total_attempts) as total_attempts,
          SUM(total_questions_attempted) as total_questions_attempted,
          SUM(total_questions_answered) as total_questions_answered,
          SUM(total_questions_correct) as total_questions_correct,
          AVG(average_score) as average_score,
          MAX(best_score) as best_score,
          MIN(worst_score) as worst_score,
          SUM(total_time_minutes) as total_time_minutes,
          AVG(average_time_per_quiz) as average_time_per_quiz,
          MIN(first_attempt_at) as first_attempt_at,
          MAX(last_attempt_at) as last_attempt_at
        FROM user_stats us
        JOIN users u ON u.id = us.user_id
        WHERE u.school = $1 AND u.role = 'student'
      `, [schoolName]);
      
      const newStats = schoolUserStats.rows[0];
      
      await db.query(`
        UPDATE school_stats SET
          total_students = $2,
          active_students = $3,
          total_quizzes_taken = $4,
          total_attempts = $5,
          total_questions_attempted = $6,
          total_questions_answered = $7,
          total_questions_correct = $8,
          average_score = $9,
          best_score = $10,
          worst_score = $11,
          total_time_minutes = $12,
          average_time_per_quiz = $13,
          first_attempt_at = $14,
          last_attempt_at = $15,
          updated_at = NOW()
        WHERE school_name = $1
      `, [
        schoolName,
        parseInt(newStats.total_students || 0),
        parseInt(newStats.active_students || 0),
        parseInt(newStats.total_quizzes_taken || 0),
        parseInt(newStats.total_attempts || 0),
        parseInt(newStats.total_questions_attempted || 0),
        parseInt(newStats.total_questions_answered || 0),
        parseInt(newStats.total_questions_correct || 0),
        parseFloat(newStats.average_score || 0),
        parseFloat(newStats.best_score || 0),
        parseFloat(newStats.worst_score || 100),
        parseFloat(newStats.total_time_minutes || 0),
        parseFloat(newStats.average_time_per_quiz || 0),
        newStats.first_attempt_at,
        newStats.last_attempt_at
      ]);
    }
    
    console.log(`[DEBUG] updateSchoolStats - School stats updated successfully for ${schoolName}`);
    
  } catch (error) {
    console.error(`[ERROR] updateSchoolStats - Failed to update school stats for ${schoolName}:`, error);
    throw error;
  }
}

/**
 * Get school statistics
 */
async function getSchoolStats(schoolName) {
  try {
    const result = await db.query(
      'SELECT * FROM school_stats WHERE school_name = $1',
      [schoolName]
    );
    
    if (result.rows.length === 0) {
      return {
        school_name: schoolName,
        total_students: 0,
        active_students: 0,
        total_quizzes_taken: 0,
        total_attempts: 0,
        total_questions_attempted: 0,
        total_questions_answered: 0,
        total_questions_correct: 0,
        average_score: 0,
        best_score: 0,
        worst_score: 0,
        total_time_minutes: 0,
        average_time_per_quiz: 0,
        success_rate: 0
      };
    }
    
    const stats = result.rows[0];
    
    // Calculate success rate
    const successRate = stats.total_questions_answered > 0 
      ? (stats.total_questions_correct / stats.total_questions_answered) * 100 
      : 0;
    
    return {
      ...stats,
      success_rate: Math.round(successRate * 100) / 100
    };
    
  } catch (error) {
    console.error(`[ERROR] getSchoolStats - Failed to get school stats for ${schoolName}:`, error);
    throw error;
  }
}

/**
 * Get school leaderboard
 */
async function getSchoolLeaderboard(range = 'all', limit = 50) {
  try {
    let dateFilter = '';
    switch (range) {
      case 'daily':
        dateFilter = "AND ss.last_attempt_at >= CURRENT_DATE";
        break;
      case 'weekly':
        dateFilter = "AND ss.last_attempt_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'monthly':
        dateFilter = "AND ss.last_attempt_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'yearly':
        dateFilter = "AND ss.last_attempt_at >= CURRENT_DATE - INTERVAL '1 year'";
        break;
      default:
        dateFilter = '';
    }

    const leaderboardQuery = `
      SELECT 
        school_name,
        total_students,
        active_students,
        total_quizzes_taken,
        total_attempts,
        ROUND(average_score::numeric, 2) as average_score,
        ROUND(best_score::numeric, 2) as best_score,
        ROUND(total_time_minutes::numeric, 1) as total_time_minutes,
        ROUND(average_time_per_quiz::numeric, 1) as average_time_per_quiz,
        ROW_NUMBER() OVER (ORDER BY average_score DESC, total_students DESC) as rank
      FROM school_stats ss
      WHERE active_students > 0 ${dateFilter}
      ORDER BY average_score DESC, total_students DESC
      LIMIT $1
    `;

    const leaderboard = await db.query(leaderboardQuery, [parseInt(limit)]);

    return leaderboard.rows.map(row => ({
      school_name: row.school_name,
      total_students: row.total_students,
      active_students: row.active_students,
      total_quizzes_taken: row.total_quizzes_taken,
      total_attempts: row.total_attempts,
      average_score: row.average_score,
      best_score: row.best_score,
      total_time_minutes: row.total_time_minutes,
      average_time_per_quiz: row.average_time_per_quiz,
      rank: row.rank
    }));

  } catch (error) {
    console.error(`[ERROR] getSchoolLeaderboard - Failed to get school leaderboard:`, error);
    throw error;
  }
}

/**
 * Initialize school stats for existing schools
 */
async function initializeSchoolStats() {
  try {
    console.log('Initializing school stats for existing schools...');
    
    // Get all unique schools
    const schools = await db.query(`
      SELECT DISTINCT school 
      FROM users 
      WHERE role = 'student' AND school IS NOT NULL AND school != ''
    `);
    
    console.log(`Found ${schools.rows.length} schools`);
    
    for (const school of schools.rows) {
      await updateSchoolStats(school.school, {});
      console.log(`✅ Initialized stats for school: ${school.school}`);
    }
    
    console.log('✅ School stats initialization completed');
    
  } catch (error) {
    console.error('❌ Error initializing school stats:', error);
    throw error;
  }
}

module.exports = {
  updateSchoolStats,
  getSchoolStats,
  getSchoolLeaderboard,
  initializeSchoolStats
};
