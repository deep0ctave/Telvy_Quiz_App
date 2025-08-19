import React, { useEffect, useState } from "react";

const currentUserId = 999;

const mockLeaderboard = Array.from({ length: 50 }, (_, i) => {
  const id = i + 1;
  return {
    id,
    name: `User ${id}`,
    username: `@user${id}`,
    avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=User${id}`,
    score: Math.floor(Math.random() * 40) + 60,
    time_taken: `${Math.floor(Math.random() * 6) + 5}:${Math.floor(Math.random() * 60)
      .toString()
      .padStart(2, "0")}`,
  };
});

const currentUser = {
  id: currentUserId,
  name: "Aryan Sharma",
  username: "@aryansharma",
  avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=aryan`,
  score: 66,
  time_taken: "08:14",
};

mockLeaderboard.push(currentUser);

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [highlightedRank, setHighlightedRank] = useState(null);
  const [activeRange, setActiveRange] = useState("daily");

  useEffect(() => {
    const sorted = [...mockLeaderboard].sort((a, b) => b.score - a.score);
    setLeaders(sorted);
    const rank = sorted.findIndex((u) => u.id === currentUserId);
    if (rank !== -1) setHighlightedRank(rank + 1);
  }, [activeRange]);

  const ranges = ["daily", "weekly", "monthly", "yearly"];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <div className="join">
          {ranges.map((r) => (
            <button
              key={r}
              className={`join-item btn btn-sm sm:btn-md capitalize ${
                activeRange === r ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setActiveRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="card bg-base-100 shadow-md border border-base-300">
        <div className="card-body p-0 overflow-x-auto max-h-[70vh] overflow-y-auto rounded-md">
          <table className="table table-zebra w-full">
            <thead className="sticky top-0 z-10 bg-base-200">
              <tr>
                <th className="w-16 text-center">Rank</th>
                <th>User</th>
                <th>Username</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((player, index) => {
                const rank = index + 1;
                const isUser = player.id === currentUserId;

                const rowClass = isUser
                  ? "bg-primary/10 text-primary font-semibold"
                  : "";

                const medal =
                  rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

                return (
                  <tr key={player.id} className={rowClass}>
                    <td className="text-center">{medal}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar">
                          <div className="w-8 h-8 rounded-full">
                            <img src={player.avatar} alt={player.name} />
                          </div>
                        </div>
                        <div>{player.name}</div>
                      </div>
                    </td>
                    <td>{player.username}</td>
                    <td className="font-bold">{player.score}</td>
                    <td>{player.time_taken}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {highlightedRank > 50 && (
        <div className="alert alert-info shadow text-sm">
          You are ranked <strong>#{highlightedRank}</strong> 🎯
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
