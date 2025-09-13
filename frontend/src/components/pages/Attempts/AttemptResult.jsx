// File: components/pages/Student/AttemptResult.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAttemptById } from '../../../services/api';
import { getAttempt as socketGetAttempt } from '../../../services/socketClient';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Clock, Award, ArrowLeft, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';

const AttemptResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttempt = async (retryCount = 0) => {
      try {
        console.log(`[ATTEMPT-RESULT] Loading attempt ${attemptId}, retry ${retryCount}`);
        setLoading(true);
        let attemptData = null;
        
        // Try REST API first (more reliable for completed attempts)
        try {
          console.log(`[ATTEMPT-RESULT] Trying REST API for ${attemptId}`);
          attemptData = await getAttemptById(attemptId);
          console.log(`[ATTEMPT-RESULT] Got data from REST:`, { status: attemptData.status, score: attemptData.score });
        } catch (restError) {
          console.log('[ATTEMPT-RESULT] REST API failed, trying socket:', restError);
          
          // Fallback to socket if REST API failed
          try {
            console.log(`[ATTEMPT-RESULT] Trying socket getAttempt for ${attemptId}`);
            const socketResult = await socketGetAttempt(attemptId);
            console.log(`[ATTEMPT-RESULT] Socket result:`, socketResult);
            if (socketResult.ok) {
              attemptData = socketResult.data;
              console.log(`[ATTEMPT-RESULT] Got data from socket:`, { status: attemptData.status, score: attemptData.score });
            }
          } catch (socketError) {
            console.log('[ATTEMPT-RESULT] Both REST and socket failed:', socketError);
            throw restError; // Throw the original REST error
          }
        }
        
        // If attempt not completed, send user back to live attempt to finish (no toast)
        if (attemptData.status !== 'completed') {
          console.log(`[ATTEMPT-RESULT] Attempt ${attemptId} status is ${attemptData.status}, not completed`);
          // For auto-submitted attempts, retry more times as DB might not be updated yet
          if (retryCount < 5) {
            console.log(`[ATTEMPT-RESULT] Attempt not completed yet, retrying in 1.5 seconds... (${retryCount + 1}/5)`);
            setTimeout(() => loadAttempt(retryCount + 1), 1500);
            return;
          }
          console.log(`[ATTEMPT-RESULT] Max retries reached, redirecting to live attempt`);
          navigate(`/attempts/live/${attemptId}`);
          return;
        }
        
        console.log(`[ATTEMPT-RESULT] Successfully loaded completed attempt ${attemptId}`);
        setAttempt(attemptData);
      } catch (error) {
        console.error('[ATTEMPT-RESULT] Failed to load attempt:', error);
        // Retry on error for auto-submitted attempts
        if (retryCount < 2) {
          console.log(`[ATTEMPT-RESULT] Error loading attempt, retrying in 1 second... (${retryCount + 1}/2)`);
          setTimeout(() => loadAttempt(retryCount + 1), 1000);
          return;
        }
        console.log(`[ATTEMPT-RESULT] Max retries reached, showing error`);
        setLoadError('Failed to load results.');
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId, navigate]);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <Award className="w-6 h-6 text-success" />;
    if (score >= 60) return <Award className="w-6 h-6 text-warning" />;
    return <Award className="w-6 h-6 text-error" />;
  };

  const isAnswerCorrect = (question) => {
    // If no answer provided, it's unanswered (not incorrect)
    if (!question.answer || question.answer === null || question.answer === undefined || question.answer === '') {
      return null; // null means unanswered
    }
    
    if (!question.correct_answers) return false;
    
    const correctAnswers = Array.isArray(question.correct_answers) ? question.correct_answers : [question.correct_answers];
    const userAnswer = Array.isArray(question.answer) ? question.answer : [question.answer];
    
    return correctAnswers.length === userAnswer.length && 
           correctAnswers.every(ans => userAnswer.includes(ans));
  };

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

  const renderQuestionResult = (q) => {
    const normalizedOptions = normalizeOptions(q.options);
    const answerStatus = isAnswerCorrect(q);
    
    // Determine status and styling
    let statusAlert, statusText, statusIcon;
    if (answerStatus === null) {
      // Unanswered
      statusAlert = "alert-warning";
      statusText = "Not Answered";
      statusIcon = <AlertTriangle className="w-5 h-5" />;
    } else if (answerStatus) {
      // Correct
      statusAlert = "alert-success";
      statusText = "Correct";
      statusIcon = <CheckCircle className="w-5 h-5" />;
    } else {
      // Incorrect
      statusAlert = "alert-error";
      statusText = "Incorrect";
      statusIcon = <XCircle className="w-5 h-5" />;
    }
    
    return (
      <div className="space-y-4">
        {/* Question Status */}
        <div className={`alert ${statusAlert}`}>
          {statusIcon}
          <span className="font-semibold">
            {statusText}
          </span>
        </div>

        {/* MCQ and True/False */}
        {(q.question_type === 'mcq' || q.question_type === 'truefalse') && (
          <div className="space-y-2">
            {normalizedOptions.map((option) => {
              const isUserAnswer = q.answer === option.id;
              const isCorrectAnswer = q.correct_answers?.includes(option.id);
              
              let optionClass = "flex items-center gap-3 px-3 py-2 rounded border";
              if (isCorrectAnswer) {
                optionClass += " border-success bg-success/10";
              } else if (isUserAnswer && !isCorrectAnswer) {
                optionClass += " border-error bg-error/10";
              } else {
                optionClass += " border-base-300";
              }
              
              return (
                <div key={option.id} className={optionClass}>
                  <input
                    type="radio"
                    checked={isUserAnswer}
                    readOnly
                    className="radio"
                  />
                  <span>{option.text}</span>
                  {isCorrectAnswer && (
                    <CheckCircle className="w-4 h-4 text-success ml-auto" />
                  )}
                  {isUserAnswer && !isCorrectAnswer && (
                    <XCircle className="w-4 h-4 text-error ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Type-in and Numeric */}
        {(q.question_type === 'type_in' || q.question_type === 'numeric') && (
          <div className="space-y-2">
            <div className="p-3 rounded border border-base-300 bg-base-100">
              <span className="font-medium">Your answer:</span> {q.answer || 'No answer provided'}
            </div>
            <div className="p-3 rounded border border-success bg-success/10">
              <span className="font-medium">Correct answer:</span> {q.correct_answers?.join(', ')}
            </div>
          </div>
        )}
        
        {/* Multiple Choice */}
        {q.question_type === 'multiple_choice' && (
          <div className="space-y-2">
            {normalizedOptions.map((option) => {
              const isUserAnswer = Array.isArray(q.answer) && q.answer.includes(option.id);
              const isCorrectAnswer = q.correct_answers?.includes(option.id);
              
              let optionClass = "flex items-center gap-3 px-3 py-2 rounded border";
              if (isCorrectAnswer) {
                optionClass += " border-success bg-success/10";
              } else if (isUserAnswer && !isCorrectAnswer) {
                optionClass += " border-error bg-error/10";
              } else {
                optionClass += " border-base-300";
              }
              
              return (
                <div key={option.id} className={optionClass}>
                  <input
                    type="checkbox"
                    checked={isUserAnswer}
                    readOnly
                    className="checkbox"
                  />
                  <span>{option.text}</span>
                  {isCorrectAnswer && (
                    <CheckCircle className="w-4 h-4 text-success ml-auto" />
                  )}
                  {isUserAnswer && !isCorrectAnswer && (
                    <XCircle className="w-4 h-4 text-error ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p>Loading results...</p>
          <p className="text-sm text-gray-500 mt-2">Processing your quiz submission...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-warning mx-auto" />
          <p className="text-lg">{loadError}</p>
          <div className="flex gap-2 justify-center">
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/attempts/live/${attemptId}`)}>Resume Quiz</button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-warning mx-auto mb-4" />
          <p className="text-lg">Attempt not found</p>
        </div>
      </div>
    );
  }

  const questions = attempt.state?.questions || [];
  const score = Math.round(parseFloat(attempt.score) * 100) / 100; // Round to 2 decimal places
  const totalQuestions = questions.length;
  const correctAnswers = questions.filter(q => isAnswerCorrect(q)).length;
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="p-6">
      <div className="mb-6 space-y-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Quiz Results</h2>
          <button 
            onClick={() => navigate('/dashboard')}
            className="btn btn-outline btn-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
        
        {/* Score Summary */}
        <div className="card bg-base-200 border border-base-300 shadow mb-4">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getScoreIcon(score)}
                <div>
                  <p className="text-sm text-gray-600">Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(score)}`}>
                    {score}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Performance</p>
                <p className="text-lg font-semibold">
                  {correctAnswers} / {totalQuestions} correct
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Started: {formatTime(attempt.started_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Completed: {formatTime(attempt.finished_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Question + Result */}
        <div className="flex-1 space-y-4">
          <div className="card bg-base-200 border border-base-300 shadow">
            <div className="card-body space-y-4">
              <h2 className="card-title">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <p className="text-lg">{currentQuestion?.question_text}</p>
              
              {/* Question Image */}
              {currentQuestion?.image_url && (
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
              
              {renderQuestionResult(currentQuestion)}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              className="btn"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((i) => i - 1)}
            >
              Previous
            </button>
            <button
              className="btn"
              disabled={currentQuestionIndex === questions.length - 1}
              onClick={() => setCurrentQuestionIndex((i) => i + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* Right: Navigator */}
        <div className="w-full lg:w-64 shrink-0 bg-base-100 border border-base-300 rounded-box p-4 shadow">
          <h3 className="font-semibold text-center mb-2">Navigate</h3>
          <div className="grid grid-cols-5 gap-2 justify-center">
            {questions.map((q, i) => {
              const answerStatus = isAnswerCorrect(q);
              
              let buttonClass = "btn btn-xs ";
              if (i === currentQuestionIndex) {
                buttonClass += "btn-primary";
              } else if (answerStatus === null) {
                buttonClass += "btn-neutral"; // Neutral for unanswered
              } else if (answerStatus === true) {
                buttonClass += "btn-success"; // Green for correct
              } else {
                buttonClass += "btn-error"; // Red for incorrect
              }
              
              return (
                <button
                  key={q.id}
                  className={buttonClass}
                  onClick={() => setCurrentQuestionIndex(i)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Correct:</span>
              <span className="text-success font-medium">{correctAnswers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Incorrect:</span>
              <span className="text-error font-medium">{questions.filter(q => isAnswerCorrect(q) === false).length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Not Answered:</span>
              <span className="text-warning font-medium">{questions.filter(q => isAnswerCorrect(q) === null).length}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span>Total Questions:</span>
              <span className="font-medium">{questions.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttemptResult;