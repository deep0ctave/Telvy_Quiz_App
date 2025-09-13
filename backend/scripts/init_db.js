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
  total_time INTEGER DEFAULT 300,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('anytime','scheduled')),
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
  image_url TEXT,
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
  scheduled_from TIMESTAMP,
  scheduled_till TIMESTAMP,
  status TEXT DEFAULT 'assigned',
  CONSTRAINT assignments_sched_window CHECK (
    scheduled_till IS NULL OR scheduled_from IS NULL OR scheduled_till > scheduled_from
  ),
  CONSTRAINT unique_assignment UNIQUE (quiz_id, student_id, status)
);


-- attempts (one record per student's attempt)
CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  finished_at TIMESTAMP,
  state JSONB DEFAULT '{}'::jsonb,
  score NUMERIC,
  status TEXT DEFAULT 'in_progress',
  last_synced_at TIMESTAMP DEFAULT now()
);

-- attempt_snapshots table removed as per new design (no longer needed)

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- User statistics table for pre-calculated stats
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
);

-- Indexes for user_stats table
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_average_score ON user_stats(average_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_quizzes ON user_stats(total_quizzes_taken DESC);
-- Additional helpful indexes
CREATE INDEX IF NOT EXISTS idx_assignments_sched_from ON assignments(scheduled_from);
CREATE INDEX IF NOT EXISTS idx_assignments_sched_window ON assignments(scheduled_from, scheduled_till);
CREATE INDEX IF NOT EXISTS idx_attempts_student_status ON attempts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_student ON attempts(quiz_id, student_id);

-- School statistics table for school-wise rankings
CREATE TABLE IF NOT EXISTS school_stats (
  id SERIAL PRIMARY KEY,
  school_name TEXT NOT NULL UNIQUE,
  
  -- Student counts
  total_students INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  
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
  
  -- Timestamps
  first_attempt_at TIMESTAMP,
  last_attempt_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for school_stats table
CREATE INDEX IF NOT EXISTS idx_school_stats_school_name ON school_stats(school_name);
CREATE INDEX IF NOT EXISTS idx_school_stats_average_score ON school_stats(average_score DESC);
CREATE INDEX IF NOT EXISTS idx_school_stats_total_students ON school_stats(total_students DESC);

    `);
    console.log('DB initialized successfully');
    await pool.end();
  } catch (err) {
    console.error('DB init error', err);
    await pool.end();
    process.exit(1);
  }
})();
