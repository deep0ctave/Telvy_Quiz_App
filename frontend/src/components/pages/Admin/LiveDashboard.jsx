import React, { useState, useEffect } from 'react';
import { connect as socketConnect, on as socketOn, off as socketOff, getLiveAttempts, resetTimer, resetAssignment, massResetTimer, massResetAssignment } from '../../../services/socketClient';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Clock, 
  Users, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  User,
  BookOpen,
  Timer,
  Loader2,
  Filter,
  Settings
} from 'lucide-react';

const LiveDashboard = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [newDuration, setNewDuration] = useState(300);
  const [showFilters, setShowFilters] = useState(false);
  const [showMassOperations, setShowMassOperations] = useState(false);
  const [filters, setFilters] = useState({
    school: '',
    class: '',
    section: '',
    quiz_title: '',
    student_name: ''
  });
  
  const actualUser = user?.user || user;
  const isAdmin = actualUser?.role === 'admin';
  const isTeacher = actualUser?.role === 'teacher';

  useEffect(() => {
    console.log('[LIVE-DASHBOARD] Starting connection process...');
    
    // Connect to socket
    socketConnect();
    
    const handleAuthenticated = () => {
      console.log('[LIVE-DASHBOARD] Authentication successful!');
      setConnected(true);
      // Load attempts immediately after authentication
      loadLiveAttempts();
    };

    const handleError = (error) => {
      console.error('[LIVE-DASHBOARD] Socket error:', error);
      toast.error(error.message || 'Connection error');
    };

    const handleTimerUpdate = (data) => {
      // Update the attempts list in real-time when timer updates are received
      setAttempts(prevAttempts => 
        prevAttempts.map(attempt => 
          attempt.attempt_id === data.attempt_id 
            ? { ...attempt, remaining_time: data.remaining_time }
            : attempt
        )
      );
    };

    socketOn('authenticated', handleAuthenticated);
    socketOn('error', handleError);
    socketOn('timer_update', handleTimerUpdate);

    // Set a timeout to show helpful message if authentication takes too long
    const authTimeout = setTimeout(() => {
      console.log('[LIVE-DASHBOARD] Authentication timeout - checking token...');
      const token = localStorage.getItem('accessToken') || localStorage.getItem('access_token');
      if (!token) {
        toast.error('No authentication token found. Please login again.');
      } else {
        toast.error('Authentication is taking longer than expected. Please check your connection.');
      }
    }, 10000); // 10 second timeout

    return () => {
      socketOff('authenticated', handleAuthenticated);
      socketOff('error', handleError);
      socketOff('timer_update', handleTimerUpdate);
      clearTimeout(authTimeout);
    };
  }, []); // Remove connected from dependency array

  // Separate useEffect for periodic refresh
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      loadLiveAttempts();
    }, 2000); // Refresh every 2 seconds for more real-time feel

    return () => clearInterval(interval);
  }, [connected]);

  const loadLiveAttempts = async (retryCount = 0) => {
    try {
      console.log('[LIVE-DASHBOARD] Loading live attempts...');
      const data = await getLiveAttempts(filters);
      setAttempts(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load live attempts:', error);
      
      // Retry if authentication failed and we haven't exceeded retry limit
      if (error.message.includes('not_authenticated') && retryCount < 3) {
        console.log(`Retrying load attempt ${retryCount + 1}/3`);
        setTimeout(() => loadLiveAttempts(retryCount + 1), 2000);
        return;
      }
      
      toast.error('Failed to load live attempts: ' + error.message);
      setLoading(false);
    }
  };

  const handleResetTimer = async (attemptId, duration = 300) => {
    try {
      console.log('[LIVE-DASHBOARD] Resetting timer for attempt:', attemptId, 'with duration:', duration);
      await resetTimer(attemptId, duration);
      toast.success('Timer reset successfully');
      setShowTimerModal(false);
      setSelectedAttempt(null);
      loadLiveAttempts();
    } catch (error) {
      console.error('[LIVE-DASHBOARD] Timer reset failed:', error);
      toast.error('Failed to reset timer: ' + error.message);
    }
  };

  const handleResetAssignment = async (quizId, studentId) => {
    try {
      await resetAssignment(quizId, studentId);
      toast.success('Assignment reset successfully');
      setShowResetModal(false);
      setSelectedAttempt(null);
      loadLiveAttempts();
    } catch (error) {
      toast.error('Failed to reset assignment: ' + error.message);
    }
  };

  const handleMassResetTimer = async () => {
    try {
      const result = await massResetTimer(filters, newDuration);
      toast.success(`Mass timer reset completed: ${result.success_count} successful, ${result.error_count} failed`);
      setShowMassOperations(false);
      loadLiveAttempts();
    } catch (error) {
      toast.error('Failed to mass reset timers: ' + error.message);
    }
  };

  const handleMassResetAssignment = async () => {
    try {
      const result = await massResetAssignment(filters);
      toast.success(`Mass assignment reset completed: ${result.success_count} successful, ${result.error_count} failed`);
      setShowMassOperations(false);
      loadLiveAttempts();
    } catch (error) {
      toast.error('Failed to mass reset assignments: ' + error.message);
    }
  };

  const clearFilters = () => {
    setFilters({
      school: '',
      class: '',
      section: '',
      quiz_title: '',
      student_name: ''
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status, remainingTime) => {
    if (status === 'completed') return 'text-success';
    if (remainingTime <= 60) return 'text-error';
    if (remainingTime <= 300) return 'text-warning';
    return 'text-primary';
  };

  const getStatusIcon = (status, remainingTime) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4" />;
    if (remainingTime <= 60) return <AlertTriangle className="w-4 h-4" />;
    if (remainingTime <= 300) return <Clock className="w-4 h-4" />;
    return <Timer className="w-4 h-4" />;
  };

  if (loading || !connected) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">{!connected ? 'Connecting to server...' : 'Loading live dashboard...'}</p>
          {!connected && (
            <p className="text-sm text-base-content/60 mt-2">Authenticating admin access...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? 'Admin Live Dashboard' : 'Teacher Live Dashboard'}
          </h1>
          <p className="text-base-content/70 mt-2">
            {isAdmin 
              ? 'Monitor and control all active quiz attempts' 
              : 'Monitor your students\' active quiz attempts'
            }
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${connected ? 'text-success' : 'text-error'}`}>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-success' : 'bg-error'}`}></div>
            <span className="text-sm font-medium">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline btn-sm"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowMassOperations(!showMassOperations)}
              className="btn btn-outline btn-sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              Mass Operations
            </button>
          )}
          <button
            onClick={loadLiveAttempts}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-lg font-semibold mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="label">
                  <span className="label-text">School</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Filter by school..."
                  value={filters.school}
                  onChange={(e) => setFilters(prev => ({ ...prev, school: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Class</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Filter by class..."
                  value={filters.class}
                  onChange={(e) => setFilters(prev => ({ ...prev, class: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Section</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Filter by section..."
                  value={filters.section}
                  onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Quiz Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Filter by quiz..."
                  value={filters.quiz_title}
                  onChange={(e) => setFilters(prev => ({ ...prev, quiz_title: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Student Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Filter by student..."
                  value={filters.student_name}
                  onChange={(e) => setFilters(prev => ({ ...prev, student_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={loadLiveAttempts}
                className="btn btn-primary btn-sm"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="btn btn-outline btn-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mass Operations Section */}
      {showMassOperations && isAdmin && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-lg font-semibold mb-4">Mass Operations (Admin Only)</h3>
            <div className="alert alert-warning mb-4">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                <strong>Warning:</strong> These operations will affect all attempts matching the current filters. Use with caution.
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text">New Timer Duration (minutes)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={Math.floor(newDuration / 60)}
                  onChange={(e) => setNewDuration((parseInt(e.target.value) || 5) * 60)}
                  min="1"
                  max="60"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleMassResetTimer}
                  className="btn btn-warning"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Mass Reset Timers
                </button>
                <button
                  onClick={handleMassResetAssignment}
                  className="btn btn-error"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mass Reset Assignments
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body flex items-center gap-4">
            <Users className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm text-base-content/70">Active Attempts</p>
              <p className="text-lg font-semibold">{attempts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-base-200 shadow-md">
          <div className="card-body flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-error" />
            <div>
              <p className="text-sm text-base-content/70">Critical Time</p>
              <p className="text-lg font-semibold">
                {attempts.filter(a => a.remaining_time <= 60).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card bg-base-200 shadow-md">
          <div className="card-body flex items-center gap-4">
            <Clock className="w-6 h-6 text-warning" />
            <div>
              <p className="text-sm text-base-content/70">Warning Time</p>
              <p className="text-lg font-semibold">
                {attempts.filter(a => a.remaining_time > 60 && a.remaining_time <= 300).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card bg-base-200 shadow-md">
          <div className="card-body flex items-center gap-4">
            <CheckCircle className="w-6 h-6 text-success" />
            <div>
              <p className="text-sm text-base-content/70">Normal Time</p>
              <p className="text-lg font-semibold">
                {attempts.filter(a => a.remaining_time > 300).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Attempts Table */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg font-semibold mb-4">Active Attempts</h2>
          
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-lg font-semibold text-base-content/60 mb-2">No active attempts found</h3>
              <p className="text-base-content/50">Students will appear here when they start taking quizzes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Quiz</th>
                    <th>Started</th>
                    <th>Time Remaining</th>
                    <th>Status</th>
                    <th>{isAdmin ? 'Actions' : 'Timer Control'}</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={attempt.attempt_id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-base-content/60" />
                          <div>
                            <div className="font-medium">{attempt.student_name}</div>
                            <div className="text-sm text-base-content/60">
                              @{attempt.student_username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-base-content/60" />
                          <div className="text-sm">
                            {attempt.quiz_title}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {new Date(attempt.started_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <div className={`flex items-center gap-2 ${getStatusColor(attempt.status, attempt.remaining_time)}`}>
                          {getStatusIcon(attempt.status, attempt.remaining_time)}
                          <span className="font-mono text-sm">
                            {formatTime(attempt.remaining_time)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          attempt.is_timer_active 
                            ? 'badge-success' 
                            : 'badge-neutral'
                        }`}>
                          {attempt.is_timer_active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedAttempt(attempt);
                            // quiz_total_time is already in seconds from backend
                            setNewDuration(attempt.quiz_total_time ? attempt.quiz_total_time : 300);
                            setShowTimerModal(true);
                          }}
                          className="btn btn-sm btn-info"
                          title="Reset Timer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setSelectedAttempt(attempt);
                                setShowResetModal(true);
                              }}
                              className="btn btn-sm btn-error"
                              title="Reset Assignment (Admin Only)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Timer Reset Modal */}
      {showTimerModal && selectedAttempt && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Reset Timer</h3>
            <div className="mb-4">
              <p className="text-sm text-base-content/70 mb-2">
                Student: <strong>{selectedAttempt.student_name}</strong>
              </p>
              <p className="text-sm text-base-content/70 mb-4">
                Quiz: <strong>{selectedAttempt.quiz_title}</strong>
              </p>
              <label className="label">
                <span className="label-text">New Duration</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={Math.floor(newDuration / 60)}
                  onChange={(e) => setNewDuration((parseInt(e.target.value) || 5) * 60)}
                  className="input input-bordered flex-1"
                  min="1"
                  max="60"
                />
                <span className="flex items-center text-sm text-base-content/70">minutes</span>
              </div>
              <div className="text-xs text-base-content/60 mt-1">
                Total: {newDuration} seconds ({Math.floor(newDuration / 60)}:{String(newDuration % 60).padStart(2, '0')})
              </div>
            </div>
            <div className="modal-action">
              <button
                onClick={() => setShowTimerModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResetTimer(selectedAttempt.attempt_id, newDuration)}
                className="btn btn-primary"
              >
                Reset Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Reset Modal */}
      {showResetModal && selectedAttempt && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Reset Assignment</h3>
            <div className="mb-4">
              <p className="text-sm text-base-content/70 mb-2">
                Student: <strong>{selectedAttempt.student_name}</strong>
              </p>
              <p className="text-sm text-base-content/70 mb-4">
                Quiz: <strong>{selectedAttempt.quiz_title}</strong>
              </p>
              <div className="alert alert-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">
                  <strong>Warning:</strong> This will delete the current attempt and allow the student to retake the quiz.
                </span>
              </div>
            </div>
            <div className="modal-action">
              <button
                onClick={() => setShowResetModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResetAssignment(selectedAttempt.quiz_id, selectedAttempt.student_id)}
                className="btn btn-error"
              >
                Reset Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDashboard;
