// scripts/init_db.js
const pool = require('../config/db');

(async function init() {
  try {
    await pool.query(`
-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student','teacher','admin')),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  dob DATE,
  email TEXT UNIQUE, -- removed NOT NULL
  gender TEXT,
  school TEXT,
  class TEXT,
  section TEXT,
  password_hash TEXT NOT NULL,
  phone TEXT UNIQUE, -- added UNIQUE constraint
  verification_status BOOLEAN DEFAULT FALSE,
  user_state TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- otps
CREATE TABLE otps (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    purpose TEXT NOT NULL,
    otp TEXT NOT NULL,
    otp_expires_at TIMESTAMP NOT NULL,
    payload JSONB,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);



-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  jwt_token TEXT,
  issued_at TIMESTAMP DEFAULT now(),
  last_active_at TIMESTAMP DEFAULT now(),
  ip TEXT,
  user_agent TEXT,
  valid BOOLEAN DEFAULT TRUE
);

-- quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total_time INTEGER,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('anytime','scheduled')),
  scheduled_at TIMESTAMP NULL,
  number_of_questions INTEGER DEFAULT 0,
  image_url TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  tags TEXT[],
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- questions (options & correct_answers stored as JSONB)
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq','multiple','truefalse','typed')),
  options JSONB,
  correct_answers JSONB,
  time_limit INTEGER DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  tags TEXT[],
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- quiz_questions mapping (keeps order)
CREATE TABLE IF NOT EXISTS quiz_questions (
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (quiz_id, question_id)
);

-- assignments mapping quiz -> student
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  due_at TIMESTAMP,
  status TEXT DEFAULT 'assigned',
  CONSTRAINT unique_assignment UNIQUE (quiz_id, student_id, status)
);


-- attempts (one record per student's attempt)
CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT now(),
  finished_at TIMESTAMP,
  state JSONB,
  score NUMERIC,
  status TEXT DEFAULT 'in_progress',
  last_synced_at TIMESTAMP DEFAULT now()
);

-- attempt snapshots (periodic client syncs)
CREATE TABLE IF NOT EXISTS attempt_snapshots (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER REFERENCES attempts(id) ON DELETE CASCADE,
  snapshot JSONB,
  received_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

    `);
    console.log('DB initialized successfully');
    await pool.end();
  } catch (err) {
    console.error('DB init error', err);
    await pool.end();
    process.exit(1);
  }
})();
