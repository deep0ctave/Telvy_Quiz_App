// File: components/pages/Student/Quizzes.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getMyAssignments, getMyAttempts } from "../../../services/api";
import { toast } from "react-hot-toast";
import { Loader2, BookOpen, Clock, CheckCircle, Play, RefreshCw } from "lucide-react";

const mockQuizzes = [
  {
    id: 1,
    title: "Math Quiz",
    description: "Algebra & Arithmetic",
    tags: ["math"],
    status: "not_started",
    attempt_id: null,
    questions_count: 10,
    duration_minutes: 15,
  },
  {
    id: 2,
    title: "Science Basics",
    description: "Physics and Chemistry",
    tags: ["science"],
    status: "completed",
    attempt_id: 301,
    questions_count: 12,
    duration_minutes: 20,
  },
  {
    id: 3,
    title: "Current Affairs",
    description: "GK for July",
    tags: ["gk"],
    status: "ongoing",
    attempt_id: 302,
    questions_count: 8,
    duration_minutes: 10,
  },
];

const Quizzes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUser = user?.user || user;

  const [assignments, setAssignments] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const [assignmentsData, attemptsData] = await Promise.all([
        getMyAssignments(),
        getMyAttempts()
      ]);
      
      console.log('[DEBUG] Quizzes - Loaded assignments:', assignmentsData);
      console.log('[DEBUG] Quizzes - Loaded attempts:', attemptsData);
      
      setAssignments(assignmentsData);
      setAttempts(attemptsData);
    } catch (err) {
      console.error('[DEBUG] Quizzes - Failed to load data:', err);
      toast.error('Failed to load your assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  // Refresh assignments when the component comes into focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('[DEBUG] Quizzes - Page focused, refreshing assignments');
      loadAssignments();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const filtered = assignments.filter((assignment) =>
    assignment.quiz.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleNavigate = (assignment) => {
    const quizState = getQuizState(assignment);
    console.log('[DEBUG] Quizzes - Navigating to quiz:', { 
      quizId: assignment.quiz.id, 
      assignmentStatus: assignment.status,
      actualStatus: quizState.status,
      attemptId: quizState.attemptId,
      assignmentId: assignment.assignment_id 
    });
    
    // Update assignment with actual state and attempt ID
    const updatedAssignment = {
      ...assignment,
      status: quizState.status,
      attempt_id: quizState.attemptId
    };
    
    // Navigate to quiz start page - the QuizStart component will handle
    // any status mismatches and redirect appropriately
    navigate(`/attempts/start/${assignment.quiz.id}`, { state: { assignment: updatedAssignment } });
  };

  // Get actual quiz state and score for an assignment
  const getQuizState = (assignment) => {
    const attempt = attempts.find(att => att.quiz_id === assignment.quiz.id);
    if (attempt) {
      if (attempt.status === 'submitted') {
        return {
          status: 'completed',
          score: attempt.score,
          attemptId: attempt.id
        };
      }
      if (attempt.status === 'in_progress') {
        return {
          status: 'in_progress',
          attemptId: attempt.id
        };
      }
    }
    return {
      status: assignment.status,
      attemptId: assignment.attempt_id
    };
  };

  const getStatusBadge = (assignment) => {
    const quizState = getQuizState(assignment);
    switch (quizState.status) {
      case 'assigned':
        return <span className="badge badge-primary">Available</span>;
      case 'in_progress':
        return <span className="badge badge-warning">In Progress</span>;
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      default:
        return <span className="badge badge-neutral">{quizState.status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Quiz Assignments</h1>
        <button 
          onClick={loadAssignments}
          disabled={loading}
          className="btn btn-outline btn-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <input
        type="text"
        className="input input-bordered w-64"
        placeholder="Search assignments..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No assignments found</h3>
          <p className="text-gray-500">You don't have any quiz assignments yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((assignment) => (
            <div
              key={assignment.assignment_id}
              className="card bg-base-100 border border-base-300 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleNavigate(assignment)}
            >
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="card-title">{assignment.quiz.title}</h3>
                  {getStatusBadge(assignment)}
                </div>
                <p className="text-sm text-base-content/70">{assignment.quiz.description}</p>
                
                                 <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                   <div className="flex items-center gap-1">
                     <BookOpen className="w-4 h-4" />
                     <span>{assignment.quiz.total_marks || 'N/A'} marks</span>
                   </div>
                   {assignment.quiz.total_time && (
                     <div className="flex items-center gap-1">
                       <Clock className="w-4 h-4" />
                       <span>{Math.floor(assignment.quiz.total_time / 60)} min</span>
                     </div>
                   )}
                   {getQuizState(assignment).status === 'completed' && (
                     <div className="flex items-center gap-1">
                       <CheckCircle className="w-4 h-4 text-green-600" />
                       <span className="text-green-600 font-medium">
                         Score: {getQuizState(assignment).score}%
                       </span>
                     </div>
                   )}
                 </div>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs text-gray-500">
                    Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                  </span>
                                     <div className="flex gap-2">
                     {(() => {
                       const quizState = getQuizState(assignment);
                       switch (quizState.status) {
                         case 'assigned':
                           return (
                             <button className="btn btn-primary btn-sm">
                               <Play className="w-4 h-4" />
                               Start Quiz
                             </button>
                           );
                         case 'in_progress':
                           return (
                             <button className="btn btn-warning btn-sm">
                               <Play className="w-4 h-4" />
                               Continue Quiz
                             </button>
                           );
                         case 'completed':
                           return (
                             <button className="btn btn-outline btn-sm">
                               <CheckCircle className="w-4 h-4" />
                               Review Quiz
                             </button>
                           );
                         default:
                           return (
                             <button className="btn btn-neutral btn-sm">
                               Unavailable
                             </button>
                           );
                       }
                     })()}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Quizzes;
