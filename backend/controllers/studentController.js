// src/controllers/studentController.js
const db = require('../config/db');

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

module.exports = {
  myAssignments,
  previewQuiz,
  myAttempts,
  myResults
};
