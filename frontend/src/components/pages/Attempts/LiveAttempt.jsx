// File: components/pages/Student/LiveAttempt.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from 'react-toastify';
import { connect as socketConnect, startTimer as socketStartTimer, on as socketOn, off as socketOff, syncState as socketSyncState, syncStateAck as socketSyncStateAck, getAttempt as socketGetAttempt, submitAttemptSocket } from '../../../services/socketClient';
import { Loader2, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const LiveAttempt = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const newAttemptData = state?.attempt; // Data passed for a new attempt

  // Socket-only mode for attempts

  // Core state
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Stores answers by question ID
  const answersRef = useRef({}); // Keep a ref to track answers
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isResuming, setIsResuming] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [attemptStatus, setAttemptStatus] = useState('in_progress');
  const [readOnly, setReadOnly] = useState(false);

  // Fallback timer for when WebSocket is not ready
  const [fallbackTimer, setFallbackTimer] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // Refs
  const syncRef = useRef(null);
  const debounceRef = useRef(null);
  const lastIndexChangeAtRef = useRef(0);
  const lastAnswerChangeAtRef = useRef(new Map()); // questionId -> ts
  const tabIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const bcRef = useRef(null);

  // Helper function to normalize options format
  const normalizeOptions = (options) => {
    if (!options || !Array.isArray(options)) return [];
    
    return options.map((opt, index) => {
      if (typeof opt === 'object' && opt.id && opt.text) {
        return opt;
      } else if (typeof opt === 'string') {
        return { id: index.toString(), text: opt };
      } else {
        return { id: index.toString(), text: String(opt) };
      }
    });
  };

  // Format time helper
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit via socket
  const handleSubmit = async () => {
    if (submitting) return;
    
    // Guard: Don't submit if attempt is not in progress
    if (attemptStatus !== 'in_progress') {
      console.log('[DEBUG] LiveAttempt - Cannot submit: attempt not in progress, status:', attemptStatus);
      return;
    }
    
    try {
      setSubmitting(true);
      // Final socket sync then submit
      // Ensure last state is persisted before submitting
      await performSync(true);
      const result = await submitAttemptSocket(parseInt(attemptId));
      
      // Create a detailed success message
      const roundedScore = Math.round(parseFloat(result.score) * 100) / 100;
      let successMessage = `Quiz submitted! Score: ${roundedScore}% (${result.correct}/${result.total_questions} correct)`;
      if (result.unanswered > 0) {
        successMessage += ` - ${result.unanswered} unanswered`;
      }
      
      toast.success(successMessage);
      navigate(`/attempts/result/${attemptId}`);
      // Mark as completed and stop syncing
      setAttemptStatus('completed');
      if (syncRef.current) clearInterval(syncRef.current);
    } catch (err) {
      console.error('[DEBUG] LiveAttempt - Submission failed:', err);
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // Simple sync function - Socket only
  const performSync = useCallback(async (answersToSync) => {
    if (questions.length === 0 || syncing) return;
    if (attemptStatus !== 'in_progress') return;
    
    const answersToUse = answersToSync || answersRef.current;
    
    const questionsWithAnswers = questions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      image_url: q.image_url,
      answer: answersToUse[q.id] || null
    }));
    
    const state = {
      quiz_id: parseInt(attemptId),
      questions: questionsWithAnswers,
      current_question_index: currentQuestionIndex,
      current_question_id: questions[currentQuestionIndex]?.id
    };
    
    try {
      setSyncing(true);
      await socketSyncStateAck(parseInt(attemptId), state, 4000, tabIdRef.current);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }, [questions, syncing, attemptId, currentQuestionIndex, attemptStatus]);

  // Handle answer selection
  const handleAnswerSelect = (questionId, value) => {
    setAnswers(prevAnswers => {
      const newAnswers = {
      ...prevAnswers,
      [questionId]: value
      };

      // Update ref and sync immediately
      answersRef.current = newAnswers;
      // Track per-question change time
      lastAnswerChangeAtRef.current.set(questionId, Date.now());
      // Debounce sync
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        performSync(newAnswers);
      }, 400);

      return newAnswers;
    });
  };

  // Simple navigation functions
  const syncIndex = async (newIndex) => {
    try {
      const questionsWithAnswers = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        image_url: q.image_url,
        answer: (answersRef.current || {})[q.id] || null
      }));
      const state = {
        quiz_id: parseInt(attemptId),
        questions: questionsWithAnswers,
        current_question_index: newIndex,
        current_question_id: questions[newIndex]?.id
      };
      await socketSyncStateAck(parseInt(attemptId), state, 4000, tabIdRef.current);
      setLastSyncTime(new Date());
    } catch {}
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      lastIndexChangeAtRef.current = Date.now();
      syncIndex(nextIdx);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIdx = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIdx);
      lastIndexChangeAtRef.current = Date.now();
      syncIndex(prevIdx);
    }
  };

  // Load attempt data via socket
  useEffect(() => {
    // Multi-tab coordination: claim lock via BroadcastChannel
    try {
      bcRef.current = new BroadcastChannel('attempt-lock');
      const myTabId = tabIdRef.current;
      let hasOwner = false;
      const onMsg = (e) => {
        const msg = e.data || {};
        if (msg.type === 'claim' && msg.attemptId === attemptId) {
          // Another tab claims ownership; respond with my presence
          bcRef.current.postMessage({ type: 'present', attemptId, tabId: myTabId });
        } else if (msg.type === 'owner' && msg.attemptId === attemptId && msg.tabId !== myTabId) {
          hasOwner = true;
          // Keep both tabs editable; no readOnly enforcement
        } else if (msg.type === 'present' && msg.attemptId === attemptId && msg.tabId !== myTabId) {
          hasOwner = true;
          // Keep both tabs editable; no readOnly enforcement
        }
      };
      bcRef.current.onmessage = onMsg;
      // Claim ownership
      bcRef.current.postMessage({ type: 'claim', attemptId, tabId: myTabId });
      // If no one responds within 300ms, become owner
      const ownerTimer = setTimeout(() => {
        if (!hasOwner) {
          setReadOnly(false);
          bcRef.current.postMessage({ type: 'owner', attemptId, tabId: myTabId });
        }
      }, 300);
      // Cleanup
      return () => {
        try { clearTimeout(ownerTimer); } catch {}
        try { bcRef.current && bcRef.current.close(); } catch {}
      };
    } catch {}
  }, [attemptId]);

  useEffect(() => {
    const loadAttempt = async () => {
      setLoading(true);
      try {
        let attemptData;
        
        if (!newAttemptData) {
          const token = localStorage.getItem('accessToken');
          socketConnect(token);
          attemptData = await socketGetAttempt(parseInt(attemptId));
        } else {
          attemptData = newAttemptData;
        }
        
        // Check if attempt is already submitted
        if (attemptData.status === 'completed' || attemptData.finished_at) {
          console.log('[DEBUG] LiveAttempt - Attempt already submitted, redirecting to results');
          navigate(`/attempts/result/${attemptId}`);
          return;
        }
        setAttemptStatus(attemptData.status || 'in_progress');
        
        
        // Prefer saved state from DB; fallback to raw quiz questions
        let questionsData;
        if (attemptData.state && Array.isArray(attemptData.state.questions)) {
          questionsData = attemptData.state.questions;
        } else if (Array.isArray(attemptData.questions)) {
          questionsData = attemptData.questions;
        } else {
          questionsData = [];
        }
        
        // Set questions and quiz data
        setQuestions(questionsData);
        setQuizData(attemptData.quiz);
        
        // Set start time and total time for fallback timer
        if (attemptData.started_at) {
          setStartTime(new Date(attemptData.started_at));
        } else {
          setStartTime(new Date());
        }
        // Use server-provided total_time if available
        const tt = attemptData.total_time || attemptData.quiz?.total_time || 300;
        setTotalTime(tt);
        setFallbackTimer(typeof attemptData.remaining_time === 'number' ? attemptData.remaining_time : tt);
        // If remaining time is explicitly provided and is zero, redirect to results
        if (attemptData.remaining_time === 0) {
          navigate(`/attempts/result/${attemptId}`);
          return;
        }
        
        // Load existing answers from database (use the same source as questionsData)
        const questionsToCheck = Array.isArray(questionsData) ? questionsData : [];
        
          const existingAnswers = {};
        questionsToCheck.forEach(q => {
          if (q.answer !== null && q.answer !== undefined) {
              existingAnswers[q.id] = q.answer;
            }
          });
        
        if (Object.keys(existingAnswers).length > 0) {
          setAnswers(existingAnswers);
          answersRef.current = existingAnswers;
          toast.success('Resumed previous quiz attempt');
        }

        // Restore current question index if saved
        const savedIndex = attemptData.state?.current_question_index;
        const savedId = attemptData.state?.current_question_id;
        if (Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < questionsData.length) {
          setCurrentQuestionIndex(savedIndex);
        } else if (savedId) {
          const idx = questionsData.findIndex(q => q.id === savedId);
          if (idx >= 0) setCurrentQuestionIndex(idx);
        }
      } catch (err) {
        console.error('Failed to load attempt:', err);
        toast.error('Failed to load quiz attempt.');
        navigate('/dashboard'); // Redirect to dashboard on error
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId, newAttemptData, navigate]);

  // No WebSocket timer expiry in REST-only mode

  // Socket lifecycle: connect on mount, start timer, listen, disconnect on unmount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    socketConnect(token);
    const onAuth = async () => {
      const idNum = parseInt(attemptId);
      socketStartTimer(idNum);
      try {
        const attemptData = await socketGetAttempt(idNum);
        // Apply server state and ensure room join via get_attempt
        const questionsData = Array.isArray(attemptData?.state?.questions) ? attemptData.state.questions : [];
        setQuestions(questionsData);
        const newAnswers = {};
        questionsData.forEach(q => { if (q.answer !== null && q.answer !== undefined) newAnswers[q.id] = q.answer; });
        setAnswers(newAnswers);
        answersRef.current = newAnswers;
        if (Number.isInteger(attemptData?.state?.current_question_index)) {
          setCurrentQuestionIndex(Math.min(Math.max(0, attemptData.state.current_question_index), questionsData.length - 1));
        }
      } catch {}
    };
    // Start when authenticated; also fallback-start shortly after connect
    socketOn('authenticated', onAuth);
    const t = setTimeout(onAuth, 500);

    const handleTimer = ({ attempt_id, remaining_time, total_time }) => {
      if (parseInt(attemptId) !== attempt_id) return;
      setTotalTime(total_time || 300);
      setFallbackTimer(remaining_time || 0);
      // Server will handle auto-submission when timer expires
    };

    socketOn('timer_update', handleTimer);
    const handleStateUpdate = ({ attempt_id, state, source }) => {
      if (parseInt(attemptId) !== attempt_id) return;
      if (source && source === tabIdRef.current) return;
      // Apply server state
      const questionsData = Array.isArray(state?.questions) ? state.questions : [];
      setQuestions(questionsData);
      // Merge answers with simple recency guard (500ms)
      const now = Date.now();
      const mergedAnswers = { ...answersRef.current };
      questionsData.forEach(q => {
        const incoming = q.answer;
        if (incoming === null || incoming === undefined) return;
        const lastLocal = lastAnswerChangeAtRef.current.get(q.id) || 0;
        if (now - lastLocal > 500) {
          mergedAnswers[q.id] = incoming;
        }
      });
      setAnswers(mergedAnswers);
      answersRef.current = mergedAnswers;
      // Restore current index
      if (Number.isInteger(state?.current_question_index)) {
        if (Date.now() - lastIndexChangeAtRef.current > 500) {
          setCurrentQuestionIndex(Math.min(Math.max(0, state.current_question_index), questionsData.length - 1));
        }
      }
    };
    socketOn('state_update', handleStateUpdate);
    
    const handleQuizSubmitted = ({ attempt_id, score, total_questions, correct, unanswered, auto_submitted }) => {
      console.log('[QUIZ-SUBMITTED] Received event:', { attempt_id, score, total_questions, correct, unanswered, auto_submitted });
      if (parseInt(attemptId) !== attempt_id) return;
      if (auto_submitted) {
        console.log('[QUIZ-SUBMITTED] Auto-submitted, showing toast and navigating...');
        toast.info('Quiz was automatically submitted due to time expiration.');
        // Add a longer delay to ensure database is fully updated via REST API
        setTimeout(() => {
          console.log(`[QUIZ-SUBMITTED] Navigating to /attempts/result/${attempt_id}`);
          navigate(`/attempts/result/${attempt_id}`);
        }, 3000);
      } else {
        console.log('[QUIZ-SUBMITTED] Manual submission, navigating immediately...');
        // Navigate immediately for manual submissions
        navigate(`/attempts/result/${attempt_id}`);
      }
    };
    
    socketOn('quiz_submitted', handleQuizSubmitted);
    
    return () => {
      socketOff('timer_update', handleTimer);
      socketOff('state_update', handleStateUpdate);
      socketOff('authenticated', onAuth);
      socketOff('quiz_submitted', handleQuizSubmitted);
      clearTimeout(t);
    };
  }, [attemptId, attemptStatus]);

  // Set up periodic sync
  useEffect(() => {
    if (questions.length === 0) return;

    // Clear any existing intervals
    if (syncRef.current) clearInterval(syncRef.current);

    // Periodic sync every 5 seconds
    syncRef.current = setInterval(() => {
      performSync();
    }, 5000);

    // Cleanup on unmount
    return () => {
      if (syncRef.current) clearInterval(syncRef.current);
    };
  }, [questions.length]);

  // Flush a final sync on unmount/navigation
  useEffect(() => {
    return () => {
      if (questions.length > 0 && attemptStatus === 'in_progress') {
        try { performSync(); } catch (e) {}
      }
    };
  }, [questions.length, attemptStatus, performSync]);

  const currentQuestion = questions[currentQuestionIndex];


  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-4" />
          <p className="text-lg">No questions available</p>
        </div>
      </div>
    );
  }

  const normalizedOptions = normalizeOptions(currentQuestion.options);

  return (
    <div className="p-6">
      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-4 p-4 bg-base-200 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="font-medium">Quiz</span>
          <div className="badge badge-primary">Timed Mode</div>
          {isResuming && (
            <div className="badge badge-info">Resumed</div>
          )}
          <span className="text-sm text-gray-600">
            {questions.length} questions
          </span>
        </div>
        
        {/* Timer Display */}
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          <span className={`font-mono text-lg ${fallbackTimer <= 60 ? 'text-error' : 'text-warning'}`}>
            {formatTime(fallbackTimer)}
          </span>
        </div>
      </div>

      {/* Timer Progress Bar */}
      <div className="mb-4">
        <progress
          className={`progress w-full ${fallbackTimer <= 60 ? 'progress-error' : 'progress-warning'}`}
          value={((Math.max(totalTime, 1) - fallbackTimer) / Math.max(totalTime, 1)) * 100}
          max={100}
        />
        <div className="text-center text-sm text-gray-600 mt-1">
          Quiz time remaining: {formatTime(fallbackTimer)} (Server-controlled)
        </div>
      </div>

      {/* Mode Status */}
      <div className="alert alert-info mb-4">
        <AlertTriangle className="w-4 h-4" />
        <span>Using WebSocket mode - auto-save enabled</span>
      </div>

      {/* Sync Status */}
      <div className="alert alert-info mb-4">
        <AlertTriangle className="w-4 h-4" />
        <span>
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Saving...
            </>
          ) : lastSyncTime ? (
            `Last saved: ${lastSyncTime.toLocaleTimeString()}`
          ) : (
            'Auto-saving enabled'
          )}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Question Panel */}
        <div className="flex-1 space-y-4">
          {/* Question */}
          <div className="card bg-base-200 border border-base-300 shadow">
            <div className="card-body space-y-4">
              <h2 className="card-title">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <p className="text-lg">{currentQuestion.question_text}</p>
              
              {/* Question Image */}
              {currentQuestion.image_url && (
                <div className="my-4">
                  <img 
                    src={currentQuestion.image_url} 
                    alt="Question image" 
                    className="max-w-full h-48 object-contain rounded border mx-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                {/* MCQ and True/False */}
                {(currentQuestion.question_type === "mcq" ||
                  currentQuestion.question_type === "true_false" ||
                  currentQuestion.question_type === "truefalse") &&
                  normalizedOptions.map((opt, idx) => {
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer ${
                          answers[currentQuestion.id] === opt.id
                            ? "border-primary bg-base-100"
                            : "border-base-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion.id}`}
                          className="radio"
                          checked={answers[currentQuestion.id] === opt.id}
                          onChange={() => handleAnswerSelect(currentQuestion.id, opt.id)}
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}

                {/* Type-in Questions */}
                {(currentQuestion.question_type === "type_in" || currentQuestion.question_type === "typed") && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    />
                  </div>
                )}

                {/* Multiple Choice */}
                {currentQuestion.question_type === "multiple_choice" &&
                  normalizedOptions.map((opt, idx) => {
                    const currentAnswers = Array.isArray(answers[currentQuestion.id]) 
                      ? answers[currentQuestion.id] 
                      : answers[currentQuestion.id] ? [answers[currentQuestion.id]] : [];
                    
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer ${
                          currentAnswers.includes(opt.id)
                            ? "border-primary bg-base-100"
                            : "border-base-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name={`q-${currentQuestion.id}`}
                          className="checkbox"
                          checked={currentAnswers.includes(opt.id)}
                          onChange={(e) => {
                            const newAnswers = e.target.checked
                              ? [...currentAnswers, opt.id]
                              : currentAnswers.filter(id => id !== opt.id);
                            handleAnswerSelect(currentQuestion.id, newAnswers);
                          }}
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}

                {/* Numeric Questions */}
                {currentQuestion.question_type === "numeric" && (
                  <div className="space-y-2">
                    <input
                      type="number"
                      className="input input-bordered w-full"
                      placeholder="Enter a number..."
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              className="btn btn-secondary"
              disabled={currentQuestionIndex === 0}
              onClick={goToPreviousQuestion}
            >
              Previous
            </button>
            
            {currentQuestionIndex === questions.length - 1 ? (
              <button
                className="btn btn-primary"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Quiz'
                )}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={goToNextQuestion}
              >
                Next
              </button>
            )}
          </div>
        </div>

        {/* Question Navigation Sidebar */}
        <div className="w-64">
          <div className="card bg-base-200 border border-base-300 shadow">
            <div className="card-body">
              <h3 className="card-title text-sm">Question Navigation</h3>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    className={`btn btn-sm ${
                      idx === currentQuestionIndex
                        ? 'btn-primary'
                        : answers[q.id]
                        ? 'btn-secondary'
                        : 'btn-outline'
                    }`}
                    onClick={() => { setCurrentQuestionIndex(idx); syncIndex(idx); }}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-sm">
                <div className="flex justify-between">
                  <span>Answered:</span>
                  <span className="font-medium">
                    {Object.keys(answers).length} / {questions.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAttempt;