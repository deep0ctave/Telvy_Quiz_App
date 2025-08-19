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
} from "recharts";

const Stats = () => {
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState([]);
  const [overallStats, setOverallStats] = useState({});

  useEffect(() => {
    setTimeout(() => {
      setOverallStats({
        quizzesTaken: 24,
        questionsAttempted: 340,
        correctAnswers: 260,
        avgTimePerQuiz: 7.5,
        successRate: 76,
      });

      setDailyData([
        { date: "Jul 1", attempted: 12, correct: 8 },
        { date: "Jul 2", attempted: 15, correct: 12 },
        { date: "Jul 3", attempted: 10, correct: 7 },
        { date: "Jul 4", attempted: 17, correct: 13 },
        { date: "Jul 5", attempted: 20, correct: 15 },
      ]);

      setLoading(false);
    }, 500);
  }, []);

  if (loading) return <div className="p-6">Loading stats...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">📊 Your Quiz Stats</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Quizzes Taken</div>
          <div className="stat-value text-primary">{overallStats.quizzesTaken}</div>
        </div>
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Questions Attempted</div>
          <div className="stat-value text-secondary">{overallStats.questionsAttempted}</div>
        </div>
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Correct Answers</div>
          <div className="stat-value text-success">{overallStats.correctAnswers}</div>
        </div>
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Avg Time / Quiz</div>
          <div className="stat-value">{overallStats.avgTimePerQuiz} min</div>
        </div>
        <div className="stat bg-base-200 rounded-box shadow">
          <div className="stat-title">Success Rate</div>
          <div className="stat-value text-info">{overallStats.successRate}%</div>
          <div className="stat-desc">Correct / Attempted</div>
        </div>
      </div>

      {/* Daily Performance Chart */}
      <div className="card bg-base-100 shadow border p-4">
        <h2 className="text-xl font-bold mb-4">Daily Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="attempted" fill="#60A5FA" name="Attempted" />
            <Bar dataKey="correct" fill="#34D399" name="Correct" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Chart */}
      <div className="card bg-base-100 shadow border p-4">
        <h2 className="text-xl font-bold mb-4">Accuracy Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={(d) => Math.round((d.correct / d.attempted) * 100)}
              name="Accuracy %"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Stats;
