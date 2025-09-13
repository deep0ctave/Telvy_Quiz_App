// File: components/pages/Stats.jsx
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../../../services/api";

const Stats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/student/stats');
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center">
      <div className="loading loading-spinner loading-lg"></div>
      <span className="ml-2">Loading your statistics...</span>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="alert alert-error">
        <span>{error}</span>
        <button className="btn btn-sm btn-outline" onClick={fetchStats}>Retry</button>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="p-6">
      <div className="alert alert-info">
        <span>No statistics available yet. Start taking quizzes to see your progress!</span>
      </div>
    </div>
  );

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📊 Your Quiz Statistics</h1>
        <button className="btn btn-outline btn-sm" onClick={fetchStats}>
          🔄 Refresh
        </button>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Quizzes Taken</div>
          <div className="stat-value text-primary">{stats.overall.quizzes_taken}</div>
          <div className="stat-desc">Unique quizzes attempted</div>
        </div>
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Total Attempts</div>
          <div className="stat-value text-secondary">{stats.overall.total_attempts}</div>
          <div className="stat-desc">All quiz attempts</div>
        </div>
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Average Score</div>
          <div className="stat-value text-success">{stats.overall.average_score}%</div>
          <div className="stat-desc">Across all attempts</div>
        </div>
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Best Score</div>
          <div className="stat-value text-info">{stats.overall.best_score}%</div>
          <div className="stat-desc">Your highest score</div>
        </div>
      </div>

      {/* Questions and Time Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Questions Attempted</div>
          <div className="stat-value text-warning">{stats.questions.total_attempted}</div>
          <div className="stat-desc">Total questions answered</div>
        </div>
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Success Rate</div>
          <div className="stat-value text-accent">{stats.overall.success_rate}%</div>
          <div className="stat-desc">Correct answers</div>
        </div>
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Avg Time/Quiz</div>
          <div className="stat-value">{stats.time.avg_time_per_quiz} min</div>
          <div className="stat-desc">Average completion time</div>
        </div>
      </div>

      {/* Recent Performance Chart */}
      {stats.recent_performance.length > 0 && (
        <div className="card bg-base-100 shadow border p-4">
          <h2 className="text-xl font-bold mb-4">Recent Performance (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.recent_performance} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="attempts" fill="#3B82F6" name="Attempts" />
              <Bar dataKey="avg_score" fill="#10B981" name="Avg Score %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Progress Chart */}
      {stats.monthly_progress.length > 0 && (
        <div className="card bg-base-100 shadow border p-4">
          <h2 className="text-xl font-bold mb-4">Monthly Progress (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthly_progress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avg_score"
                name="Average Score %"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Difficulty Performance */}
      {stats.difficulty_stats.length > 0 && (
        <div className="card bg-base-100 shadow border p-4">
          <h2 className="text-xl font-bold mb-4">Performance by Difficulty</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.difficulty_stats} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="difficulty" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="avg_score" fill="#8B5CF6" name="Average Score %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quiz Performance Table */}
      {stats.quiz_performance.length > 0 && (
        <div className="card bg-base-100 shadow border p-4">
          <h2 className="text-xl font-bold mb-4">Quiz Performance</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Attempts</th>
                  <th>Avg Score</th>
                  <th>Best Score</th>
                  <th>Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {stats.quiz_performance.map((quiz) => (
                  <tr key={quiz.quiz_id}>
                    <td className="font-medium">{quiz.title}</td>
                    <td>{quiz.attempts}</td>
                    <td>
                      <div className="badge badge-outline">{quiz.avg_score}%</div>
                    </td>
                    <td>
                      <div className="badge badge-success">{quiz.best_score}%</div>
                    </td>
                    <td>{new Date(quiz.last_attempt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;