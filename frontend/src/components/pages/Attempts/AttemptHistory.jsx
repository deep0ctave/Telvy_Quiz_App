import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Loader2, BookOpen, Calendar, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyAttempts } from '../../../services/api';
import { toast } from 'react-hot-toast';

const AttemptHistory = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttempts = async () => {
      try {
        setLoading(true);
        const data = await getMyAttempts();
        console.log('My attempts:', data);
        setAttempts(data);
      } catch (err) {
        console.error('Failed to load attempts:', err);
        toast.error('Failed to load attempt history');
      } finally {
        setLoading(false);
      }
    };

    loadAttempts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin w-6 h-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Your Quiz Attempts</h1>

      {attempts.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No attempts found</h3>
          <p className="text-gray-500">You haven't taken any quizzes yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {attempts.map((attempt) => (
            <div key={attempt.id} className="card bg-base-100 shadow-md border">
              <div className="card-body">
                <h2 className="card-title text-lg">Quiz #{attempt.quiz_id}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {attempt.status === 'completed'
                        ? `Score: ${Number(attempt.score ?? 0)}%`
                        : 'Score: —'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(attempt.finished_at || attempt.started_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Status: {attempt.finished_at ? 'completed' : 'in_progress'}
                </p>
                <div className="mt-4">
                  {attempt.finished_at ? (
                    <Link to={`/attempts/result/${attempt.id}`} className="btn btn-sm btn-primary">
                      View Result
                    </Link>
                  ) : (
                    <Link to={`/attempts/live/${attempt.id}`} className="btn btn-sm btn-warning">
                      Continue
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttemptHistory;