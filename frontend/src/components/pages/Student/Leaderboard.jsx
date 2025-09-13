import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [schoolLeaderboard, setSchoolLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [topPerformers, setTopPerformers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRange, setActiveRange] = useState("all");
  const [activeTab, setActiveTab] = useState("students");
  const { user } = useAuth();

  const ranges = [
    { key: "all", label: "All Time" },
    { key: "yearly", label: "Yearly" },
    { key: "monthly", label: "Monthly" },
    { key: "weekly", label: "Weekly" },
    { key: "daily", label: "Daily" }
  ];

  useEffect(() => {
    fetchLeaderboard();
  }, [activeRange]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/student/leaderboard?range=${activeRange}&limit=50`);
      setLeaderboard(response.data.leaderboard);
      setSchoolLeaderboard(response.data.school_leaderboard || []);
      setCurrentUser(response.data.current_user);
      setTopPerformers(response.data.top_performers);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getMedal = (rank) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  const getAvatarUrl = (username) => {
    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${username}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-2">Loading leaderboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={fetchLeaderboard}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">🏆 Leaderboard</h1>
        <div className="join">
          {ranges.map((range) => (
            <button
              key={range.key}
              className={`join-item btn btn-sm sm:btn-md ${
                activeRange === range.key ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setActiveRange(range.key)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Performers Cards */}
      {Object.keys(topPerformers).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <h3 className="card-title text-sm">📚 Most Quizzes</h3>
              <p className="text-lg font-bold">{topPerformers.most_quizzes?.name || 'N/A'}</p>
              <p className="text-sm opacity-70">{topPerformers.most_quizzes?.value || 0} quizzes</p>
            </div>
          </div>
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <h3 className="card-title text-sm">📈 Highest Average</h3>
              <p className="text-lg font-bold">{topPerformers.highest_avg?.name || 'N/A'}</p>
              <p className="text-sm opacity-70">{topPerformers.highest_avg?.value || 0}%</p>
            </div>
          </div>
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <h3 className="card-title text-sm">🎯 Best Single Score</h3>
              <p className="text-lg font-bold">{topPerformers.best_single?.name || 'N/A'}</p>
              <p className="text-sm opacity-70">{topPerformers.best_single?.value || 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Current User Status */}
      {currentUser && (
        <div className="alert alert-info">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="w-8 h-8 rounded-full">
                <img src={getAvatarUrl(currentUser.username)} alt={currentUser.name} />
              </div>
            </div>
            <div>
              <strong>Your Rank: #{currentUser.rank}</strong>
              <div className="text-sm opacity-80">
                {currentUser.average_score}% average • {currentUser.quizzes_taken} quizzes • {currentUser.total_attempts} attempts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs for Students vs Schools */}
      <div className="tabs tabs-boxed justify-center">
        <button
          className={`tab ${activeTab === "students" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("students")}
        >
          👥 Students
        </button>
        <button
          className={`tab ${activeTab === "schools" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("schools")}
        >
          🏫 Schools
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="card bg-base-100 shadow-md border border-base-300">
        <div className="card-body p-0 overflow-x-auto max-h-[70vh] overflow-y-auto rounded-md">
          {activeTab === "students" ? (
            leaderboard.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                <p className="text-base-content/70">
                  No quiz attempts found for the selected time range.
                </p>
              </div>
            ) : (
              <table className="table table-zebra w-full">
                <thead className="sticky top-0 z-10 bg-base-200">
                  <tr>
                    <th className="w-16 text-center">Rank</th>
                    <th>Student</th>
                    <th>School Info</th>
                    <th>Avg Score</th>
                    <th>Best Score</th>
                    <th>Quizzes</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player) => {
                    const isCurrentUser = user && player.id === user.id;
                  const rowClass = isCurrentUser
                    ? "bg-primary/10 text-primary font-semibold"
                    : "";

                  return (
                    <tr key={player.id} className={rowClass}>
                      <td className="text-center font-bold">
                        {getMedal(player.rank)}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="w-8 h-8 rounded-full">
                              <img src={getAvatarUrl(player.username)} alt={player.name} />
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm opacity-70">@{player.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {player.school && <div>{player.school}</div>}
                          {player.class && player.section && (
                            <div className="opacity-70">{player.class} - {player.section}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="badge badge-primary badge-lg">
                          {player.average_score}%
                        </div>
                      </td>
                      <td>
                        <div className="badge badge-success">
                          {player.best_score}%
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="badge badge-outline">
                          {player.quizzes_taken}
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="badge badge-outline">
                          {player.total_attempts}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )
          ) : (
            schoolLeaderboard.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">🏫</div>
                <h3 className="text-lg font-semibold mb-2">No School Data Available</h3>
                <p className="text-base-content/70">
                  No school statistics found for the selected time range.
                </p>
              </div>
            ) : (
              <table className="table table-zebra w-full">
                <thead className="sticky top-0 z-10 bg-base-200">
                  <tr>
                    <th className="w-16 text-center">Rank</th>
                    <th>School Name</th>
                    <th>Students</th>
                    <th>Avg Score</th>
                    <th>Best Score</th>
                    <th>Total Quizzes</th>
                    <th>Total Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolLeaderboard.map((school) => {
                    const isCurrentUserSchool = user && school.school_name === user.school;
                    const rowClass = isCurrentUserSchool
                      ? "bg-primary/10 text-primary font-semibold"
                      : "";

                    return (
                      <tr key={school.school_name} className={rowClass}>
                        <td className="text-center">
                          <div className="text-lg font-bold">
                            {getMedal(school.rank)}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar placeholder">
                              <div className="bg-primary text-primary-content rounded-full w-10">
                                <span className="text-lg">🏫</span>
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold">{school.school_name}</div>
                              {isCurrentUserSchool && (
                                <div className="text-xs text-primary">Your School</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <div className="badge badge-info">
                              {school.active_students} active
                            </div>
                            <div className="text-xs text-base-content/70">
                              {school.total_students} total
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="badge badge-primary">
                            {school.average_score}%
                          </div>
                        </td>
                        <td>
                          <div className="badge badge-success">
                            {school.best_score}%
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="badge badge-outline">
                            {school.total_quizzes_taken}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="badge badge-outline">
                            {school.total_attempts}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-base-content/70">
        {activeTab === "students" ? (
          <>Showing top {leaderboard.length} students • Rankings based on average score, then best score, then total attempts</>
        ) : (
          <>Showing top {schoolLeaderboard.length} schools • Rankings based on average score, then total students</>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;