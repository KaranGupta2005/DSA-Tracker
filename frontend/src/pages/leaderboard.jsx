import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, TrendingUp, Target, RefreshCw, Activity, Flame } from 'lucide-react';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

const PERIODS = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'All-Time', value: 'all-time' },
];

const SORT_MODES = [
  { label: 'Activity Score', value: 'score' },
  { label: 'CF Rating', value: 'cfRating' },
  { label: 'LC Rating', value: 'lcRating' },
];

function LeaderboardPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePeriod, setActivePeriod] = useState('all-time');
  const [sortMode, setSortMode] = useState('score');

  const fetchLeaderboard = useCallback(async (period) => {
    setLoading(true);
    setError('');
    try {
      let response;
      if (period === 'all-time') {
        response = await api.get('/leaderboard');
      } else {
        response = await api.get(`/leaderboard/filter?period=${period}`);
      }
      setMembers(response.data.leaderboard || response.data || []);
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to load leaderboard data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(activePeriod);
  }, [activePeriod, fetchLeaderboard]);

  // Sort members based on active sort mode
  const sortedMembers = [...members].sort((a, b) => {
    if (sortMode === 'cfRating') {
      return (b.codeforcesRating || 0) - (a.codeforcesRating || 0);
    }
    if (sortMode === 'lcRating') {
      return (b.leetcodeRating || 0) - (a.leetcodeRating || 0);
    }
    // Default: activity score (handle both field names from API)
    return (b.activityScore ?? b.score ?? 0) - (a.activityScore ?? a.score ?? 0);
  }).map((m, idx) => ({ ...m, rank: idx + 1 }));

  const currentUser = sortedMembers.find(
    (m) => (m.codeforcesHandle || m.handle) === user?.codeforcesHandle
  );

  // Helper to get display value based on sort mode
  const getScoreValue = (member) => {
    if (sortMode === 'cfRating') return member.codeforcesRating || 0;
    if (sortMode === 'lcRating') return member.leetcodeRating || 0;
    return member.activityScore ?? member.score ?? 0;
  };

  const getScoreLabel = () => {
    if (sortMode === 'cfRating') return 'CF Rating';
    if (sortMode === 'lcRating') return 'LC Rating';
    return 'Score';
  };

  // Column values change based on sort mode
  const getProblemsValue = (member) => {
    if (sortMode === 'cfRating') {
      // CF mode: show CF rating-based "problems" — not available, show total
      return member.totalProblems ?? member.problemsSolved ?? 0;
    }
    if (sortMode === 'lcRating') {
      // LC mode: show LC solved
      const lc = member.leetcodeStats || {};
      return (lc.easy || 0) + (lc.medium || 0) + (lc.hard || 0);
    }
    // Activity Score mode: show POTD completions
    return member.dailyCompletions ?? 0;
  };

  const getStreakValue = (member) => {
    // Streak: always show the current streak (LC-based or POTD-based)
    return member.currentStreak ?? member.streak ?? 0;
  };

  const getProblemsLabel = () => {
    if (sortMode === 'cfRating') return 'LC Solved';
    if (sortMode === 'lcRating') return 'LC Solved';
    return 'POTD Done';
  };

  const getStreakLabel = () => {
    return 'Streak';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5" style={{ color: '#ffd60a' }} />;
    if (rank === 2) return <Medal className="w-5 h-5" style={{ color: '#c0c0c0' }} />;
    if (rank === 3) return <Medal className="w-5 h-5" style={{ color: '#cd7f32' }} />;
    return null;
  };

  return (
    <div className="min-h-screen bg-[#09090b] px-4 py-8 md:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-7 h-7 text-[#ffd60a]" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">Leaderboard</h1>
          </div>
          <p className="text-sm text-white/50">
            Compete, climb, and conquer — see how you stack up against fellow members.
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-4"
        >
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setActivePeriod(p.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                activePeriod === p.value
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white/80'
              }`}
            >
              {p.label}
            </button>
          ))}
        </motion.div>

        {/* Sort Mode Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider self-center mr-2">Sort by:</span>
          {SORT_MODES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSortMode(s.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                sortMode === s.value
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* Current User Stats Banner */}
        {!loading && !error && currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mb-6"
          >
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-orange-500/40 via-orange-400/20 to-transparent">
              <div className="bg-[#151515] rounded-2xl p-4 md:p-5">
                <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase mb-3">
                  Your Position
                </p>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      {getRankIcon(currentUser.rank) || (
                        <span className="text-sm font-bold text-orange-400">
                          #{currentUser.rank}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{currentUser.codeforcesHandle}</p>
                      <p className="text-xs text-white/40">Rank #{currentUser.rank} of {sortedMembers.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-white/50 mb-0.5">
                        <Target className="w-3.5 h-3.5" />
                        <span className="text-[11px] uppercase">{getProblemsLabel()}</span>
                      </div>
                      <p className="text-lime-400 font-bold tabular-nums">{getProblemsValue(currentUser)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-white/50 mb-0.5">
                        <Flame className="w-3.5 h-3.5" />
                        <span className="text-[11px] uppercase">{getStreakLabel()}</span>
                      </div>
                      <p className="text-orange-400 font-bold tabular-nums">{getStreakValue(currentUser)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-white/50 mb-0.5">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-[11px] uppercase">{getScoreLabel()}</span>
                      </div>
                      <p className="text-lime-400 font-bold tabular-nums">{getScoreValue(currentUser)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-white/60 text-sm mb-4 text-center">{error}</p>
            <button
              onClick={() => fetchLeaderboard(activePeriod)}
              className="px-5 py-2.5 bg-white text-black font-medium text-sm rounded-lg hover:bg-white/90 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3 border-b border-[#222] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                  <div className="flex-1 h-4 bg-white/10 animate-pulse rounded" />
                  <div className="w-16 h-4 bg-white/10 animate-pulse rounded hidden md:block" />
                  <div className="w-14 h-4 bg-white/10 animate-pulse rounded hidden md:block" />
                  <div className="w-16 h-4 bg-white/10 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedMembers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Trophy className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">
              No leaderboard data available for this period.
            </p>
          </motion.div>
        )}

        {/* Leaderboard Table */}
        {!loading && !error && sortedMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden"
          >
            {/* Section Header */}
            <div className="px-4 md:px-5 pt-4 pb-2">
              <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase">
                Rankings
              </p>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              {/* Table Header */}
              <div className="grid grid-cols-[60px_1fr_100px_90px_100px] gap-3 px-5 py-2.5 border-b border-[#222]">
                <span className="text-xs font-medium text-white/50 uppercase">Rank</span>
                <span className="text-xs font-medium text-white/50 uppercase">Member</span>
                <span className="text-xs font-medium text-white/50 uppercase text-center">{getProblemsLabel()}</span>
                <span className="text-xs font-medium text-white/50 uppercase text-center">{getStreakLabel()}</span>
                <span className="text-xs font-medium text-white/50 uppercase text-right">{getScoreLabel()}</span>
              </div>

              {/* Table Body */}
              <AnimatePresence mode="popLayout">
                {sortedMembers.map((member, index) => {
                  const rank = member.rank || index + 1;
                  const isCurrentUser = (member.codeforcesHandle || member.handle) === user?.codeforcesHandle;

                  return (
                    <motion.div
                      key={(member.codeforcesHandle || member.handle) || member._id || index}
                      layoutId={(member.codeforcesHandle || member.handle) || member._id || `member-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className={`grid grid-cols-[60px_1fr_100px_90px_100px] gap-3 px-5 py-3 items-center border-b border-[#222] last:border-0 transition-colors hover:bg-white/5 ${
                        isCurrentUser ? 'bg-orange-500/10' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex items-center gap-1.5">
                        {getRankIcon(rank) || (
                          <span className="text-sm font-medium text-white/60 tabular-nums">
                            #{rank}
                          </span>
                        )}
                      </div>

                      {/* Member */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {(member.codeforcesHandle || member.handle)}
                          {isCurrentUser && (
                            <span className="ml-2 text-[10px] font-bold text-orange-400 uppercase">
                              You
                            </span>
                          )}
                        </p>
                        {member.leetcodeUsername && (
                          <p className="text-xs text-white/30 truncate">
                            LC: {member.leetcodeUsername}
                          </p>
                        )}
                      </div>

                      {/* Problems */}
                      <p className="text-sm text-lime-400 font-bold tabular-nums text-center">
                        {getProblemsValue(member)}
                      </p>

                      {/* Streak */}
                      <div className="flex items-center justify-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-sm font-medium text-white/70 tabular-nums">
                          {getStreakValue(member)}
                        </span>
                      </div>

                      {/* Score */}
                      <p className="text-sm text-lime-400 font-bold tabular-nums text-right">
                        {getScoreValue(member)}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden px-3 pb-3">
              <AnimatePresence mode="popLayout">
                {sortedMembers.map((member, index) => {
                  const rank = member.rank || index + 1;
                  const isCurrentUser = (member.codeforcesHandle || member.handle) === user?.codeforcesHandle;

                  return (
                    <motion.div
                      key={(member.codeforcesHandle || member.handle) || member._id || `mobile-${index}`}
                      layoutId={`mobile-${(member.codeforcesHandle || member.handle) || member._id || index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className={`rounded-xl border p-3 mb-2 last:mb-0 transition-colors ${
                        isCurrentUser
                          ? 'bg-orange-500/10 border-orange-500/20'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                            {getRankIcon(rank) || (
                              <span className="text-xs font-bold text-white/50">#{rank}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {(member.codeforcesHandle || member.handle)}
                              {isCurrentUser && (
                                <span className="ml-1.5 text-[10px] font-bold text-orange-400 uppercase">
                                  You
                                </span>
                              )}
                            </p>
                            {member.leetcodeUsername && (
                              <p className="text-xs text-white/30 truncate">
                                LC: {member.leetcodeUsername}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lime-400 font-bold text-sm tabular-nums">
                            {getScoreValue(member)}
                          </p>
                          <p className="text-[10px] text-white/30 uppercase">{getScoreLabel()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-white/30" />
                          <span className="text-xs text-white/50">
                            {getProblemsValue(member)} solved
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-400/60" />
                          <span className="text-xs text-white/50">
                            {getStreakValue(member)} day streak
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Boilerplate(LeaderboardPage);
