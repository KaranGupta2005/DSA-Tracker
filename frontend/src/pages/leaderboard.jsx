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

function LeaderboardPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePeriod, setActivePeriod] = useState('all-time');

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

  const currentUser = members.find(
    (m) => m.codeforcesHandle === user?.codeforcesHandle
  );

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
          className="flex gap-2 mb-6"
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
                      <p className="text-xs text-white/40">Rank #{currentUser.rank} of {members.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-white/50 mb-0.5">
                        <Target className="w-3.5 h-3.5" />
                        <span className="text-[11px] uppercase">Problems</span>
                      </div>
                      <p className="text-lime-400 font-bold tabular-nums">{currentUser.totalProblems ?? 0}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-white/50 mb-0.5">
                        <Flame className="w-3.5 h-3.5" />
                        <span className="text-[11px] uppercase">Streak</span>
                      </div>
                      <p className="text-orange-400 font-bold tabular-nums">{currentUser.currentStreak ?? 0}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-white/50 mb-0.5">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-[11px] uppercase">Score</span>
                      </div>
                      <p className="text-lime-400 font-bold tabular-nums">{currentUser.activityScore ?? 0}</p>
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
        {!loading && !error && members.length === 0 && (
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
        {!loading && !error && members.length > 0 && (
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
                <span className="text-xs font-medium text-white/50 uppercase text-center">Problems</span>
                <span className="text-xs font-medium text-white/50 uppercase text-center">Streak</span>
                <span className="text-xs font-medium text-white/50 uppercase text-right">Score</span>
              </div>

              {/* Table Body */}
              <AnimatePresence mode="popLayout">
                {members.map((member, index) => {
                  const rank = member.rank || index + 1;
                  const isCurrentUser = member.codeforcesHandle === user?.codeforcesHandle;

                  return (
                    <motion.div
                      key={member.codeforcesHandle || member._id || index}
                      layoutId={member.codeforcesHandle || member._id || `member-${index}`}
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
                          {member.codeforcesHandle}
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
                        {member.totalProblems ?? 0}
                      </p>

                      {/* Streak */}
                      <div className="flex items-center justify-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-sm font-medium text-white/70 tabular-nums">
                          {member.currentStreak ?? 0}
                        </span>
                      </div>

                      {/* Score */}
                      <p className="text-sm text-lime-400 font-bold tabular-nums text-right">
                        {member.activityScore ?? 0}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden px-3 pb-3">
              <AnimatePresence mode="popLayout">
                {members.map((member, index) => {
                  const rank = member.rank || index + 1;
                  const isCurrentUser = member.codeforcesHandle === user?.codeforcesHandle;

                  return (
                    <motion.div
                      key={member.codeforcesHandle || member._id || `mobile-${index}`}
                      layoutId={`mobile-${member.codeforcesHandle || member._id || index}`}
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
                              {member.codeforcesHandle}
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
                            {member.activityScore ?? 0}
                          </p>
                          <p className="text-[10px] text-white/30 uppercase">Score</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-white/30" />
                          <span className="text-xs text-white/50">
                            {member.totalProblems ?? 0} solved
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-400/60" />
                          <span className="text-xs text-white/50">
                            {member.currentStreak ?? 0} day streak
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
