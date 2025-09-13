const db = require('../config/db');

// Assign quizzes
async function assignQuizzes(req, res, next) {
  try {
    const { quiz_id, student_ids, due_at, scheduled_from, scheduled_till, shuffle_questions } = req.body;
    const assigned_by = req.user.id;

    // Validate input
    if (!quiz_id || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({
        error: "quiz_id and a non-empty student_ids array are required",
      });
    }

    // Ensure optional column exists for shuffle flag (idempotent)
    try {
      await db.query(`ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE`);
    } catch (_) {}

    let assignedCount = 0;
    let skipped = [];

    for (const sid of student_ids) {
      const result = await db.query(
        `
        INSERT INTO assignments (quiz_id, student_id, assigned_by, due_at, scheduled_from, scheduled_till, shuffle_questions)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (quiz_id, student_id, status) DO NOTHING
        RETURNING id
        `,
        [quiz_id, sid, assigned_by, due_at || null, scheduled_from || null, scheduled_till || null, !!shuffle_questions]
      );

      if (result.rows.length) {
        assignedCount++;
      } else {
        skipped.push(sid); // already assigned
      }
    }

    res.json({
      message: "assignment_complete",
      assigned_count: assignedCount,
      skipped,
    });
  } catch (err) {
    next(err);
  }
}


// Deassign a quiz
async function deassignQuiz(req, res, next) {
  try {
    const { assignment_id, quiz_id, student_id } = req.body;
    
    let result;
    if (assignment_id) {
      // Delete by assignment_id (preferred method)
      result = await db.query(
        `DELETE FROM assignments WHERE id = $1`,
        [assignment_id]
      );
    } else if (quiz_id && student_id) {
      // Delete by quiz_id and student_id (fallback)
      result = await db.query(
        `DELETE FROM assignments WHERE quiz_id = $1 AND student_id = $2`,
        [quiz_id, student_id]
      );
    } else {
      return res.status(400).json({
        error: 'Either assignment_id or both quiz_id and student_id are required'
      });
    }

    res.json({
      message: result.rowCount ? 'deassigned' : 'no_active_assignment'
    });
  } catch (err) {
    next(err);
  }
}

// Student sees their assigned quizzes
async function myAssignments(req, res, next) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { rows } = await db.query(
      `
      SELECT 
        a.id AS assignment_id,
        a.assigned_at,
        a.updated_at,
        a.due_at,
        a.scheduled_from,
        a.scheduled_till,
        a.status AS assignment_status,
        q.id AS quiz_id,
        q.title,
        q.description,
        q.total_time,
        q.quiz_type,
        q.image_url,
        COALESCE(COUNT(qq.question_id), 0) AS total_marks,
        att.id AS attempt_id
      FROM assignments a
      JOIN quizzes q ON q.id = a.quiz_id
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      LEFT JOIN attempts att ON att.quiz_id = q.id AND att.student_id = a.student_id
      WHERE a.student_id = $1
      GROUP BY 
        a.id, a.assigned_at, a.updated_at, a.due_at, a.scheduled_from, a.scheduled_till, a.status,
        q.id, q.title, q.description, q.total_time, q.quiz_type,
        q.image_url, att.id
      ORDER BY a.assigned_at DESC
      `,
      [req.user.id]
    );

    const result = rows.map(r => ({
      assignment_id: r.assignment_id,
      assigned_at: r.assigned_at,
      updated_at: r.updated_at,
      due_at: r.due_at,
      scheduled_from: r.scheduled_from,
      scheduled_till: r.scheduled_till,
      status: r.assignment_status,
      attempt_id: r.attempt_id,
      quiz: {
        id: r.quiz_id,
        title: r.title,
        description: r.description,
        total_time: r.total_time,
        quiz_type: r.quiz_type,
        image_url: r.image_url,
        total_marks: Number(r.total_marks)
      }
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}


// Teacher/admin sees all assignments (active by default)
async function listAssignments(req, res, next) {
  try {
    const includeRevoked = req.query.includeRevoked === 'true';

    let query = `
      SELECT a.*, q.title, s.username AS student
      FROM assignments a
      JOIN quizzes q ON q.id = a.quiz_id
      JOIN users s ON s.id = a.student_id
    `;

    if (!includeRevoked) {
      query += ` WHERE a.status = 'assigned'`;
    }

    const rows = await db.query(query);
    res.json(rows.rows);
  } catch (err) {
    next(err);
  }
}

// Teacher/admin: list assignments for a specific quiz (active by default)
async function assignmentsForQuiz(req, res, next) {
  try {
    const { quizId } = req.params;
    const includeRevoked = req.query.includeRevoked === 'true';

    let query = `
      SELECT 
        a.id,
        a.student_id, 
        a.status, 
        a.due_at, 
        a.assigned_at,
        a.assigned_by,
        u.name as student_name,
        u.username as student_username,
        u.email as student_email,
        u.school as student_school,
        u.class as student_class,
        u.section as student_section,
        assigned_by_user.name as assigned_by_name,
        assigned_by_user.username as assigned_by_username
      FROM assignments a
      JOIN users u ON u.id = a.student_id
      LEFT JOIN users assigned_by_user ON assigned_by_user.id = a.assigned_by
      WHERE a.quiz_id = $1
    `;

    if (!includeRevoked) {
      query += ` AND a.status = 'assigned'`;
    }

    query += ` ORDER BY u.username ASC`;

    const result = await db.query(query, [quizId]);
    
    // Transform the data to match frontend expectations
    const transformedRows = result.rows.map(row => ({
      id: row.id,
      student: {
        id: row.student_id,
        name: row.student_name,
        username: row.student_username,
        email: row.student_email,
        school: row.student_school,
        class: row.student_class,
        section: row.student_section
      },
      assigned_by: {
        id: row.assigned_by,
        name: row.assigned_by_name,
        username: row.assigned_by_username
      },
      status: row.status,
      due_at: row.due_at,
      assigned_at: row.assigned_at
    }));
    
    res.json(transformedRows);
  } catch (err) {
    console.error('Error fetching assignments for quiz', err);
    next(err);
  }
}

module.exports = {
  assignQuizzes,
  deassignQuiz,
  myAssignments,
  listAssignments,
  assignmentsForQuiz,
};
