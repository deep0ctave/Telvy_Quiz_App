// src/controllers/studentController.js
const db = require('../config/db');
const userStatsService = require('../services/userStatsService');
const schoolStatsService = require('../services/schoolStatsService');

/**
 * Get active assignments for logged-in student
 */
async function myAssignments(req, res, next) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const rows = await db.query(`
      SELECT 
        a.id,
        a.quiz_id,
        q.title,
        a.assigned_at,
        a.due_at,
        COUNT(qq.question_id) AS total_marks
      FROM assignments a
      JOIN quizzes q ON q.id = a.quiz_id
      LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
      WHERE a.student_id = $1 
        AND a.status = 'assigned'
      GROUP BY a.id, a.quiz_id, q.title, a.assigned_at, a.due_at
      ORDER BY a.assigned_at DESC
    `, [req.user.id]);

    res.json(rows.rows);
  } catch (err) {
    next(err);
  }
}



/**
 * Preview a quiz if assigned
 */
async function previewQuiz(req, res, next) {
  try {
    const quizId = parseInt(req.params.id, 10);
    const check = await db.query(
      `SELECT 1 FROM assignments
       WHERE quiz_id = $1 AND student_id = $2 AND status = 'assigned'`,
      [quizId, req.user.id]
    );
    if (!check.rows.length) {
      return res.status(403).json({ error: 'quiz_not_assigned' });
    }

    const quiz = await db.query(
      `SELECT id, title, description, total_marks
       FROM quizzes
       WHERE id = $1`,
      [quizId]
    );
    if (!quiz.rows.length) return res.status(404).json({ error: 'quiz_not_found' });

    res.json(quiz.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * List all attempts by logged-in student
 */
async function myAttempts(req, res, next) {
  try {
    const rows = await db.query(
      `SELECT a.id as attempt_id, a.quiz_id, q.title, a.status, a.score, a.started_at, a.finished_at
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.student_id = $1
       ORDER BY a.started_at DESC`,
      [req.user.id]
    );
    res.json(rows.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Get results for a specific quiz
 */
async function myResults(req, res, next) {
  try {
    const quizId = parseInt(req.params.quizId, 10);
    const rows = await db.query(
      `SELECT a.id as attempt_id, a.score, a.status, a.finished_at, a.state
       FROM attempts a
       WHERE a.quiz_id = $1 AND a.student_id = $2
       ORDER BY a.finished_at DESC`,
      [quizId, req.user.id]
    );
    if (!rows.rows.length) {
      return res.status(404).json({ error: 'no_attempts_found' });
    }
    res.json(rows.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Get comprehensive student statistics
 */
async function getStats(req, res, next) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const studentId = req.user.id;

    // Get pre-calculated stats from user_stats table
    const stats = await userStatsService.getUserStats(studentId);

    // Get additional dynamic data for charts
    const recentPerformance = await db.query(`
      SELECT 
        DATE(a.finished_at) as date,
        COUNT(*) as attempts,
        AVG(a.score) as avg_score,
        MAX(a.score) as best_score
      FROM attempts a
      WHERE a.student_id = $1 
        AND a.status = 'completed' 
        AND a.finished_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(a.finished_at)
      ORDER BY date DESC
    `, [studentId]);

    const quizPerformance = await db.query(`
      SELECT 
        q.id,
        q.title,
        COUNT(a.id) as attempts,
        AVG(a.score) as avg_score,
        MAX(a.score) as best_score,
        MIN(a.score) as worst_score,
        MAX(a.finished_at) as last_attempt
      FROM attempts a
      JOIN quizzes q ON q.id = a.quiz_id
      WHERE a.student_id = $1 AND a.status = 'completed'
      GROUP BY q.id, q.title
      ORDER BY last_attempt DESC
      LIMIT 10
    `, [studentId]);

    const difficultyStats = await db.query(`
      SELECT 
        q.difficulty,
        COUNT(a.id) as attempts,
        AVG(a.score) as avg_score,
        MAX(a.score) as best_score
      FROM attempts a
      JOIN quizzes q ON q.id = a.quiz_id
      WHERE a.student_id = $1 AND a.status = 'completed' AND q.difficulty IS NOT NULL
      GROUP BY q.difficulty
      ORDER BY q.difficulty
    `, [studentId]);

    const monthlyProgress = await db.query(`
      SELECT 
        TO_CHAR(a.finished_at, 'YYYY-MM') as month,
        COUNT(*) as attempts,
        AVG(a.score) as avg_score,
        COUNT(DISTINCT a.quiz_id) as unique_quizzes
      FROM attempts a
      WHERE a.student_id = $1 
        AND a.status = 'completed' 
        AND a.finished_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(a.finished_at, 'YYYY-MM')
      ORDER BY month DESC
    `, [studentId]);

    // Format the response using pre-calculated stats
    const response = {
      overall: {
        quizzes_taken: stats.total_quizzes_taken,
        total_attempts: stats.total_attempts,
        completed_attempts: stats.completed_attempts,
        in_progress_attempts: stats.in_progress_attempts,
        average_score: Math.round(stats.average_score * 100) / 100,
        best_score: Math.round(stats.best_score * 100) / 100,
        worst_score: Math.round(stats.worst_score * 100) / 100,
        success_rate: stats.success_rate
      },
      questions: {
        total_attempted: stats.total_questions_attempted,
        answered: stats.total_questions_answered,
        correct: stats.total_questions_correct
      },
      time: {
        avg_time_per_quiz: Math.round(stats.average_time_per_quiz * 10) / 10,
        max_time_per_quiz: 0, // Not stored in user_stats, could be added if needed
        min_time_per_quiz: 0  // Not stored in user_stats, could be added if needed
      },
      recent_performance: recentPerformance.rows.map(row => ({
        date: row.date,
        attempts: parseInt(row.attempts),
        avg_score: Math.round(parseFloat(row.avg_score || 0) * 100) / 100,
        best_score: Math.round(parseFloat(row.best_score || 0) * 100) / 100
      })),
      quiz_performance: quizPerformance.rows.map(row => ({
        quiz_id: row.id,
        title: row.title,
        attempts: parseInt(row.attempts),
        avg_score: Math.round(parseFloat(row.avg_score || 0) * 100) / 100,
        best_score: Math.round(parseFloat(row.best_score || 0) * 100) / 100,
        worst_score: Math.round(parseFloat(row.worst_score || 0) * 100) / 100,
        last_attempt: row.last_attempt
      })),
      difficulty_stats: difficultyStats.rows.map(row => ({
        difficulty: row.difficulty,
        attempts: parseInt(row.attempts),
        avg_score: Math.round(parseFloat(row.avg_score || 0) * 100) / 100,
        best_score: Math.round(parseFloat(row.best_score || 0) * 100) / 100
      })),
      monthly_progress: monthlyProgress.rows.map(row => ({
        month: row.month,
        attempts: parseInt(row.attempts),
        avg_score: Math.round(parseFloat(row.avg_score || 0) * 100) / 100,
        unique_quizzes: parseInt(row.unique_quizzes)
      }))
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * Get leaderboard data
 */
async function getLeaderboard(req, res, next) {
  try {
    const { range = 'all', limit = 50 } = req.query;
    const currentUserId = req.user?.id;

    let dateFilter = '';
    switch (range) {
      case 'daily':
        dateFilter = "AND a.finished_at >= CURRENT_DATE";
        break;
      case 'weekly':
        dateFilter = "AND a.finished_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'monthly':
        dateFilter = "AND a.finished_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'yearly':
        dateFilter = "AND a.finished_at >= CURRENT_DATE - INTERVAL '1 year'";
        break;
      default:
        dateFilter = '';
    }

    // Get leaderboard data
    const leaderboardQuery = `
      WITH user_stats AS (
        SELECT 
          u.id,
          u.name,
          u.username,
          u.school,
          u.class,
          u.section,
          COUNT(DISTINCT a.quiz_id) as quizzes_taken,
          COUNT(a.id) as total_attempts,
          COALESCE(AVG(a.score), 0) as average_score,
          COALESCE(MAX(a.score), 0) as best_score,
          COALESCE(AVG(EXTRACT(EPOCH FROM (a.finished_at - a.started_at))/60), 0) as avg_time_minutes
        FROM users u
        LEFT JOIN attempts a ON a.student_id = u.id 
          AND a.status = 'completed' 
          AND a.finished_at IS NOT NULL
          ${dateFilter}
        WHERE u.role = 'student' AND u.user_state = 'active'
        GROUP BY u.id, u.name, u.username, u.school, u.class, u.section
      )
      SELECT 
        id,
        name,
        username,
        school,
        class,
        section,
        quizzes_taken,
        total_attempts,
        ROUND(average_score::numeric, 2) as average_score,
        ROUND(best_score::numeric, 2) as best_score,
        ROUND(avg_time_minutes::numeric, 1) as avg_time_minutes,
        ROW_NUMBER() OVER (ORDER BY average_score DESC, best_score DESC, total_attempts DESC) as rank
      FROM user_stats
      ORDER BY average_score DESC, best_score DESC, total_attempts DESC
      LIMIT $1
    `;

    const leaderboard = await db.query(leaderboardQuery, [parseInt(limit)]);

    // Get current user's rank if logged in
    let currentUserRank = null;
    if (currentUserId) {
      const userRankQuery = `
        WITH user_stats AS (
          SELECT 
            u.id,
            u.name,
            u.username,
            u.school,
            u.class,
            u.section,
            COUNT(DISTINCT a.quiz_id) as quizzes_taken,
            COUNT(a.id) as total_attempts,
            COALESCE(AVG(a.score), 0) as average_score,
            COALESCE(MAX(a.score), 0) as best_score,
            COALESCE(AVG(EXTRACT(EPOCH FROM (a.finished_at - a.started_at))/60), 0) as avg_time_minutes
          FROM users u
          LEFT JOIN attempts a ON a.student_id = u.id 
            AND a.status = 'completed' 
            AND a.finished_at IS NOT NULL
            ${dateFilter}
          WHERE u.role = 'student' AND u.user_state = 'active'
          GROUP BY u.id, u.name, u.username, u.school, u.class, u.section
        ),
        ranked_users AS (
          SELECT 
            id,
            name,
            username,
            school,
            class,
            section,
            quizzes_taken,
            total_attempts,
            ROUND(average_score::numeric, 2) as average_score,
            ROUND(best_score::numeric, 2) as best_score,
            ROUND(avg_time_minutes::numeric, 1) as avg_time_minutes,
            ROW_NUMBER() OVER (ORDER BY average_score DESC, best_score DESC, total_attempts DESC) as rank
          FROM user_stats
        )
        SELECT * FROM ranked_users WHERE id = $1
      `;

      const userRankResult = await db.query(userRankQuery, [currentUserId]);
      if (userRankResult.rows.length > 0) {
        currentUserRank = userRankResult.rows[0];
      }
    }

    // Get top performers for different categories
    const topPerformersQuery = `
      WITH user_stats AS (
        SELECT 
          u.id,
          u.name,
          u.username,
          COUNT(DISTINCT a.quiz_id) as quizzes_taken,
          COUNT(a.id) as total_attempts,
          COALESCE(AVG(a.score), 0) as average_score,
          COALESCE(MAX(a.score), 0) as best_score
        FROM users u
        LEFT JOIN attempts a ON a.student_id = u.id 
          AND a.status = 'completed' 
          AND a.finished_at IS NOT NULL
          ${dateFilter}
        WHERE u.role = 'student' AND u.user_state = 'active'
        GROUP BY u.id, u.name, u.username
      )
      SELECT 
        'most_quizzes' as category,
        name,
        username,
        quizzes_taken as value
      FROM (
        SELECT name, username, quizzes_taken
        FROM user_stats
        ORDER BY quizzes_taken DESC
        LIMIT 1
      ) most_quizzes
      
      UNION ALL
      
      SELECT 
        'highest_avg' as category,
        name,
        username,
        average_score as value
      FROM (
        SELECT name, username, average_score
        FROM user_stats
        ORDER BY average_score DESC
        LIMIT 1
      ) highest_avg
      
      UNION ALL
      
      SELECT 
        'best_single' as category,
        name,
        username,
        best_score as value
      FROM (
        SELECT name, username, best_score
        FROM user_stats
        ORDER BY best_score DESC
        LIMIT 1
      ) best_single
    `;

    const topPerformers = await db.query(topPerformersQuery);

    // Get school leaderboard
    const schoolLeaderboard = await schoolStatsService.getSchoolLeaderboard(range, 20);

    res.json({
      leaderboard: leaderboard.rows.map(row => ({
        id: row.id,
        name: row.name,
        username: row.username,
        school: row.school,
        class: row.class,
        section: row.section,
        rank: parseInt(row.rank),
        quizzes_taken: parseInt(row.quizzes_taken),
        total_attempts: parseInt(row.total_attempts),
        average_score: parseFloat(row.average_score),
        best_score: parseFloat(row.best_score),
        avg_time_minutes: parseFloat(row.avg_time_minutes)
      })),
      school_leaderboard: schoolLeaderboard,
      current_user: currentUserRank ? {
        id: currentUserRank.id,
        name: currentUserRank.name,
        username: currentUserRank.username,
        school: currentUserRank.school,
        class: currentUserRank.class,
        section: currentUserRank.section,
        rank: parseInt(currentUserRank.rank),
        quizzes_taken: parseInt(currentUserRank.quizzes_taken),
        total_attempts: parseInt(currentUserRank.total_attempts),
        average_score: parseFloat(currentUserRank.average_score),
        best_score: parseFloat(currentUserRank.best_score),
        avg_time_minutes: parseFloat(currentUserRank.avg_time_minutes)
      } : null,
      top_performers: topPerformers.rows.reduce((acc, row) => {
        acc[row.category] = {
          name: row.name,
          username: row.username,
          value: parseFloat(row.value)
        };
        return acc;
      }, {}),
      range,
      total_participants: leaderboard.rows.length
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  myAssignments,
  previewQuiz,
  myAttempts,
  myResults,
  getStats,
  getLeaderboard
};
