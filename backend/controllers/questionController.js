// src/controllers/questionController.js
const db = require('../config/db');

async function createQuestion(req, res, next) {
  try {
    const { question_text, question_type, options, correct_answers, time_limit, difficulty, tags, image_url } = req.body;
    const created_by = req.user.id;

    // Ensure JSONB safe format
    const optionsJson = options ? JSON.stringify(options) : null;
    const correctJson = correct_answers ? JSON.stringify(correct_answers) : null;

    const ins = await db.query(
      `INSERT INTO questions 
        (question_text, question_type, options, correct_answers, time_limit, difficulty, tags, image_url, created_by) 
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9) 
       RETURNING id`,
      [question_text, question_type, optionsJson, correctJson, time_limit || 0, difficulty, tags, image_url, created_by]
    );

    res.json({ id: ins.rows[0].id });
  } catch (err) { next(err); }
}

async function listQuestions(req, res, next) {
  try {
    const r = await db.query(`SELECT * FROM questions ORDER BY id`);
    res.json(r.rows);
  } catch (err) { next(err); }
}

async function getQuestion(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await db.query(`SELECT * FROM questions WHERE id=$1`, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
}

async function updateQuestion(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const allowed = ['question_text', 'question_type', 'options', 'correct_answers', 'time_limit', 'difficulty', 'tags', 'image_url'];
    const fields = [];
    const vals = [];
    let idx = 1;

    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        let value = req.body[f];

        // Force JSONB format for these fields
        if (f === 'options' || f === 'correct_answers') {
          value = value ? JSON.stringify(value) : null;
          fields.push(`${f}=$${idx++}::jsonb`);
        } else {
          fields.push(`${f}=$${idx++}`);
        }
        vals.push(value);
      }
    }

    if (!fields.length) return res.status(400).json({ error: 'no_fields' });

    vals.push(id);
    const q = `UPDATE questions SET ${fields.join(', ')}, updated_at=now() WHERE id=$${vals.length}`;
    await db.query(q, vals);

    res.json({ message: 'updated' });
  } catch (err) { next(err); }
}

async function deleteQuestion(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query(`DELETE FROM questions WHERE id=$1`, [id]);
    res.json({ message: 'deleted' });
  } catch (err) { next(err); }
}

async function createBulkQuestions(req, res, next) {
  try {
    const { questions } = req.body;
    const created_by = req.user.id;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'questions_array_required' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      try {
        // Validate required fields
        if (!question.question_text || !question.question_type) {
          errors.push({ index: i, error: 'missing_required_fields' });
          continue;
        }

        // Validate question type
        if (!['mcq', 'multiple', 'truefalse', 'typed'].includes(question.question_type)) {
          errors.push({ index: i, error: 'invalid_question_type' });
          continue;
        }

        // Ensure JSONB safe format
        const optionsJson = question.options ? JSON.stringify(question.options) : null;
        const correctJson = question.correct_answers ? JSON.stringify(question.correct_answers) : null;

        const ins = await db.query(
          `INSERT INTO questions 
            (question_text, question_type, options, correct_answers, time_limit, difficulty, tags, image_url, created_by) 
           VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9) 
           RETURNING id`,
          [
            question.question_text, 
            question.question_type, 
            optionsJson, 
            correctJson, 
            question.time_limit || 0, 
            question.difficulty || 'medium', 
            question.tags || [], 
            question.image_url || null,
            created_by
          ]
        );

        results.push({ index: i, id: ins.rows[0].id, success: true });
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    res.json({ 
      message: 'bulk_creation_complete',
      created: results.length,
      error_count: errors.length,
      results,
      errors: errors.length > 0 ? errors : []
    });
  } catch (err) { next(err); }
}

module.exports = { createQuestion, listQuestions, getQuestion, updateQuestion, deleteQuestion, createBulkQuestions };
