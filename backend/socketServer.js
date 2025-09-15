const { Server } = require('socket.io');
const db = require('./config/db');
const jwtUtils = require('./config/jwt');

function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,https://happy-smoke-0f7647710.2.azurestaticapps.net')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Authorization', 'Content-Type']
    }
  });

  const activeTimers = new Map(); // attemptId -> interval
  const activeAttempts = new Map(); // attemptId -> { userId, quizId, startTime, remainingTime }

  io.on('connection', (socket) => {
    // Authenticate
    socket.on('authenticate', async ({ token }) => {
      try {
        console.log('[SOCKET-AUTH] Authentication attempt for socket:', socket.id);
        const user = jwtUtils.verify(token);
        console.log('[SOCKET-AUTH] Token verified for user:', user?.id, 'role:', user?.role);
        socket.userId = user?.id;
        socket.emit('authenticated', { userId: socket.userId });
        console.log('[SOCKET-AUTH] Authentication successful for user:', socket.userId);
      } catch (e) {
        console.log('[SOCKET-AUTH] Authentication failed:', e.message);
        socket.emit('auth_error', { message: 'Invalid token' });
      }
    });

    // Start/restore timer for an attempt
    socket.on('start_timer', async ({ attempt_id }) => {
      try {
        if (!socket.userId) return socket.emit('error', { message: 'Not authenticated' });

        const q = await db.query(
          `SELECT a.id, a.quiz_id, a.started_at, a.status, a.state, q.total_time
           FROM attempts a JOIN quizzes q ON q.id = a.quiz_id
           WHERE a.id=$1 AND a.student_id=$2`,
          [attempt_id, socket.userId]
        );
        if (!q.rows.length) return socket.emit('error', { message: 'Attempt not found' });
        const row = q.rows[0];

        // Clear existing timer
        if (activeTimers.has(attempt_id)) {
          clearInterval(activeTimers.get(attempt_id));
          activeTimers.delete(attempt_id);
        }

        // Compute remaining seconds (respect timer override if present)
        const state = row.state || {};
        const override = state.timer_override;
        const total = override?.total_duration_sec || row.total_time || 300;
        const start = override?.reset_at ? new Date(override.reset_at) : new Date(row.started_at);
        const now = new Date();
        let remaining = Math.max(0, Math.floor(total - ((now - start) / 1000)));

        // Join attempt room
        const room = `attempt:${attempt_id}`;
        try { socket.join(room); } catch {}

        // If timer has expired and attempt is still in progress, auto-submit
        if (row.status === 'in_progress' && remaining <= 0) {
          try {
            console.log(`[AUTO-SUBMIT-RECONNECT] Timer expired on reconnect for attempt ${attempt_id}`);
            const attempt = row;
            const questions = attempt.state?.questions || [];
            console.log(`[AUTO-SUBMIT-RECONNECT] Attempt ${attempt_id} has ${questions.length} questions`);
            
            if (questions.length > 0) {
              const qids = questions.map(q => q.id);
              const qRows = await db.query(`SELECT id, correct_answers FROM questions WHERE id=ANY($1::int[])`, [qids]);
              const byId = new Map(qRows.rows.map(r => [r.id, r.correct_answers || []]));
              let earned = 0;
              for (const q of questions) {
                let ans = q.answer;
                if (ans === null || ans === undefined || ans === '') continue;
                if (!Array.isArray(ans)) ans = [ans];
                const correct = byId.get(q.id) || [];
                const same = correct.length === ans.length && correct.every(x => ans.includes(x));
                if (same) earned++;
              }
              const total = questions.length;
              const score = total ? Math.round((earned / total) * 10000) / 100 : 0;
              
              console.log(`[AUTO-SUBMIT-RECONNECT] Grading complete: ${earned}/${total} correct, score: ${score}%`);
              
              await db.query(`UPDATE attempts SET finished_at=NOW(), score=$1, status='completed' WHERE id=$2`, [score, attempt_id]);
              await db.query(`UPDATE assignments SET status='completed', updated_at=NOW() WHERE quiz_id=$1 AND student_id=$2`, [attempt.quiz_id, attempt.student_id]);
              
              console.log(`[AUTO-SUBMIT-RECONNECT] Database updated for attempt ${attempt_id}`);
              
              // Notify client that quiz was auto-submitted
              socket.emit('quiz_submitted', { 
                attempt_id, 
                score, 
                total_questions: total, 
                correct: earned, 
                unanswered: total - earned,
                auto_submitted: true 
              });
              
              console.log(`[AUTO-SUBMIT-RECONNECT] Emitted quiz_submitted event for attempt ${attempt_id}`);
            } else {
              console.log(`[AUTO-SUBMIT-RECONNECT] No questions found for attempt ${attempt_id}`);
            }
          } catch (e) {
            console.error('[AUTO-SUBMIT-RECONNECT] Auto-submit on reconnect failed:', e);
          }
          return;
        }

        // Emit immediately
        socket.emit('timer_update', {
          attempt_id,
          remaining_time: remaining,
          total_time: total
        });

        if (row.status !== 'in_progress' || remaining <= 0) return;

        const interval = setInterval(async () => {
          remaining -= 1;
          
          // Update the activeAttempts map with current remaining time
          if (activeAttempts.has(attempt_id)) {
            const currentAttempt = activeAttempts.get(attempt_id);
            activeAttempts.set(attempt_id, {
              ...currentAttempt,
              remainingTime: Math.max(0, remaining)
            });
          }
          
          io.to(room).emit('timer_update', {
            attempt_id,
            remaining_time: Math.max(0, remaining),
            total_time: total
          });
          if (remaining <= 0) {
            clearInterval(interval);
            activeTimers.delete(attempt_id);
            activeAttempts.delete(attempt_id); // Clean up the map
            
            // Auto-submit when timer expires (even if client disconnected)
            try {
              console.log(`[AUTO-SUBMIT] Timer expired for attempt ${attempt_id}, checking status...`);
              const a = await db.query(`SELECT * FROM attempts WHERE id=$1 AND status='in_progress'`, [attempt_id]);
              console.log(`[AUTO-SUBMIT] Found ${a.rows.length} in-progress attempts`);
              
              if (a.rows.length) {
                const attempt = a.rows[0];
                const questions = attempt.state?.questions || [];
                console.log(`[AUTO-SUBMIT] Attempt ${attempt_id} has ${questions.length} questions`);
                
                if (questions.length > 0) {
                  const qids = questions.map(q => q.id);
                  const qRows = await db.query(`SELECT id, correct_answers FROM questions WHERE id=ANY($1::int[])`, [qids]);
                  const byId = new Map(qRows.rows.map(r => [r.id, r.correct_answers || []]));
                  let earned = 0;
                  for (const q of questions) {
                    let ans = q.answer;
                    if (ans === null || ans === undefined || ans === '') continue;
                    if (!Array.isArray(ans)) ans = [ans];
                    const correct = byId.get(q.id) || [];
                    const same = correct.length === ans.length && correct.every(x => ans.includes(x));
                    if (same) earned++;
                  }
                  const total = questions.length;
                  const score = total ? Math.round((earned / total) * 10000) / 100 : 0;
                  
                  console.log(`[AUTO-SUBMIT] Grading complete: ${earned}/${total} correct, score: ${score}%`);
                  
                  await db.query(`UPDATE attempts SET finished_at=NOW(), score=$1, status='completed' WHERE id=$2`, [score, attempt_id]);
                  await db.query(`UPDATE assignments SET status='completed', updated_at=NOW() WHERE quiz_id=$1 AND student_id=$2`, [attempt.quiz_id, attempt.student_id]);
                  
                  console.log(`[AUTO-SUBMIT] Database updated for attempt ${attempt_id}`);
                  
                  // Notify any connected clients
                  io.to(room).emit('quiz_submitted', { 
                    attempt_id, 
                    score, 
                    total_questions: total, 
                    correct: earned, 
                    unanswered: total - earned,
                    auto_submitted: true 
                  });
                  
                  console.log(`[AUTO-SUBMIT] Emitted quiz_submitted event for attempt ${attempt_id}`);
                } else {
                  console.log(`[AUTO-SUBMIT] No questions found for attempt ${attempt_id}`);
                }
              } else {
                console.log(`[AUTO-SUBMIT] No in-progress attempt found for ${attempt_id}`);
              }
            } catch (e) {
              console.error('[AUTO-SUBMIT] Auto-submit failed:', e);
            }
          }
        }, 1000);

        activeTimers.set(attempt_id, interval);
        
        // Also update activeAttempts map for live dashboard
        // Use current time as start time for active timer, not database started_at
        activeAttempts.set(attempt_id, {
          userId: socket.userId,
          quizId: row.quiz_id,
          startTime: start, // honor override or started_at
          remainingTime: remaining,
          totalDuration: total
        });
      } catch (e) {
        socket.emit('error', { message: 'Failed to start timer' });
      }
    });

    // Start quiz (create attempt) and return initial payload
    socket.on('start_quiz', async ({ quiz_id }, cb) => {
      try {
        if (!socket.userId) return cb && cb({ ok: false, error: 'not_authenticated' });

        // Verify assignment exists and is assigned
        const assignQ = await db.query(
          `SELECT shuffle_questions FROM assignments WHERE quiz_id=$1 AND student_id=$2 AND status='assigned' LIMIT 1`,
          [quiz_id, socket.userId]
        );
        if (!assignQ.rows.length) return cb && cb({ ok: false, error: 'quiz_not_assigned' });
        const shouldShuffle = !!assignQ.rows[0].shuffle_questions;

        // Fetch questions via mapping table
        const questionsQ = await db.query(
          `SELECT q.id, q.question_text, q.question_type, q.options, q.image_url, qq.position
           FROM questions q JOIN quiz_questions qq ON qq.question_id=q.id
           WHERE qq.quiz_id=$1 ORDER BY qq.position ASC`,
          [quiz_id]
        );

        // Deterministic per-student shuffle based on (quiz_id, student_id)
        const seedRandom = (seed) => {
          let s = seed >>> 0;
          return () => {
            // xorshift32
            s ^= s << 13; s >>>= 0;
            s ^= s >> 17; s >>>= 0;
            s ^= s << 5;  s >>>= 0;
            return (s >>> 0) / 4294967296;
          };
        };

        const baseQuestions = questionsQ.rows.map(q => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          image_url: q.image_url,
          answer: null,
          position: q.position
        }));

        let orderedQuestions = baseQuestions;
        if (shouldShuffle) {
          const rand = seedRandom((quiz_id * 73856093) ^ (socket.userId * 19349663));
          // Fisher–Yates shuffle
          orderedQuestions = [...baseQuestions];
          for (let i = orderedQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [orderedQuestions[i], orderedQuestions[j]] = [orderedQuestions[j], orderedQuestions[i]];
          }
        }

        const state = {
          quiz_id,
          shuffle_applied: shouldShuffle,
          questions: orderedQuestions.map(({ position, ...q }) => q)
        };

        const ins = await db.query(
          `INSERT INTO attempts (quiz_id, student_id, state, status, started_at)
           VALUES ($1,$2,$3,'in_progress',NOW()) RETURNING id`,
          [quiz_id, socket.userId, state]
        );

        // Mark assignment in_progress
        await db.query(`UPDATE assignments SET status='in_progress', updated_at=NOW() WHERE quiz_id=$1 AND student_id=$2`, [quiz_id, socket.userId]);

        const quizRes = await db.query(`SELECT id, title, description, total_time, quiz_type, number_of_questions, difficulty, tags FROM quizzes WHERE id=$1`, [quiz_id]);
        const payload = { attempt_id: ins.rows[0].id, quiz: quizRes.rows[0], questions: state.questions };

        // Join attempt room
        const room = `attempt:${payload.attempt_id}`;
        try { socket.join(room); } catch {}

        // Add to activeAttempts map for live dashboard tracking
        const totalTime = quizRes.rows[0]?.total_time || 300;
        activeAttempts.set(payload.attempt_id, {
          userId: socket.userId,
          quizId: quiz_id,
          startTime: new Date(),
          remainingTime: totalTime,
          totalDuration: totalTime
        });

        // Start timer stream for this attempt
        socket.emit('quiz_started', payload);
        socket.emit('timer_update', { attempt_id: payload.attempt_id, remaining_time: totalTime, total_time: totalTime });
        if (cb) cb({ ok: true, data: payload });
      } catch (e) {
        if (cb) cb({ ok: false, error: 'failed_to_start' });
      }
    });

    // Get attempt (for resume/reload)
    socket.on('get_attempt', async ({ attempt_id }, cb) => {
      try {
        if (!socket.userId) return cb && cb({ ok: false, error: 'not_authenticated' });
        const r = await db.query(`SELECT a.*, q.total_time FROM attempts a JOIN quizzes q ON q.id=a.quiz_id WHERE a.id=$1 AND a.student_id=$2`, [attempt_id, socket.userId]);
        if (!r.rows.length) return cb && cb({ ok: false, error: 'not_found' });
        
        let attempt = r.rows[0];
        
        // Add remaining_time calculation for timer persistence
        if (attempt.status === 'in_progress') {
          const activeAttempt = activeAttempts.get(attempt_id);
          const state = attempt.state || {};
          const override = state.timer_override;
          if (activeAttempt) {
            // Use active timer data if available
            const now = new Date();
            const elapsedSinceReset = Math.floor((now - activeAttempt.startTime) / 1000);
            attempt.remaining_time = Math.max(0, activeAttempt.remainingTime - elapsedSinceReset);
          } else {
            // Calculate based on database times
            const totalTime = override?.total_duration_sec || attempt.total_time || 300;
            const startTime = override?.reset_at ? new Date(override.reset_at) : new Date(attempt.started_at);
            const now = new Date();
            const elapsed = Math.floor((now - startTime) / 1000);
            attempt.remaining_time = Math.max(0, totalTime - elapsed);
          }
        }
        
        // If attempt is completed, enhance with correct answers for review
        if (attempt.status === 'completed' && attempt.state && attempt.state.questions) {
          const questionIds = attempt.state.questions.map(q => q.id);
          
          if (questionIds.length > 0) {
            const correctAnswersQ = await db.query(
              `SELECT id, correct_answers FROM questions WHERE id = ANY($1::int[])`,
              [questionIds]
            );
            
            const correctAnswersMap = new Map(
              correctAnswersQ.rows.map(row => [row.id, row.correct_answers])
            );
            
            // Enhance questions with correct answers
            attempt.state.questions = attempt.state.questions.map(q => ({
              ...q,
              correct_answer: correctAnswersMap.get(q.id) || []
            }));
          }
        }
        
        // Join attempt room
        try { socket.join(`attempt:${attempt_id}`); } catch {}
        cb && cb({ ok: true, data: attempt });
      } catch (e) {
        cb && cb({ ok: false, error: 'failed_to_get' });
      }
    });

    // Submit attempt (grade)
    socket.on('submit_attempt', async ({ attempt_id }, cb) => {
      try {
        if (!socket.userId) return cb && cb({ ok: false, error: 'not_authenticated' });
        const a = await db.query(`SELECT * FROM attempts WHERE id=$1 AND student_id=$2`, [attempt_id, socket.userId]);
        if (!a.rows.length) return cb && cb({ ok: false, error: 'not_found' });
        const attempt = a.rows[0];
        const questions = attempt.state?.questions || [];
        if (!questions.length) return cb && cb({ ok: false, error: 'no_questions' });

        const qids = questions.map(q => q.id);
        const qRows = await db.query(`SELECT id, correct_answers FROM questions WHERE id=ANY($1::int[])`, [qids]);
        const byId = new Map(qRows.rows.map(r => [r.id, r.correct_answers || []]));
        let earned = 0;
        for (const q of questions) {
          let ans = q.answer;
          if (ans === null || ans === undefined || ans === '') continue;
          if (!Array.isArray(ans)) ans = [ans];
          const correct = byId.get(q.id) || [];
          const same = correct.length === ans.length && correct.every(x => ans.includes(x));
          if (same) earned++;
        }
        const total = questions.length;
        const score = total ? Math.round((earned / total) * 10000) / 100 : 0;
        await db.query(`UPDATE attempts SET finished_at=NOW(), score=$1, status='completed' WHERE id=$2`, [score, attempt_id]);
        // Reflect completion in assignments as well
        await db.query(`UPDATE assignments SET status='completed', updated_at=NOW() WHERE quiz_id=$1 AND student_id=$2`, [attempt.quiz_id, attempt.student_id]);
        io.emit('quiz_submitted', { attempt_id, score, total_questions: total, correct: earned, unanswered: total - earned });
        cb && cb({ ok: true, data: { attempt_id, score, total_questions: total, correct: earned, unanswered: total - earned } });
      } catch (e) {
        cb && cb({ ok: false, error: 'failed_to_submit' });
      }
    });

    // Sync state (simple merge similar to attemptController)
    socket.on('sync_state', async ({ attempt_id, state, client_id }) => {
      try {
        if (!socket.userId) return socket.emit('error', { message: 'Not authenticated' });
        const r = await db.query(`SELECT student_id, status, state FROM attempts WHERE id=$1`, [attempt_id]);
        if (!r.rows.length) return socket.emit('error', { message: 'Attempt not found' });
        const attempt = r.rows[0];
        if (attempt.student_id !== socket.userId) return socket.emit('error', { message: 'Forbidden' });
        if (attempt.status !== 'in_progress') return socket.emit('error', { message: 'Attempt not in progress' });

        const existingState = attempt.state || {};
        const existingQuestions = Array.isArray(existingState.questions) ? existingState.questions : [];
        const incomingQuestions = Array.isArray(state?.questions) ? state.questions : [];
        const incomingById = new Map(incomingQuestions.map(q => [q.id, q]));

        const mergedQuestions = existingQuestions.map(eq => {
          const iq = incomingById.get(eq.id) || {};
          const incomingAnswer = iq.answer;
          const shouldUpdate = incomingAnswer !== null && incomingAnswer !== undefined && incomingAnswer !== '';
          return {
            ...eq,
            question_text: iq.question_text ?? eq.question_text,
            question_type: iq.question_type ?? eq.question_type,
            options: iq.options ?? eq.options,
            image_url: iq.image_url ?? eq.image_url,
            answer: shouldUpdate ? incomingAnswer : eq.answer
          };
        });
        const existingIds = new Set(existingQuestions.map(q => q.id));
        const newOnes = incomingQuestions.filter(q => !existingIds.has(q.id));

        const mergedState = {
          ...existingState,
          ...state,
          quiz_id: existingState.quiz_id ?? state?.quiz_id,
          questions: mergedQuestions.concat(newOnes)
        };

        await db.query(`UPDATE attempts SET state=$1, last_synced_at=NOW() WHERE id=$2`, [mergedState, attempt_id]);
        const room = `attempt:${attempt_id}`;
        io.to(room).emit('state_update', { attempt_id, state: mergedState, source: client_id || null });
        socket.emit('state_synced', { attempt_id });
      } catch (e) {
        socket.emit('error', { message: 'Failed to sync state' });
      }
    });

    // Admin events
    socket.on('admin_get_live_attempts', async (filters = {}) => {
      try {
        if (!socket.userId) return socket.emit('error', { message: 'Not authenticated' });
        
        // Check if user is admin or teacher
        const userCheck = await db.query(`SELECT role FROM users WHERE id=$1`, [socket.userId]);
        if (!userCheck.rows.length || !['admin', 'teacher'].includes(userCheck.rows[0].role)) {
          return socket.emit('error', { message: 'Admin or teacher access required' });
        }

        // Build dynamic query with filters
        let query = `
          SELECT 
            a.id as attempt_id,
            a.student_id,
            a.quiz_id,
            a.started_at,
            a.status,
            a.state,
            u.name as student_name,
            u.username as student_username,
            u.email as student_email,
            u.school as student_school,
            u.class as student_class,
            u.section as student_section,
            q.title as quiz_title,
            q.total_time
          FROM attempts a
          JOIN users u ON u.id = a.student_id
          JOIN quizzes q ON q.id = a.quiz_id
          WHERE a.status = 'in_progress'
        `;
        
        const queryParams = [];
        let paramCount = 0;
        
        // Add filters
        if (filters.school) {
          paramCount++;
          query += ` AND u.school ILIKE $${paramCount}`;
          queryParams.push(`%${filters.school}%`);
        }
        
        if (filters.class) {
          paramCount++;
          query += ` AND u.class ILIKE $${paramCount}`;
          queryParams.push(`%${filters.class}%`);
        }
        
        if (filters.section) {
          paramCount++;
          query += ` AND u.section ILIKE $${paramCount}`;
          queryParams.push(`%${filters.section}%`);
        }
        
        if (filters.quiz_title) {
          paramCount++;
          query += ` AND q.title ILIKE $${paramCount}`;
          queryParams.push(`%${filters.quiz_title}%`);
        }
        
        if (filters.student_name) {
          paramCount++;
          query += ` AND u.name ILIKE $${paramCount}`;
          queryParams.push(`%${filters.student_name}%`);
        }
        
        query += ` ORDER BY a.started_at DESC`;

        const activeAttemptsData = await db.query(query, queryParams);

        // Add timer info for each attempt
        const attemptsWithTimers = activeAttemptsData.rows.map(attempt => {
          const startTime = new Date(attempt.started_at);
          const now = new Date();
          
          // Check if this attempt has an active timer
          const activeAttempt = activeAttempts.get(attempt.attempt_id);
          let remaining, elapsed, totalTime;
          
          // Respect override from state if present
          const state = attempt.state || {};
          const override = state.timer_override;
          const effStart = override?.reset_at ? new Date(override.reset_at) : startTime;
          const effTotal = override?.total_duration_sec || attempt.total_time;

          if (activeAttempt) {
            // Use the active timer data (most accurate). remainingTime is current remaining seconds.
            remaining = Math.max(0, activeAttempt.remainingTime);
            totalTime = activeAttempt.totalDuration;
            elapsed = Math.max(0, totalTime - remaining);
          } else {
            // For attempts without active timers, calculate based on database time
            // This happens when the server restarts or timer was not properly started
            elapsed = Math.floor((now - effStart) / 1000);
            remaining = Math.max(0, effTotal - elapsed);
            totalTime = effTotal;
            
            // If the attempt should have expired, mark it as such
            if (remaining <= 0 && attempt.status === 'in_progress') {
              console.log(`[LIVE-DASHBOARD] Attempt ${attempt.attempt_id} appears to have expired, remaining: ${remaining}`);
            }
          }
          
          return {
            ...attempt,
            remaining_time: remaining,
            elapsed_time: elapsed,
            quiz_total_time: totalTime,
            is_timer_active: activeTimers.has(attempt.attempt_id)
          };
        });

        socket.emit('admin_live_attempts', attemptsWithTimers);
      } catch (e) {
        socket.emit('error', { message: 'Failed to get live attempts' });
      }
    });

    socket.on('admin_reset_timer', async ({ attempt_id, new_duration }) => {
      try {
        console.log(`[ADMIN-RESET-TIMER] Received request for attempt ${attempt_id} with duration: ${new_duration}`);
        
        if (!socket.userId) return socket.emit('error', { message: 'Not authenticated' });
        
        // Check if user is admin or teacher
        const userCheck = await db.query(`SELECT role FROM users WHERE id=$1`, [socket.userId]);
        if (!userCheck.rows.length || !['admin', 'teacher'].includes(userCheck.rows[0].role)) {
          return socket.emit('error', { message: 'Admin or teacher access required' });
        }

        // Clear existing timer
        if (activeTimers.has(attempt_id)) {
          clearInterval(activeTimers.get(attempt_id));
          activeTimers.delete(attempt_id);
        }

        // Update attempt start time to now and persist override in state
        const nowTs = new Date();
        await db.query(`UPDATE attempts SET started_at=NOW(), state = jsonb_set(COALESCE(state,'{}'::jsonb), '{timer_override}', $1::jsonb, true) WHERE id=$2`, [
          JSON.stringify({ total_duration_sec: new_duration || 300, reset_at: nowTs.toISOString() }),
          attempt_id
        ]);

        // Fetch quiz_id and student_id for metadata
        const metaQ = await db.query(`SELECT quiz_id, student_id FROM attempts WHERE id=$1`, [attempt_id]);
        const meta = metaQ.rows[0] || {};

        // Start new timer
        const room = `attempt:${attempt_id}`;
        const newRemaining = new_duration || 300; // Default 5 minutes
        
        // Update activeAttempts map with new duration and correct quizId/userId
        activeAttempts.set(attempt_id, {
          userId: meta.student_id || socket.userId,
          quizId: meta.quiz_id || null,
          startTime: nowTs,
          remainingTime: newRemaining,
          totalDuration: new_duration || 300
        });
        
        io.to(room).emit('timer_update', {
          attempt_id,
          remaining_time: newRemaining,
          total_time: new_duration || 300
        });

        let remaining = newRemaining;
        const interval = setInterval(async () => {
          remaining -= 1;
          
          // Update the activeAttempts map with current remaining time
          if (activeAttempts.has(attempt_id)) {
            const currentAttempt = activeAttempts.get(attempt_id);
            activeAttempts.set(attempt_id, {
              ...currentAttempt,
              remainingTime: Math.max(0, remaining)
            });
          }
          
          io.to(room).emit('timer_update', {
            attempt_id,
            remaining_time: Math.max(0, remaining),
            total_time: new_duration || 300
          });
          
          if (remaining <= 0) {
            clearInterval(interval);
            activeTimers.delete(attempt_id);
            activeAttempts.delete(attempt_id); // Clean up the map
            
            // Auto-submit when timer expires (same logic as start_timer)
            try {
              console.log(`[AUTO-SUBMIT-RESET] Timer expired for attempt ${attempt_id}, checking status...`);
              const a = await db.query(`SELECT * FROM attempts WHERE id=$1 AND status='in_progress'`, [attempt_id]);
              console.log(`[AUTO-SUBMIT-RESET] Found ${a.rows.length} in-progress attempts`);
              
              if (a.rows.length) {
                const attempt = a.rows[0];
                const questions = attempt.state?.questions || [];
                console.log(`[AUTO-SUBMIT-RESET] Attempt ${attempt_id} has ${questions.length} questions`);
                
                if (questions.length > 0) {
                  const qids = questions.map(q => q.id);
                  const qRows = await db.query(`SELECT id, correct_answers FROM questions WHERE id=ANY($1::int[])`, [qids]);
                  const byId = new Map(qRows.rows.map(r => [r.id, r.correct_answers || []]));
                  let earned = 0;
                  for (const q of questions) {
                    let ans = q.answer;
                    if (ans === null || ans === undefined || ans === '') continue;
                    if (!Array.isArray(ans)) ans = [ans];
                    const correct = byId.get(q.id) || [];
                    const same = correct.length === ans.length && correct.every(x => ans.includes(x));
                    if (same) earned++;
                  }
                  const total = questions.length;
                  const score = total > 0 ? (earned / total) * 100 : 0;
                  
                  console.log(`[AUTO-SUBMIT-RESET] Grading attempt ${attempt_id}: ${earned}/${total} = ${score.toFixed(2)}%`);
                  
                  // Update attempt as completed
                  await db.query(
                    `UPDATE attempts SET status='completed', finished_at=NOW(), score=$1 WHERE id=$2`,
                    [score.toFixed(2), attempt_id]
                  );
                  
                  // Update assignment status
                  await db.query(
                    `UPDATE assignments SET status='completed', updated_at=NOW() WHERE quiz_id=$1 AND student_id=$2`,
                    [attempt.quiz_id, attempt.student_id]
                  );
                  
                  console.log(`[AUTO-SUBMIT-RESET] Auto-submitted attempt ${attempt_id} with score ${score.toFixed(2)}%`);
                  
                  // Notify client that quiz was auto-submitted
                  io.to(room).emit('quiz_submitted', { 
                    attempt_id, 
                    auto_submitted: true,
                    score: score.toFixed(2),
                    message: 'Quiz auto-submitted due to time expiration'
                  });
                }
              }
            } catch (autoSubmitError) {
              console.error(`[AUTO-SUBMIT-RESET] Error auto-submitting attempt ${attempt_id}:`, autoSubmitError);
            }
          }
        }, 1000);

        activeTimers.set(attempt_id, interval);
        socket.emit('admin_timer_reset', { attempt_id, new_duration: new_duration || 300 });
      } catch (e) {
        socket.emit('error', { message: 'Failed to reset timer' });
      }
    });

    socket.on('admin_reset_assignment', async ({ quiz_id, student_id }) => {
      try {
        if (!socket.userId) return socket.emit('error', { message: 'Not authenticated' });
        
        // Check if user is admin or teacher
        const userCheck = await db.query(`SELECT role FROM users WHERE id=$1`, [socket.userId]);
        if (!userCheck.rows.length || !['admin', 'teacher'].includes(userCheck.rows[0].role)) {
          return socket.emit('error', { message: 'Admin or teacher access required' });
        }

        // Reset assignment status
        await db.query(`
          UPDATE assignments 
          SET status='assigned', updated_at=NOW() 
          WHERE quiz_id=$1 AND student_id=$2
        `, [quiz_id, student_id]);

        // Delete any existing attempts for this quiz/student
        await db.query(`
          DELETE FROM attempts 
          WHERE quiz_id=$1 AND student_id=$2
        `, [quiz_id, student_id]);

        socket.emit('admin_assignment_reset', { quiz_id, student_id });
      } catch (e) {
        socket.emit('error', { message: 'Failed to reset assignment' });
      }
    });

    // Mass operations for admin
    socket.on('admin_mass_reset_timer', async ({ filters, new_duration }) => {
      try {
        if (!socket.userId) return socket.emit('error', { message: 'Not authenticated' });
        
        // Check if user is admin
        const userCheck = await db.query(`SELECT role FROM users WHERE id=$1`, [socket.userId]);
        if (!userCheck.rows.length || userCheck.rows[0].role !== 'admin') {
          return socket.emit('error', { message: 'Admin access required' });
        }

        // Get filtered attempts
        let query = `
          SELECT a.id as attempt_id, a.quiz_id, a.student_id
          FROM attempts a
          JOIN users u ON u.id = a.student_id
          JOIN quizzes q ON q.id = a.quiz_id
          WHERE a.status = 'in_progress'
        `;
        
        const queryParams = [];
        let paramCount = 0;
        
        // Add same filters as admin_get_live_attempts
        if (filters.school) {
          paramCount++;
          query += ` AND u.school ILIKE $${paramCount}`;
          queryParams.push(`%${filters.school}%`);
        }
        
        if (filters.class) {
          paramCount++;
          query += ` AND u.class ILIKE $${paramCount}`;
          queryParams.push(`%${filters.class}%`);
        }
        
        if (filters.section) {
          paramCount++;
          query += ` AND u.section ILIKE $${paramCount}`;
          queryParams.push(`%${filters.section}%`);
        }
        
        if (filters.quiz_title) {
          paramCount++;
          query += ` AND q.title ILIKE $${paramCount}`;
          queryParams.push(`%${filters.quiz_title}%`);
        }
        
        if (filters.student_name) {
          paramCount++;
          query += ` AND u.name ILIKE $${paramCount}`;
          queryParams.push(`%${filters.student_name}%`);
        }

        const attempts = await db.query(query, queryParams);
        let successCount = 0;
        let errorCount = 0;

        // Reset timer for each attempt
        for (const attempt of attempts.rows) {
          try {
            // Clear existing timer
            if (activeTimers.has(attempt.attempt_id)) {
              clearInterval(activeTimers.get(attempt.attempt_id));
              activeTimers.delete(attempt.attempt_id);
            }

            // Update attempt start time and persist override
            const nowMass = new Date();
            await db.query(`UPDATE attempts SET started_at=NOW(), state = jsonb_set(COALESCE(state,'{}'::jsonb), '{timer_override}', $1::jsonb, true) WHERE id=$2`, [
              JSON.stringify({ total_duration_sec: new_duration || 300, reset_at: nowMass.toISOString() }),
              attempt.attempt_id
            ]);

            // Start new timer
            const room = `attempt:${attempt.attempt_id}`;
            const newRemaining = new_duration || 300;
            
            // Update activeAttempts map
            activeAttempts.set(attempt.attempt_id, {
              userId: attempt.student_id,
              quizId: attempt.quiz_id,
              startTime: nowMass,
              remainingTime: newRemaining,
              totalDuration: new_duration || 300
            });
            
            io.to(room).emit('timer_update', {
              attempt_id: attempt.attempt_id,
              remaining_time: newRemaining,
              total_time: new_duration || 300
            });

            let remaining = newRemaining;
            const interval = setInterval(async () => {
              remaining -= 1;
              
              // Update the activeAttempts map
              if (activeAttempts.has(attempt.attempt_id)) {
                const currentAttempt = activeAttempts.get(attempt.attempt_id);
                activeAttempts.set(attempt.attempt_id, {
                  ...currentAttempt,
                  remainingTime: Math.max(0, remaining)
                });
              }
              
              io.to(room).emit('timer_update', {
                attempt_id: attempt.attempt_id,
                remaining_time: Math.max(0, remaining),
                total_time: new_duration || 300
              });
              
              if (remaining <= 0) {
                clearInterval(interval);
                activeTimers.delete(attempt.attempt_id);
                activeAttempts.delete(attempt.attempt_id);
                
                // Auto-submit logic (same as before)
                try {
                  const a = await db.query(`SELECT * FROM attempts WHERE id=$1 AND status='in_progress'`, [attempt.attempt_id]);
                  if (a.rows.length) {
                    const attemptData = a.rows[0];
                    const questions = attemptData.state?.questions || [];
                    
                    if (questions.length > 0) {
                      const qids = questions.map(q => q.id);
                      const qRows = await db.query(`SELECT id, correct_answers FROM questions WHERE id=ANY($1::int[])`, [qids]);
                      const byId = new Map(qRows.rows.map(r => [r.id, r.correct_answers || []]));
                      let earned = 0;
                      for (const q of questions) {
                        let ans = q.answer;
                        if (ans === null || ans === undefined || ans === '') continue;
                        if (!Array.isArray(ans)) ans = [ans];
                        const correct = byId.get(q.id) || [];
                        const same = correct.length === ans.length && correct.every(x => ans.includes(x));
                        if (same) earned++;
                      }
                      const total = questions.length;
                      const score = total > 0 ? (earned / total) * 100 : 0;
                      
                      await db.query(
                        `UPDATE attempts SET status='completed', finished_at=NOW(), score=$1 WHERE id=$2`,
                        [score.toFixed(2), attempt.attempt_id]
                      );
                      
                      await db.query(
                        `UPDATE assignments SET status='completed', updated_at=NOW() WHERE quiz_id=$1 AND student_id=$2`,
                        [attemptData.quiz_id, attemptData.student_id]
                      );
                      
                      io.to(room).emit('quiz_submitted', { 
                        attempt_id: attempt.attempt_id, 
                        auto_submitted: true,
                        score: score.toFixed(2),
                        message: 'Quiz auto-submitted due to time expiration'
                      });
                    }
                  }
                } catch (autoSubmitError) {
                  console.error(`[AUTO-SUBMIT-MASS] Error auto-submitting attempt ${attempt.attempt_id}:`, autoSubmitError);
                }
              }
            }, 1000);

            activeTimers.set(attempt.attempt_id, interval);
            successCount++;
          } catch (error) {
            console.error(`[MASS-RESET] Error resetting timer for attempt ${attempt.attempt_id}:`, error);
            errorCount++;
          }
        }

        socket.emit('admin_mass_timer_reset', { 
          success_count: successCount, 
          error_count: errorCount,
          total_attempts: attempts.rows.length
        });
      } catch (e) {
        socket.emit('error', { message: 'Failed to mass reset timers' });
      }
    });

    socket.on('admin_mass_reset_assignment', async ({ filters }) => {
      try {
        if (!socket.userId) return socket.emit('error', { message: 'Not authenticated' });
        
        // Check if user is admin
        const userCheck = await db.query(`SELECT role FROM users WHERE id=$1`, [socket.userId]);
        if (!userCheck.rows.length || userCheck.rows[0].role !== 'admin') {
          return socket.emit('error', { message: 'Admin access required' });
        }

        // Get filtered attempts
        let query = `
          SELECT a.id as attempt_id, a.quiz_id, a.student_id
          FROM attempts a
          JOIN users u ON u.id = a.student_id
          JOIN quizzes q ON q.id = a.quiz_id
          WHERE a.status = 'in_progress'
        `;
        
        const queryParams = [];
        let paramCount = 0;
        
        // Add same filters
        if (filters.school) {
          paramCount++;
          query += ` AND u.school ILIKE $${paramCount}`;
          queryParams.push(`%${filters.school}%`);
        }
        
        if (filters.class) {
          paramCount++;
          query += ` AND u.class ILIKE $${paramCount}`;
          queryParams.push(`%${filters.class}%`);
        }
        
        if (filters.section) {
          paramCount++;
          query += ` AND u.section ILIKE $${paramCount}`;
          queryParams.push(`%${filters.section}%`);
        }
        
        if (filters.quiz_title) {
          paramCount++;
          query += ` AND q.title ILIKE $${paramCount}`;
          queryParams.push(`%${filters.quiz_title}%`);
        }
        
        if (filters.student_name) {
          paramCount++;
          query += ` AND u.name ILIKE $${paramCount}`;
          queryParams.push(`%${filters.student_name}%`);
        }

        const attempts = await db.query(query, queryParams);
        let successCount = 0;
        let errorCount = 0;

        // Reset assignment for each attempt
        for (const attempt of attempts.rows) {
          try {
            // Clear any active timer
            if (activeTimers.has(attempt.attempt_id)) {
              clearInterval(activeTimers.get(attempt.attempt_id));
              activeTimers.delete(attempt.attempt_id);
            }
            activeAttempts.delete(attempt.attempt_id);

            // Delete the attempt
            await db.query(`DELETE FROM attempts WHERE id=$1`, [attempt.attempt_id]);

            // Reset assignment status
            await db.query(
              `UPDATE assignments SET status='assigned', updated_at=NOW() WHERE quiz_id=$1 AND student_id=$2`,
              [attempt.quiz_id, attempt.student_id]
            );

            successCount++;
          } catch (error) {
            console.error(`[MASS-RESET-ASSIGNMENT] Error resetting assignment for attempt ${attempt.attempt_id}:`, error);
            errorCount++;
          }
        }

        socket.emit('admin_mass_assignment_reset', { 
          success_count: successCount, 
          error_count: errorCount,
          total_attempts: attempts.rows.length
        });
      } catch (e) {
        socket.emit('error', { message: 'Failed to mass reset assignments' });
      }
    });

    socket.on('disconnect', () => {
      // No-op
    });
  });

  return io;
}

module.exports = { attachSocketServer };


