const db = require('../config/db');
const schoolStatsService = require('./schoolStatsService');

/**
 * Update user statistics after an attempt is completed
 */
async function updateUserStatsAfterAttempt(userId, attemptData) {
  try {
    console.log(`[DEBUG] updateUserStatsAfterAttempt - Updating stats for user ${userId}:`, attemptData);
    
    const {
      score,
      totalQuestions,
      correctAnswers,
      timeMinutes,
      isNewQuiz = false
    } = attemptData;
    
    // Get current stats
    const currentStats = await db.query(
      'SELECT * FROM user_stats WHERE user_id = $1',
      [userId]
    );
    
    if (currentStats.rows.length === 0) {
      // Create new stats record
      await db.query(`
        INSERT INTO user_stats (
          user_id, total_quizzes_taken, total_attempts, total_questions_attempted,
          total_questions_answered, total_questions_correct, average_score, best_score,
          worst_score, total_time_minutes, average_time_per_quiz, completed_attempts,
          first_attempt_at, last_attempt_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
        )
      `, [
        userId,
        isNewQuiz ? 1 : 0, // total_quizzes_taken
        1, // total_attempts
        totalQuestions, // total_questions_attempted
        totalQuestions, // total_questions_answered (assuming all questions were attempted)
        correctAnswers, // total_questions_correct
        score, // average_score
        score, // best_score
        score, // worst_score
        timeMinutes, // total_time_minutes
        timeMinutes, // average_time_per_quiz
        1, // completed_attempts
        'NOW()', // first_attempt_at
        'NOW()'  // last_attempt_at
      ]);
    } else {
      // Update existing stats
      const stats = currentStats.rows[0];
      
      const newTotalAttempts = stats.total_attempts + 1;
      const newTotalQuizzes = isNewQuiz ? stats.total_quizzes_taken + 1 : stats.total_quizzes_taken;
      const newTotalQuestionsAttempted = stats.total_questions_attempted + totalQuestions;
      const newTotalQuestionsAnswered = stats.total_questions_answered + totalQuestions;
      const newTotalQuestionsCorrect = stats.total_questions_correct + correctAnswers;
      const newTotalTime = stats.total_time_minutes + timeMinutes;
      
      // Calculate new averages
      const newAverageScore = ((stats.average_score * stats.total_attempts) + score) / newTotalAttempts;
      const newAverageTime = newTotalTime / newTotalAttempts;
      
      // Update best/worst scores
      const newBestScore = Math.max(stats.best_score, score);
      const newWorstScore = Math.min(stats.worst_score, score);
      
      await db.query(`
        UPDATE user_stats SET
          total_quizzes_taken = $2,
          total_attempts = $3,
          total_questions_attempted = $4,
          total_questions_answered = $5,
          total_questions_correct = $6,
          average_score = $7,
          best_score = $8,
          worst_score = $9,
          total_time_minutes = $10,
          average_time_per_quiz = $11,
          completed_attempts = $12,
          last_attempt_at = NOW(),
          updated_at = NOW()
        WHERE user_id = $1
      `, [
        userId,
        newTotalQuizzes,
        newTotalAttempts,
        newTotalQuestionsAttempted,
        newTotalQuestionsAnswered,
        newTotalQuestionsCorrect,
        newAverageScore,
        newBestScore,
        newWorstScore,
        newTotalTime,
        newAverageTime,
        stats.completed_attempts + 1
      ]);
    }
    
    console.log(`[DEBUG] updateUserStatsAfterAttempt - Stats updated successfully for user ${userId}`);
    
    // Update school stats as well
    try {
      const user = await db.query('SELECT school FROM users WHERE id = $1', [userId]);
      if (user.rows.length > 0 && user.rows[0].school) {
        await schoolStatsService.updateSchoolStats(user.rows[0].school, {});
        console.log(`[DEBUG] updateUserStatsAfterAttempt - School stats updated for ${user.rows[0].school}`);
      }
    } catch (schoolError) {
      console.error(`[ERROR] updateUserStatsAfterAttempt - Failed to update school stats:`, schoolError);
      // Don't fail the main operation if school stats update fails
    }
    
  } catch (error) {
    console.error(`[ERROR] updateUserStatsAfterAttempt - Failed to update stats for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get user statistics from the pre-calculated table
 */
async function getUserStats(userId) {
  try {
    const result = await db.query(
      'SELECT * FROM user_stats WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Return default stats if no record exists
      return {
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
        completed_attempts: 0,
        in_progress_attempts: 0,
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
      success_rate: Math.round(successRate * 100) / 100 // Round to 2 decimal places
    };
    
  } catch (error) {
    console.error(`[ERROR] getUserStats - Failed to get stats for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Initialize user stats for existing users (migration function)
 */
async function initializeUserStats() {
  try {
    console.log('Initializing user stats for existing users...');
    
    // Get all students who have attempts but no stats
    const usersWithoutStats = await db.query(`
      SELECT DISTINCT u.id, u.name
      FROM users u
      LEFT JOIN user_stats us ON us.user_id = u.id
      WHERE u.role = 'student' AND us.user_id IS NULL
    `);
    
    console.log(`Found ${usersWithoutStats.rows.length} users without stats`);
    
    for (const user of usersWithoutStats.rows) {
      // Get all attempts for this user
      const attempts = await db.query(`
        SELECT 
          a.id,
          a.quiz_id,
          a.score,
          a.status,
          a.started_at,
          a.finished_at,
          COUNT(qq.question_id) as total_questions,
          EXTRACT(EPOCH FROM (a.finished_at - a.started_at))/60 as time_minutes
        FROM attempts a
        JOIN quizzes q ON q.id = a.quiz_id
        JOIN quiz_questions qq ON qq.quiz_id = q.id
        WHERE a.student_id = $1 AND a.status = 'completed'
        GROUP BY a.id, a.quiz_id, a.score, a.status, a.started_at, a.finished_at
        ORDER BY a.finished_at
      `, [user.id]);
      
      if (attempts.rows.length > 0) {
        // Calculate stats from attempts
        let totalQuizzes = 0;
        let totalAttempts = 0;
        let totalQuestions = 0;
        let totalCorrect = 0;
        let totalTime = 0;
        let bestScore = 0;
        let worstScore = 100;
        let firstAttempt = null;
        let lastAttempt = null;
        const quizIds = new Set();
        
        for (const attempt of attempts.rows) {
          if (!quizIds.has(attempt.quiz_id)) {
            quizIds.add(attempt.quiz_id);
            totalQuizzes++;
          }
          
          totalAttempts++;
          totalQuestions += parseInt(attempt.total_questions);
          totalCorrect += Math.round((attempt.score / 100) * attempt.total_questions);
          totalTime += parseFloat(attempt.time_minutes) || 0;
          bestScore = Math.max(bestScore, attempt.score);
          worstScore = Math.min(worstScore, attempt.score);
          
          if (!firstAttempt) firstAttempt = attempt.finished_at;
          lastAttempt = attempt.finished_at;
        }
        
        const averageScore = totalAttempts > 0 ? totalAttempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts : 0;
        const averageTime = totalAttempts > 0 ? totalTime / totalAttempts : 0;
        
        // Insert stats
        await db.query(`
          INSERT INTO user_stats (
            user_id, total_quizzes_taken, total_attempts, total_questions_attempted,
            total_questions_answered, total_questions_correct, average_score, best_score,
            worst_score, total_time_minutes, average_time_per_quiz, completed_attempts,
            first_attempt_at, last_attempt_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
          )
        `, [
          user.id,
          totalQuizzes,
          totalAttempts,
          totalQuestions,
          totalQuestions,
          totalCorrect,
          averageScore,
          bestScore,
          worstScore,
          totalTime,
          averageTime,
          totalAttempts,
          firstAttempt,
          lastAttempt
        ]);
        
        console.log(`✅ Initialized stats for user ${user.name} (${user.id})`);
      }
    }
    
    console.log('✅ User stats initialization completed');
    
  } catch (error) {
    console.error('❌ Error initializing user stats:', error);
    throw error;
  }
}

module.exports = {
  updateUserStatsAfterAttempt,
  getUserStats,
  initializeUserStats
};
