// File: components/pages/Student/LiveAttempt.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { syncAttempt, submitAttempt, getAttemptById } from "../../../services/api";
import { toast } from 'react-toastify';
import { Loader2, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const LiveAttempt = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const newAttemptData = state?.attempt; // Data passed for a new attempt

  // Core state
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Stores answers by question ID
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isResuming, setIsResuming] = useState(false);

  // Simple quiz timer (total time for entire quiz)
  const [quizTimeLeft, setQuizTimeLeft] = useState(300); // 5 minutes total
  const [startTime, setStartTime] = useState(null);

  // Refs
  const syncRef = useRef(null);
  const quizTimerRef = useRef(null);

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

  // Sync function
  const handleSync = async () => {
    if (questions.length === 0 || syncing) return;

    try {
      setSyncing(true);
      
      const questionsWithAnswers = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        answer: answers[q.id] || null
      }));

      const state = {
        quiz_id: parseInt(attemptId),
        questions: questionsWithAnswers
      };

      console.log('[DEBUG] LiveAttempt - Syncing attempt:', attemptId);
      await syncAttempt(attemptId, state);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('[DEBUG] LiveAttempt - Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Submit function
  const handleSubmit = async () => {
    if (submitting) return;
    
    try {
      setSubmitting(true);
      console.log('[DEBUG] LiveAttempt - Submitting quiz');
      
      // Ensure a final sync before submitting
      await handleSync(); 

      const result = await submitAttempt(attemptId);
      console.log('[DEBUG] LiveAttempt - Quiz submitted:', result);
      
      // Create a detailed success message
      let successMessage = `Quiz submitted! Score: ${result.score}% (${result.correct}/${result.total_questions} correct)`;
      if (result.unanswered > 0) {
        successMessage += ` - ${result.unanswered} unanswered`;
      }
      
      toast.success(successMessage);
      navigate(`/attempts/result/${attemptId}`);
    } catch (err) {
      console.error('[DEBUG] LiveAttempt - Submission failed:', err);
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId, value) => {
    console.log('[DEBUG] LiveAttempt - Answer selected:', { questionId, value });
    
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: value
    }));

    // Sync immediately after answer selection
    setTimeout(() => handleSync(), 100);
  };

  // Simple navigation functions
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Load attempt data
  useEffect(() => {
    const loadAttempt = async () => {
      setLoading(true);
      try {
        let attemptData;
        
        if (newAttemptData && newAttemptData.questions) {
          // New attempt - use data from navigation state
          attemptData = newAttemptData;
          console.log('[DEBUG] LiveAttempt - Using new attempt data');
        } else {
          // Existing attempt - fetch from API
          attemptData = await getAttemptById(attemptId);
          console.log('[DEBUG] LiveAttempt - Fetched existing attempt data');
        }
        
        // Check if attempt is already submitted
        if (attemptData.status === 'submitted' || attemptData.finished_at) {
          console.log('[DEBUG] LiveAttempt - Attempt already submitted, redirecting to results');
          navigate(`/attempts/result/${attemptId}`);
          return;
        }
        
        // Get questions from appropriate source
        let questionsData;
        if (attemptData.questions) {
          questionsData = attemptData.questions;
          console.log('[DEBUG] LiveAttempt - Using questions from new attempt response');
        } else if (attemptData.state?.questions) {
          questionsData = attemptData.state.questions;
          console.log('[DEBUG] LiveAttempt - Using questions from attempt state');
        } else {
          questionsData = [];
          console.warn('[DEBUG] LiveAttempt - No questions found in attempt data');
        }
        
        // Set questions
        setQuestions(questionsData);
        console.log('[DEBUG] LiveAttempt - Set questions:', questionsData.length, 'questions');
        
        // Initialize timer
        const quizStartTime = attemptData.started_at ? new Date(attemptData.started_at) : new Date();
        setStartTime(quizStartTime);
        
        console.log('[DEBUG] LiveAttempt - Timer initialized:', {
          startTime: quizStartTime,
          questionsCount: questionsData.length
        });
        
        // Load existing answers if resuming
        if (attemptData.state?.questions) {
          const existingAnswers = {};
          attemptData.state.questions.forEach(q => {
            if (q.answer !== null) {
              existingAnswers[q.id] = q.answer;
            }
          });
          setAnswers(existingAnswers);
          console.log('[DEBUG] LiveAttempt - Loaded existing answers:', existingAnswers);
          setIsResuming(true);
          toast.success('Resumed previous quiz attempt');
        }
      } catch (err) {
        console.error('[DEBUG] LiveAttempt - Failed to load attempt:', err);
        toast.error('Failed to load quiz attempt.');
        navigate('/dashboard'); // Redirect to dashboard on error
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId, newAttemptData, navigate]);

  // Set up quiz timer (simple countdown)
  useEffect(() => {
    if (questions.length === 0) return;

    console.log('[DEBUG] LiveAttempt - Setting up quiz timer');

    // Clear any existing timer
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);

    // Quiz timer that counts down
    quizTimerRef.current = setInterval(() => {
      setQuizTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto submit
          console.log('[DEBUG] LiveAttempt - Quiz time expired, auto-submitting');
          toast.error('Time is up! Submitting quiz automatically.');
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      console.log('[DEBUG] LiveAttempt - Clearing quiz timer');
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    };
  }, [questions.length]);

  // Set up periodic sync
  useEffect(() => {
    if (questions.length === 0) return;

    console.log('[DEBUG] LiveAttempt - Setting up sync with', questions.length, 'questions');

    // Clear any existing intervals
    if (syncRef.current) clearInterval(syncRef.current);

    // Periodic sync every 5 seconds
    syncRef.current = setInterval(() => {
      handleSync();
    }, 5000);

    // Cleanup on unmount
    return () => {
      console.log('[DEBUG] LiveAttempt - Clearing intervals');
      if (syncRef.current) clearInterval(syncRef.current);
    };
  }, [questions.length]);

  const currentQuestion = questions[currentQuestionIndex];

  console.log('[DEBUG] LiveAttempt - Render state:', {
    currentQuestionIndex,
    totalQuestions: questions.length,
    currentQuestionId: currentQuestion?.id,
    answersCount: Object.keys(answers).length,
    quizTimeLeft
  });

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
          <span className={`font-mono text-lg ${quizTimeLeft <= 60 ? 'text-error' : 'text-warning'}`}>
            {formatTime(quizTimeLeft)}
          </span>
        </div>
      </div>

      {/* Timer Progress Bar */}
      <div className="mb-4">
        <progress
          className={`progress w-full ${quizTimeLeft <= 60 ? 'progress-error' : 'progress-warning'}`}
          value={quizTimeLeft}
          max={300}
        />
        <div className="text-center text-sm text-gray-600 mt-1">
          Quiz time remaining: {formatTime(quizTimeLeft)}
        </div>
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
                    onClick={() => setCurrentQuestionIndex(idx)}
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