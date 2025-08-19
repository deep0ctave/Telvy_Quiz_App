// scripts/seed_db.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

(async function seed() {
  try {
    const pw = await bcrypt.hash('Password123!', 10);

    // check existing
    const res = await pool.query(`SELECT username FROM users WHERE username IN ('admin','teacher1','student1')`);
    if (res.rows.length === 3) {
      console.log('seed users already exist, updating admin user...');
      // Update admin user to ensure complete data
      await pool.query(`
        UPDATE users SET 
          name = 'Admin User',
          username = 'admin',
          dob = '1980-01-01',
          email = 'admin@example.com',
          gender = 'other',
          school = 'HQ',
          class = 'N/A',
          section = 'N/A',
          phone = '+10000000000',
          verification_status = true,
          user_state = 'active'
        WHERE username = 'admin'
      `);
      console.log('Admin user updated with complete data');
      await pool.end();
      return;
    }

await pool.query(`
  INSERT INTO users(role, name, username, dob, email, gender, school, class, section, password_hash, phone, verification_status, user_state)
  VALUES
  ('admin','Admin User','admin','1980-01-01','admin@example.com','other','HQ','N/A','N/A', $1, '+10000000000', true, 'active'),
  ('teacher','Teacher One','teacher1','1990-06-15','teacher1@example.com','female','HighSchool','N/A','N/A', $1, '+10000000001', true, 'active'),
  ('student','Student One','student1','2008-09-01','student1@example.com','male','HighSchool','10','A', $1, '+10000000002', true, 'active')
`, [pw]);

    // insert sample questions & quiz and mapping
    const qres1 = await pool.query(`
      INSERT INTO questions (question_text, question_type, options, correct_answers, time_limit, difficulty, tags, created_by)
      VALUES ($1,'mcq',$2,$3,30,'easy',ARRAY['math','basic'],(SELECT id FROM users WHERE username='teacher1')) RETURNING id
    `, [
      'What is 2 + 2?',
      JSON.stringify([{ id: 'a', text: '3' }, { id: 'b', text: '4' }, { id: 'c', text: '22' }, { id: 'd', text: '5' }]),
      JSON.stringify(['b'])
    ]);

    const qres2 = await pool.query(`
      INSERT INTO questions (question_text, question_type, options, correct_answers, time_limit, difficulty, tags, created_by)
      VALUES ($1,'mcq',$2,$3,45,'medium',ARRAY['math','algebra'],(SELECT id FROM users WHERE username='teacher1')) RETURNING id
    `, [
      'What is the value of x in the equation 2x + 5 = 13?',
      JSON.stringify([{ id: 'a', text: '3' }, { id: 'b', text: '4' }, { id: 'c', text: '5' }, { id: 'd', text: '6' }]),
      JSON.stringify(['b'])
    ]);

    const qres3 = await pool.query(`
      INSERT INTO questions (question_text, question_type, options, correct_answers, time_limit, difficulty, tags, created_by)
      VALUES ($1,'truefalse',$2,$3,30,'easy',ARRAY['science','general'],(SELECT id FROM users WHERE username='teacher1')) RETURNING id
    `, [
      'The Earth is round.',
      JSON.stringify([{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }]),
      JSON.stringify(['a'])
    ]);

    const qid = qres1.rows[0].id;
    const quizRes = await pool.query(`
      INSERT INTO quizzes (title, description, total_time, quiz_type, number_of_questions, difficulty, tags, created_by)
      VALUES ($1,$2,600,'anytime',3,'medium',ARRAY['sample','math','science'],(SELECT id FROM users WHERE username='teacher1')) RETURNING id
    `, ['Sample Quiz', 'A sample quiz with multiple questions']);
    const quizId = quizRes.rows[0].id;

    // Add all questions to the quiz
    await pool.query(`INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES ($1,$2,1)`, [quizId, qres1.rows[0].id]);
    await pool.query(`INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES ($1,$2,2)`, [quizId, qres2.rows[0].id]);
    await pool.query(`INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES ($1,$2,3)`, [quizId, qres3.rows[0].id]);

    console.log('Seed complete. Users: admin/teacher1/student1 (password: Password123!)');
    await pool.end();
  } catch (err) {
    console.error('Seed error', err);
    await pool.end();
    process.exit(1);
  }
})();
