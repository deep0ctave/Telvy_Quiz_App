const db = require('../config/db');

async function createQuiz(req, res, next) {
  try {
    const { title, description, total_time, quiz_type, image_url, difficulty, tags } = req.body;
    const created_by = req.user.id;

    const ins = await db.query(
      `INSERT INTO quizzes (title, description, total_time, quiz_type, image_url, difficulty, tags, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [title, description, total_time, quiz_type, image_url, difficulty, tags, created_by]
    );

    res.json({ id: ins.rows[0].id });
  } catch (err) {
    next(err);
  }
}

async function listQuizzes(req, res, next) {
  try {
    const r = await db.query(
      `SELECT q.*, u.username as creator
       FROM quizzes q
       LEFT JOIN users u ON u.id=q.created_by
       ORDER BY q.id`
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
}

async function getQuiz(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    const q = await db.query(`SELECT * FROM quizzes WHERE id=$1`, [id]);
    if (!q.rows.length) return res.status(404).json({ error: 'not_found' });

    const quiz = q.rows[0];

    const questions = await db.query(
      `SELECT qq.position, qt.*
       FROM quiz_questions qq
       JOIN questions qt ON qt.id=qq.question_id
       WHERE qq.quiz_id=$1
       ORDER BY qq.position`,
      [id]
    );

    quiz.questions = questions.rows;
    res.json(quiz);
  } catch (err) {
    next(err);
  }
}

async function updateQuiz(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const allowed = ['title','description','total_time','quiz_type','number_of_questions','image_url','difficulty','tags'];
    const fields = [];
    const vals = [];
    let idx = 1;

    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        fields.push(`${f}=$${idx++}`);
        vals.push(req.body[f]);
      }
    }

    if (!fields.length) return res.status(400).json({ error: 'no_fields' });

    vals.push(id);
    const q = `UPDATE quizzes SET ${fields.join(',')}, updated_at=now() WHERE id=$${vals.length}`;
    await db.query(q, vals);

    res.json({ message: 'updated' });
  } catch (err) {
    next(err);
  }
}

async function deleteQuiz(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query(`DELETE FROM quizzes WHERE id=$1`, [id]);
    res.json({ message: 'deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * Assign question ids to a quiz (replace mapping)
 * Body: { question_ids: [1,2,3] }
 */
async function setQuizQuestions(req, res, next) {
  const id = parseInt(req.params.id, 10);
  const { question_ids } = req.body;

  if (!Array.isArray(question_ids)) return res.status(400).json({ error: 'question_ids_array_required' });

  try {
    await db.query('BEGIN');
    await db.query(`DELETE FROM quiz_questions WHERE quiz_id=$1`, [id]);

    let pos = 1;
    for (const qid of question_ids) {
      await db.query(
        `INSERT INTO quiz_questions (quiz_id, question_id, position)
         VALUES ($1,$2,$3)`,
        [id, qid, pos++]
      );
    }

    await db.query(`UPDATE quizzes SET number_of_questions=$1 WHERE id=$2`, [question_ids.length, id]);
    await db.query('COMMIT');

    res.json({ message: 'questions_assigned' });
  } catch (err) {
    await db.query('ROLLBACK');
    next(err);
  }
}

module.exports = { createQuiz, listQuizzes, getQuiz, updateQuiz, deleteQuiz, setQuizQuestions };
