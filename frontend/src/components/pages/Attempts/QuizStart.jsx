// File: QuizStart.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CalendarDays, Clock10, Tags, CircleUser, Loader2 } from 'lucide-react';
import { getMyAttempts, getAttemptById } from '../../../services/api';
import { connect as socketConnect, startQuiz as socketStartQuiz } from '../../../services/socketClient';
import { toast } from 'react-hot-toast';

const QuizStart = () => {
  const { quizId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const assignment = state?.assignment;
  const [loading, setLoading] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(null);
  
  // Socket mode for starting attempts

  if (!assignment) {
    return <div className="p-6">Assignment not found or data missing.</div>;
  }

  const quiz = assignment.quiz;
  
  // Debug quiz data
  console.log('[DEBUG] QuizStart - Quiz data:', {
    quiz_id: quiz?.id,
    quiz_id_type: typeof quiz?.id,
    quiz_title: quiz?.title,
    assignment_id: assignment?.assignment_id,
    assignment_status: assignment?.status
  });

  // Check for existing attempts to determine actual state (REST for reliability)
  useEffect(() => {
    const checkAttempts = async () => {
      try {
        console.log('[DEBUG] QuizStart - Checking attempts for quiz:', quiz.id);
        console.log('[DEBUG] QuizStart - Assignment data:', assignment);
        
        const attempts = await getMyAttempts();
        const related = attempts.filter(att => att.quiz_id === quiz.id);
        // Re-verify statuses via detail fetch (handles any stale listings)
        const verified = await Promise.all(related.map(async (att) => {
          try {
            const full = await getAttemptById(att.id);
            return full;
          } catch {
            return att;
          }
        }));
        // Prefer in_progress; otherwise most recent completed
        const inProgress = verified.find(att => att.status === 'in_progress');
        let chosen = inProgress || null;
        if (!chosen) {
          const completed = verified
            .filter(att => att.status === 'completed')
            .sort((a, b) => new Date(b.finished_at || 0) - new Date(a.finished_at || 0));
          if (completed.length) chosen = completed[0];
        }

        // If assignment has attempt_id, verify its status too
        if (!chosen && assignment.attempt_id) {
          try {
            const att = await getAttemptById(assignment.attempt_id);
            if (att && att.quiz_id === quiz.id) chosen = att;
          } catch {}
        }

        if (chosen) {
          setCurrentAttempt(chosen);
          console.log('[DEBUG] QuizStart - Chosen attempt:', chosen);
        } else {
          console.log('[DEBUG] QuizStart - No existing attempt found for quiz:', quiz.id);
        }
      } catch (err) {
        console.error('[DEBUG] QuizStart - Failed to check attempts:', err);
      }
    };

    checkAttempts();
  }, [quiz.id]);

  const now = new Date();
  const startsAt = new Date(quiz.starts_at || Date.now()); // fallback to now
  const endsAt = new Date(quiz.ends_at || Date.now() + quiz.duration_minutes * 60 * 1000);
  const isFuture = startsAt > now;

  // Determine actual quiz state based on attempt status
  const getActualQuizState = () => {
    if (currentAttempt) {
      if (currentAttempt.status === 'completed') return 'completed';
      if (currentAttempt.status === 'in_progress') return 'in_progress';
    }
    return assignment.status;
  };

  const actualState = getActualQuizState();

  const getButtonLabel = () => {
    if (actualState === "assigned") return "Start Quiz";
    if (actualState === "in_progress") return "Continue Quiz";
    if (actualState === "completed") return "Review Quiz";
    return "Unavailable";
  };

  const getButtonStyle = () => {
    if (actualState === "assigned") return "btn-primary";
    if (actualState === "in_progress") return "btn-warning";
    if (actualState === "completed") return "btn-outline";
    return "btn-neutral";
  };

  const handleStartQuiz = async () => {
    console.log('[DEBUG] QuizStart - handleStartQuiz called', { 
      assignmentStatus: assignment.status,
      actualState: actualState,
      currentAttempt: currentAttempt,
      quizId: quiz.id,
      assignmentId: assignment.assignment_id 
    });

    if (actualState === "completed") {
      console.log('[DEBUG] QuizStart - Navigating to review mode');
      // Navigate to review
      const attemptId = currentAttempt?.id || assignment.attempt_id;
      if (attemptId) {
        navigate(`/attempts/result/${attemptId}`);
      } else {
        toast.error('Attempt ID not found for completed quiz');
      }
      return;
    }

    if (actualState === "in_progress") {
      console.log('[DEBUG] QuizStart - Continuing existing attempt');
      // Continue existing attempt - don't call startAttempt
      const attemptId = currentAttempt?.id || assignment.attempt_id;
      console.log('[DEBUG] QuizStart - Attempt ID resolution:', {
        currentAttemptId: currentAttempt?.id,
        assignmentAttemptId: assignment.attempt_id,
        resolvedAttemptId: attemptId,
        currentAttempt: currentAttempt,
        assignment: assignment
      });
      
      if (attemptId) {
        console.log('[DEBUG] QuizStart - Navigating to continue attempt:', attemptId);
        navigate(`/attempts/live/${attemptId}`, { 
          state: { assignment: assignment }
        });
      } else {
        console.error('[DEBUG] QuizStart - No attempt ID found for in-progress quiz');
        toast.error('Attempt ID not found for in-progress quiz. Please try refreshing the page.');
      }
      return;
    }

    // Only call socket start for new attempts (assigned state)
    setLoading(true);
    try {
      // Validate quiz.id is a valid number
      const quizId = parseInt(quiz.id, 10);
      if (isNaN(quizId)) {
        console.error('[DEBUG] QuizStart - Invalid quiz ID:', quiz.id);
        toast.error('Invalid quiz ID. Please try refreshing the page.');
        return;
      }
      
      // Socket: start attempt
      const token = localStorage.getItem('accessToken');
      socketConnect(token);
      const result = await socketStartQuiz(quizId);
      console.log('[DEBUG] QuizStart - Socket attempt started:', result);
      navigate(`/attempts/live/${result.attempt_id}`, { 
        state: { 
          attempt: result,
          assignment: { ...assignment, status: 'in_progress', attempt_id: result.attempt_id }
        } 
      });
    } catch (err) {
      console.error('[DEBUG] QuizStart - Failed to start attempt:', err);
      const errorDetails = err?.response?.data;
      console.log('[DEBUG] QuizStart - Error details:', errorDetails);
      
      // Handle specific error cases
      if (errorDetails?.error === 'quiz_already_completed' && errorDetails?.attempt_id) {
        console.log('[DEBUG] QuizStart - Quiz already completed, navigating to review');
        toast.success('Quiz already completed! Redirecting to review...');
        navigate(`/attempts/result/${errorDetails.attempt_id}`);
        return;
      }
      
      if (errorDetails?.error === 'attempt_already_in_progress' && errorDetails?.attempt_id) {
        console.log('[DEBUG] QuizStart - Attempt already in progress, continuing');
        toast.success('Resuming your quiz attempt...');
        navigate(`/attempts/live/${errorDetails.attempt_id}`, { 
          state: { assignment: assignment }
        });
        return;
      }
      
      const errorMsg = errorDetails?.error || 'Failed to start quiz';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div className="card bg-base-100 border border-base-300 shadow-md overflow-hidden">
        {quiz.image_url && (
          <img
            src={quiz.image_url}
            alt={quiz.title}
            className="w-full h-52 object-cover"
          />
        )}
        <div className="card-body p-4 space-y-3">
          <h2 className="text-xl font-bold">{quiz.title}</h2>
          <p className="text-sm text-base-content/70">{quiz.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-2">
                         <div className="flex items-center gap-2">
               <Clock10 className="w-4 h-4 text-primary" />
               <span>{quiz.total_time ? Math.floor(quiz.total_time / 60) : 'N/A'} mins</span>
             </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span>
                {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{" "}
                {endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CircleUser className="w-4 h-4 text-primary" />
              <span className="capitalize">{quiz.quiz_type || "mcq"}</span>
            </div>
                         <div className="flex items-center gap-2 flex-wrap">
               <Tags className="w-4 h-4 text-primary" />
               <div className="flex gap-1 flex-wrap">
                 {(quiz.tags || []).map((tag, i) => (
                   <div key={i} className="badge badge-outline badge-sm">
                     {tag}
                   </div>
                 ))}
               </div>
             </div>
          </div>

                     <div className={`alert ${actualState === "completed" ? "alert-success" : "alert-info"} text-xs sm:text-sm mt-4`}>
             {actualState === "assigned"
               ? "Once you start the quiz, the timer will begin. Do not refresh or leave."
               : actualState === "in_progress"
               ? "You can resume your quiz attempt. Your progress will be saved automatically."
               : actualState === "completed"
               ? "You have completed this quiz. Click 'Review Quiz' to see your results and correct answers."
               : "This quiz is scheduled to begin soon."}
           </div>

                     <div className="flex justify-end">
             <button
               className={`btn ${getButtonStyle()} btn-md sm:btn-md mt-2`}
               onClick={handleStartQuiz}
               disabled={loading}
             >
               {loading ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   {actualState === "completed" ? "Loading..." : "Starting..."}
                 </>
               ) : (
                 getButtonLabel()
               )}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default QuizStart;