const db = require('../config/db');
const userStatsService = require('../services/userStatsService');

/**
 * Start an attempt
 */
async function startAttempt(req, res, next) {
  try {
    const { quiz_id } = req.body;
    const student_id = req.user.id;

    // Validate quiz_id is a valid integer
    const quizId = parseInt(quiz_id, 10);
    if (isNaN(quizId)) {
      console.log(`[DEBUG] startAttempt - Invalid quiz_id:`, quiz_id);
      return res.status(400).json({ error: 'invalid_quiz_id', details: 'quiz_id must be a valid number' });
    }

    console.log(`[DEBUG] startAttempt - Request received:`, {
      quiz_id: quizId,
      student_id,
      user_role: req.user.role,
      request_body: req.body
    });

    // Check if assigned
    const assignQ = await db.query(
      `SELECT * FROM assignments
       WHERE quiz_id = $1
         AND student_id = $2
         AND status = 'assigned'`,
      [quizId, student_id]
    );
    console.log(`[DEBUG] startAttempt - Assignment check:`, {
      found_assignments: assignQ.rows.length,
      assignment_details: assignQ.rows[0] || null
    });
    
    if (!assignQ.rows.length) {
      console.log(`[DEBUG] startAttempt - Quiz not assigned to student`);
      return res.status(403).json({ error: 'quiz_not_assigned' });
    }

    // Check for existing attempt
    const existingAttempt = await db.query(
      `SELECT id, status FROM attempts
       WHERE quiz_id = $1 AND student_id = $2
       ORDER BY started_at DESC
       LIMIT 1`,
      [quizId, student_id]
    );

    if (existingAttempt.rows.length) {
      const last = existingAttempt.rows[0];
      if (last.status === 'in_progress') {
        return res.status(400).json({
          error: 'attempt_already_in_progress',
          attempt_id: last.id
        });
      }
      if (last.status === 'completed') {
        return res.status(400).json({
          error: 'quiz_already_completed',
          attempt_id: last.id
        });
      }
    }

    // Check quiz exists
    const quizQ = await db.query(
      `SELECT id, title, description
       FROM quizzes
       WHERE id = $1`,
      [quizId]
    );
    if (!quizQ.rows.length)
      return res.status(404).json({ error: 'quiz_not_found' });

    // Fetch quiz questions via mapping table
    const questionsQ = await db.query(
      `SELECT q.id, q.question_text, q.question_type, q.options, q.image_url
       FROM questions q
       JOIN quiz_questions qq ON qq.question_id = q.id
       WHERE qq.quiz_id = $1
       ORDER BY qq.position ASC`,
      [quizId]
    );

    console.log(`[DEBUG] startAttempt - Questions fetched:`, {
      questions_count: questionsQ.rows.length,
      questions_detail: questionsQ.rows.map(q => ({
        id: q.id,
        question_type: q.question_type,
        options_count: Array.isArray(q.options) ? q.options.length : 0
      }))
    });

    const state = {
      quiz_id: quizId,
      questions: questionsQ.rows.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        image_url: q.image_url,
        answer: null // initially unanswered
      }))
    };

    console.log(`[DEBUG] startAttempt - Created state:`, {
      quiz_id: state.quiz_id,
      questions_count: state.questions.length,
      state_structure: {
        has_quiz_id: !!state.quiz_id,
        has_questions: !!state.questions,
        questions_with_answers: state.questions.filter(q => q.answer !== null).length
      }
    });

    // Create attempt
    const ins = await db.query(
      `INSERT INTO attempts (quiz_id, student_id, state, status, started_at)
       VALUES ($1, $2, $3, 'in_progress', NOW())
       RETURNING id`,
      [quizId, student_id, state]
    );

    console.log(`[DEBUG] startAttempt - Attempt created:`, {
      attempt_id: ins.rows[0].id,
      quiz_id: quizId,
      student_id,
      status: 'in_progress'
    });

    // Update assignment status to in_progress
    await db.query(
      `UPDATE assignments 
       SET status = 'in_progress', updated_at = NOW()
       WHERE quiz_id = $1 AND student_id = $2`,
      [quizId, student_id]
    );

    console.log(`[DEBUG] startAttempt - Assignment status updated to in_progress`);

    const response = {
      attempt_id: ins.rows[0].id,
      quiz: quizQ.rows[0],
      questions: state.questions
    };

    console.log(`[ATTEMPT_START]`, {
      attempt_id: response.attempt_id,
      student_id,
      quiz_id: quizId,
      state_questions: response.questions?.length,
      started_at: new Date().toISOString()
    });

    res.json(response);
  } catch (err) {
    next(err);
  }
}


/**
 * Sync attempt state periodically
 */
async function syncAttempt(req, res, next) {
  try {
    const attempt_id = parseInt(req.params.id, 10);
    const { state } = req.body;

    console.log(`[ATTEMPT_SYNC_IN]`, {
      attempt_id,
      student_id: req.user.id,
      state_quiz_id: state?.quiz_id,
      state_questions_count: state?.questions?.length,
      answered_ids: state?.questions?.filter(q => q.answer !== null && q.answer !== undefined && q.answer !== '').map(q => q.id)
    });

    const r = await db.query(
      `SELECT student_id, status, state FROM attempts WHERE id=$1`,
      [attempt_id]
    );

    console.log(`[DEBUG] syncAttempt - Attempt lookup:`, {
      found: r.rows.length > 0,
      attempt_details: r.rows[0] || null
    });

    if (!r.rows.length) {
      console.log(`[DEBUG] syncAttempt - Attempt not found`);
      return res.status(404).json({ error: 'attempt_not_found' });
    }

    const attempt = r.rows[0];
    if (attempt.student_id !== req.user.id) {
      console.log(`[DEBUG] syncAttempt - Forbidden: student_id mismatch`, {
        attempt_student_id: attempt.student_id,
        request_user_id: req.user.id
      });
      return res.status(403).json({ error: 'forbidden' });
    }

    if (attempt.status !== 'in_progress') {
      console.log(`[DEBUG] syncAttempt - Invalid status:`, {
        current_status: attempt.status,
        expected_status: 'in_progress'
      });
      return res.status(400).json({ error: 'attempt_not_in_progress' });
    }

    console.log(`[DEBUG] syncAttempt - Preparing merge (no overwrite with nulls):`, {
      attempt_id,
      incoming_answered_ids: state?.questions?.filter(q => q.answer !== null && q.answer !== undefined && q.answer !== '').map(q => q.id)
    });

    // Merge incoming state with existing: keep existing answers if incoming is null/empty
    const existingState = r.rows[0].state || {};
    const existingQuestions = Array.isArray(existingState.questions) ? existingState.questions : [];
    const incomingQuestions = Array.isArray(state?.questions) ? state.questions : [];

    const incomingById = new Map(incomingQuestions.map(q => [q.id, q]));

    const mergedQuestions = existingQuestions.map(eq => {
      const iq = incomingById.get(eq.id) || {};
      const incomingAnswer = iq.answer;
      const shouldUpdate = incomingAnswer !== null && incomingAnswer !== undefined && incomingAnswer !== '';
      return {
        ...eq,
        // Allow updating other fields like options if sent; prefer existing otherwise
        question_text: iq.question_text ?? eq.question_text,
        question_type: iq.question_type ?? eq.question_type,
        options: iq.options ?? eq.options,
        answer: shouldUpdate ? incomingAnswer : eq.answer
      };
    });

    // Handle any new questions present only in incoming (edge case)
    const existingIds = new Set(existingQuestions.map(q => q.id));
    const newOnes = incomingQuestions.filter(q => !existingIds.has(q.id));
    // Preserve any extra top-level fields by shallow-merging existing and incoming state
    const mergedState = {
      ...existingState,
      ...state,
      quiz_id: existingState.quiz_id ?? state?.quiz_id,
      questions: mergedQuestions.concat(newOnes),
      current_question_index: Number.isInteger(state?.current_question_index)
        ? state.current_question_index
        : (Number.isInteger(existingState.current_question_index) ? existingState.current_question_index : undefined),
      current_question_id: state?.current_question_id ?? existingState.current_question_id
    };

    console.log(`[ATTEMPT_SYNC_OUT]`, {
      attempt_id,
      total_questions: mergedState.questions.length,
      answered_after_merge: mergedState.questions.filter(q => q.answer !== null && q.answer !== undefined && q.answer !== '').length,
      current_question_index: mergedState.current_question_index,
      current_question_id: mergedState.current_question_id
    });

    await db.query(
      `UPDATE attempts SET state=$1, last_synced_at=NOW() WHERE id=$2`,
      [mergedState, attempt_id]
    );

    console.log(`[ATTEMPT_SYNC_DONE]`, { attempt_id });

    const response = { message: 'attempt_synced' };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * Submit attempt and grade
 */
async function submitAttempt(req, res, next) {
  try {
    const attempt_id = parseInt(req.params.id, 10);
    
    console.log(`[ATTEMPT_SUBMIT_IN]`, { attempt_id, student_id: req.user.id, user_role: req.user.role });

    const a = await db.query(`SELECT * FROM attempts WHERE id=$1`, [attempt_id]);
    
    console.log(`[ATTEMPT_SUBMIT_LOOKUP]`, {
      found: a.rows.length > 0,
      attempt: a.rows[0] ? {
        id: a.rows[0].id,
        quiz_id: a.rows[0].quiz_id,
        student_id: a.rows[0].student_id,
        status: a.rows[0].status,
        score: a.rows[0].score,
        started_at: a.rows[0].started_at
      } : null
    });

    if (!a.rows.length) {
      console.log(`[DEBUG] submitAttempt - Attempt not found`);
      return res.status(404).json({ error: 'attempt_not_found' });
    }
    
    const attempt = a.rows[0];
    if (attempt.student_id !== req.user.id) {
      console.log(`[DEBUG] submitAttempt - Forbidden: student_id mismatch`, {
        attempt_student_id: attempt.student_id,
        request_user_id: req.user.id
      });
      return res.status(403).json({ error: 'forbidden' });
    }

    const state = attempt.state || {};
    const questions = state.questions || [];
    
    console.log(`[ATTEMPT_SUBMIT_STATE]`, {
      has_state: !!state,
      questions_count: questions.length,
      questions_with_answers: questions.filter(q => q.answer !== null && q.answer !== undefined).length,
      questions_detail: questions.map(q => ({
        id: q.id,
        question_type: q.question_type,
        has_answer: q.answer !== null && q.answer !== undefined,
        answer: q.answer
      }))
    });

    // Additional detailed logging for debugging question skipping
    console.log(`[DEBUG] submitAttempt - Detailed question analysis:`, {
      all_questions: questions.map((q, idx) => ({
        index: idx,
        id: q.id,
        question_type: q.question_type,
        has_answer: q.answer !== null && q.answer !== undefined,
        answer: q.answer,
        answer_type: typeof q.answer
      })),
      unanswered_questions: questions.filter(q => q.answer === null || q.answer === undefined || q.answer === '').map(q => ({
        id: q.id,
        question_type: q.question_type,
        answer: q.answer
      })),
      answered_questions: questions.filter(q => q.answer !== null && q.answer !== undefined && q.answer !== '').map(q => ({
        id: q.id,
        question_type: q.question_type,
        answer: q.answer
      }))
    });

    if (!questions.length) {
      console.log(`[DEBUG] submitAttempt - No questions found in state`);
      return res.status(400).json({ error: 'no_questions_found' });
    }
    
    const qids = questions.map(q => q.id);

    console.log(`[DEBUG] submitAttempt - Fetching correct answers for questions:`, qids);

    const qRows = await db.query(
      `SELECT id, question_type, correct_answers 
       FROM questions WHERE id=ANY($1::int[])`,
      [qids]
    );

    console.log(`[DEBUG] submitAttempt - Correct answers fetched:`, {
      questions_found: qRows.rows.length,
      questions_detail: qRows.rows.map(r => ({
        id: r.id,
        question_type: r.question_type,
        correct_answers: r.correct_answers
      }))
    });

    const byId = new Map(qRows.rows.map(r => [r.id, r]));
    let total = 0, earned = 0, unanswered = 0;
    
    console.log(`[ATTEMPT_SUBMIT_GRADE_START]`);
    
    for (const q of state.questions) {
      const row = byId.get(q.id);
      if (!row) {
        console.log(`[DEBUG] submitAttempt - Question ${q.id} not found in database`);
        continue;
      }
      
      let ans = q.answer;
      if (ans === null || ans === undefined || ans === '') {
        console.log(`[DEBUG] submitAttempt - Question ${q.id} has no answer (unanswered)`);
        unanswered++;
        continue; // Treat as incorrect for scoring; still counted in total via total_questions_in_quiz
      }
      
      if (!Array.isArray(ans)) ans = [ans];
      const correct = row.correct_answers || [];
      
      // Enhanced debugging for grading
      console.log(`[ATTEMPT_SUBMIT_GRADE_Q]`, {
        question_id: q.id,
        question_type: row.question_type,
        student_answer: ans,
        correct_answers: correct,
        answer_type: typeof ans[0],
        correct_type: typeof correct[0]
      });
      
      const correctSet = new Set(correct);
      const ansSet = new Set(ans);
      const same = correctSet.size === ansSet.size && [...correctSet].every(x => ansSet.has(x));
      
      console.log(`[ATTEMPT_SUBMIT_GRADE_Q_RESULT]`, { question_id: q.id, correctSet: Array.from(correctSet), ansSet: Array.from(ansSet), isCorrect: same });
      
      if (same) earned++;
    }
    // Score should include unanswered questions in denominator
    const totalQuestionsInQuiz = state.questions.length;
    const score = totalQuestionsInQuiz > 0 ? Math.round(((earned / totalQuestionsInQuiz) * 100) * 100) / 100 : 0;
    
    console.log(`[ATTEMPT_SUBMIT_GRADE_SUMMARY]`, {
      total_questions_answered: total,
      unanswered_questions: unanswered,
      correct_answers: earned,
      score_percentage: score,
      score_decimal: score / 100
    });

    await db.query(
      `UPDATE attempts SET finished_at=now(), score=$1, status='completed' WHERE id=$2`,
      [score, attempt_id]
    );

    console.log(`[ATTEMPT_SUBMIT_DB_UPDATE]`, { attempt_id });

    // Update assignment status to completed
    await db.query(
      `UPDATE assignments 
       SET status = 'completed', updated_at = NOW()
       WHERE quiz_id = $1 AND student_id = $2`,
      [attempt.quiz_id, attempt.student_id]
    );

    console.log(`[ATTEMPT_SUBMIT_ASSIGNMENT_UPDATE]`, { quiz_id: attempt.quiz_id, student_id: attempt.student_id });

    // Update user statistics
    try {
      const timeMinutes = attempt.finished_at && attempt.started_at 
        ? (new Date(attempt.finished_at) - new Date(attempt.started_at)) / (1000 * 60)
        : 0;
      
      // Check if this is a new quiz for this user
      const existingAttempts = await db.query(
        'SELECT COUNT(*) as count FROM attempts WHERE student_id = $1 AND quiz_id = $2 AND id != $3',
        [attempt.student_id, attempt.quiz_id, attempt_id]
      );
      const isNewQuiz = parseInt(existingAttempts.rows[0].count) === 0;
      
      await userStatsService.updateUserStatsAfterAttempt(attempt.student_id, {
        score,
        totalQuestions: totalQuestionsInQuiz,
        correctAnswers: earned,
        timeMinutes,
        isNewQuiz
      });
      
      console.log(`[DEBUG] submitAttempt - User stats updated successfully`);
    } catch (statsError) {
      console.error(`[ERROR] submitAttempt - Failed to update user stats:`, statsError);
      // Don't fail the request if stats update fails
    }

    const response = { 
      score, 
      total_questions: total, 
      correct: earned,
      unanswered: unanswered,
      total_questions_in_quiz: totalQuestionsInQuiz
    };
    console.log(`[DEBUG] submitAttempt - Sending response:`, response);
    res.json(response);
  } catch (err) { next(err); }
}

/**
 * Get attempt details
 */
async function getAttempt(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    
    // Validate attempt_id is a valid integer
    if (isNaN(id)) {
      console.log(`[DEBUG] getAttempt - Invalid attempt_id:`, req.params.id);
      return res.status(400).json({ error: 'invalid_attempt_id', details: 'attempt_id must be a valid number' });
    }
    
    console.log(`[DEBUG] getAttempt - Request received:`, {
      attempt_id: id,
      user_id: req.user.id,
      user_role: req.user.role
    });

    const r = await db.query(`SELECT * FROM attempts WHERE id=$1`, [id]);
    
    console.log(`[DEBUG] getAttempt - Database lookup:`, {
      found: r.rows.length > 0,
      attempt_details: r.rows[0] ? {
        id: r.rows[0].id,
        quiz_id: r.rows[0].quiz_id,
        student_id: r.rows[0].student_id,
        status: r.rows[0].status,
        score: r.rows[0].score,
        has_state: !!r.rows[0].state,
        state_questions_count: r.rows[0].state?.questions?.length || 0
      } : null
    });

    if (!r.rows.length) {
      console.log(`[DEBUG] getAttempt - Attempt not found`);
      return res.status(404).json({ error: 'not_found' });
    }
    
    const attempt = r.rows[0];

    // Only student who owns, or teacher/admin can see
    if (
      req.user.role === 'student' &&
      req.user.id !== attempt.student_id
    ) {
      console.log(`[DEBUG] getAttempt - Forbidden: student access denied`, {
        attempt_student_id: attempt.student_id,
        request_user_id: req.user.id
      });
      return res.status(403).json({ error: 'forbidden' });
    }

    // If attempt is submitted, enhance with correct answers for review
    if (attempt.status === 'completed' && attempt.state && attempt.state.questions) {
      const questionIds = attempt.state.questions.map(q => q.id);
      
      console.log(`[DEBUG] getAttempt - Enhancing submitted attempt with correct answers:`, {
        question_ids: questionIds
      });
      
      if (questionIds.length > 0) {
        const correctAnswersQ = await db.query(
          `SELECT id, correct_answers FROM questions WHERE id = ANY($1::int[])`,
          [questionIds]
        );
        
        console.log(`[DEBUG] getAttempt - Correct answers fetched:`, {
          questions_found: correctAnswersQ.rows.length,
          correct_answers_detail: correctAnswersQ.rows.map(r => ({
            id: r.id,
            correct_answers: r.correct_answers
          }))
        });
        
        const correctAnswersMap = new Map(
          correctAnswersQ.rows.map(row => [row.id, row.correct_answers])
        );

        // Enhance questions with correct answers
        attempt.state.questions = attempt.state.questions.map(q => ({
          ...q,
          correct_answers: correctAnswersMap.get(q.id) || []
        }));
        
        console.log(`[DEBUG] getAttempt - Questions enhanced with correct answers`);
      }
    }

    console.log(`[DEBUG] getAttempt - Sending response:`, {
      attempt_id: attempt.id,
      status: attempt.status,
      score: attempt.score,
      questions_count: attempt.state?.questions?.length || 0,
      questions_with_answers: attempt.state?.questions?.filter(q => q.answer !== null).length || 0
    });
    
    res.json(attempt);
  } catch (err) { next(err); }
}

/**
 * Get my attempts (student only)
 */
async function getMyAttempts(req, res, next) {
  try {
    
    const student_id = req.user.id;
    
    const attempts = await db.query(
      `SELECT id, quiz_id, started_at, finished_at, score, status, state
       FROM attempts 
       WHERE student_id = $1
       ORDER BY started_at DESC`,
      [student_id]
    );
    
    res.json(attempts.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Get active attempt for a user (for quiz recovery)
 */
async function getActiveAttempt(req, res, next) {
  try {
    const student_id = req.user.id;
    
    // Get the most recent in-progress attempt
    const attempt = await db.query(
      `SELECT 
        a.id, 
        a.quiz_id, 
        a.started_at, 
        a.state, 
        a.status,
        q.title as quiz_title,
        q.description as quiz_description,
        q.total_time,
        q.difficulty,
        q.tags
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.student_id = $1 
         AND a.status = 'in_progress'
       ORDER BY a.started_at DESC
       LIMIT 1`,
      [student_id]
    );
    
    if (attempt.rows.length === 0) {
      return res.status(404).json({ error: 'no_active_attempt' });
    }
    
    const attemptData = attempt.rows[0];
    
    // Calculate remaining time
    const now = new Date();
    const startTime = new Date(attemptData.started_at);
    const totalTimeSeconds = attemptData.total_time || 3600; // Default 1 hour
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const remainingSeconds = Math.max(0, totalTimeSeconds - elapsedSeconds);
    
    // Check if time has expired
    const isExpired = remainingSeconds === 0;
    
    res.json({
      attempt_id: attemptData.id,
      quiz_id: attemptData.quiz_id,
      quiz_title: attemptData.quiz_title,
      quiz_description: attemptData.quiz_description,
      quiz_difficulty: attemptData.difficulty,
      quiz_tags: attemptData.tags,
      started_at: attemptData.started_at,
      state: attemptData.state,
      status: attemptData.status,
      total_time: totalTimeSeconds,
      remaining_time: remainingSeconds,
      is_expired: isExpired,
      can_resume: !isExpired
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resume a quiz attempt (restore timer and state)
 */
async function resumeAttempt(req, res, next) {
  try {
    const { attempt_id } = req.params;
    const student_id = req.user.id;
    
    // Verify the attempt belongs to the user and is in progress
    const attempt = await db.query(
      `SELECT 
        a.id, 
        a.quiz_id, 
        a.started_at, 
        a.state, 
        a.status,
        q.title as quiz_title,
        q.description as quiz_description,
        q.total_time
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.id = $1 
         AND a.student_id = $2 
         AND a.status = 'in_progress'`,
      [attempt_id, student_id]
    );
    
    if (attempt.rows.length === 0) {
      return res.status(404).json({ error: 'attempt_not_found_or_not_active' });
    }
    
    const attemptData = attempt.rows[0];
    
    // Calculate remaining time
    const now = new Date();
    const startTime = new Date(attemptData.started_at);
    const totalTimeSeconds = attemptData.total_time || 3600;
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const remainingSeconds = Math.max(0, totalTimeSeconds - elapsedSeconds);
    
    // Check if time has expired
    if (remainingSeconds === 0) {
      // Auto-submit the quiz
      await submitAttempt({ params: { id: attempt_id }, user: { id: student_id } }, res, next);
      return;
    }
    
    res.json({
      attempt_id: attemptData.id,
      quiz_id: attemptData.quiz_id,
      quiz_title: attemptData.quiz_title,
      quiz_description: attemptData.quiz_description,
      started_at: attemptData.started_at,
      state: attemptData.state,
      status: attemptData.status,
      total_time: totalTimeSeconds,
      remaining_time: remainingSeconds,
      is_expired: false,
      can_resume: true
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset attempt (admin/teacher only)
 */
async function resetAttempt(req, res, next) {
  try {
    const { student_id, quiz_id } = req.body;

    const quizQ = await db.query(
      `SELECT id FROM quizzes WHERE id=$1`,
      [quiz_id]
    );
    if (!quizQ.rows.length)
      return res.status(404).json({ error: 'quiz_not_found' });

    await db.query(
      `DELETE FROM attempts
       WHERE quiz_id=$1 AND student_id=$2`,
      [quiz_id, student_id]
    );

    res.json({ message: 'attempts_reset' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startAttempt,
  syncAttempt,
  submitAttempt,
  getAttempt,
  getMyAttempts,
  getActiveAttempt,
  resumeAttempt,
  resetAttempt
};
