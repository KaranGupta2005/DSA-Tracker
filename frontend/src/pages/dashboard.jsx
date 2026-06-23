import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Trophy,
  Flame,
  Code2,
  TrendingUp,
  Link2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

// --- Animation variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// --- Skeleton loader ---
function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`bg-white/10 animate-pulse rounded-2xl h-36 ${className}`}
    />
  );
}

function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-white/10 animate-pulse rounded-2xl h-64 ${className}`}
    />
  );
}

// --- Main Dashboard ---
function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [cfProfile, setCfProfile] = useState(null);
  const [lcStats, setLcStats] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // LeetCode linking state
  const [leetcodeInput, setLeetcodeInput] = useState('');
  const [linkingLeetcode, setLinkingLeetcode] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Fetch dashboard data
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchDashboardData = async () => {
    setLoadingData(true);
    setError('');

    try {
      const requests = [];

      if (user.codeforcesHandle) {
        requests.push(
          api.get(`/codeforces/profile/${user.codeforcesHandle}`).catch(() => null)
        );
      } else {
        requests.push(Promise.resolve(null));
      }

      if (user.leetcodeUsername) {
        requests.push(
          api.get(`/leetcode/sync/${user.leetcodeUsername}`).catch(() => null)
        );
      } else {
        requests.push(Promise.resolve(null));
      }

      requests.push(api.get('/leaderboard').catch(() => null));

      const [cfRes, lcRes, lbRes] = await Promise.all(requests);

      if (cfRes?.data) setCfProfile(cfRes.data);
      if (lcRes?.data) setLcStats(lcRes.data);

      if (lbRes?.data) {
        const members = lbRes.data.leaderboard || lbRes.data;
        const myEntry = Array.isArray(members)
          ? members.find(
              (m) =>
                m.codeforcesHandle === user.codeforcesHandle ||
                m._id === user._id ||
                m.id === user._id
            )
          : null;
        setLeaderboardData(myEntry);
      }
    } catch {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleLinkLeetcode = async (e) => {
    e.preventDefault();
    if (!leetcodeInput.trim()) {
      setLinkError('Please enter your LeetCode username.');
      return;
    }

    setLinkingLeetcode(true);
    setLinkError('');
    setLinkSuccess('');

    try {
      await api.patch('/auth/profile/leetcode', {
        leetcodeUsername: leetcodeInput.trim(),
      });
      setLinkSuccess('LeetCode account linked successfully!');
      setLeetcodeInput('');
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.leetcodeUsername = leetcodeInput.trim();
      localStorage.setItem('user', JSON.stringify(storedUser));
      window.location.reload();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to link LeetCode account.';
      setLinkError(msg);
    } finally {
      setLinkingLeetcode(false);
    }
  };

  // Auth loading state
  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#09090b] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Derived data
  const cfRating = cfProfile?.rating ?? user?.codeforcesRating ?? null;
  const cfRank = cfProfile?.rank ?? user?.codeforcesRank ?? 'Unrated';
  const cfAvatar = cfProfile?.avatar ?? null;
  const streak = lcStats?.currentStreak ?? 0;
  const activityScore = leaderboardData?.activityScore ?? 0;

  const lcEasy = lcStats?.easy ?? 0;
  const lcMedium = lcStats?.medium ?? 0;
  const lcHard = lcStats?.hard ?? 0;
  const lcTotal = lcEasy + lcMedium + lcHard;

  const recentSubmissions = lcStats?.recentSubmissions || [];

  return (
    <div className="min-h-screen bg-[#09090b] px-4 sm:px-6 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase mb-1">
            Dashboard
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Welcome back, {user?.codeforcesHandle || 'Member'}
          </h1>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loadingData ? (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonBlock />
            <SkeletonBlock />
          </motion.div>
        ) : (
          <>
            {/* Stats Grid — 2 columns */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
            >
              {/* CF Rating Card */}
              <div className="bg-[#151515] rounded-2xl border border-white/5 p-5 hover:-translate-y-1 transition-transform duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {cfAvatar ? (
                      <img
                        src={cfAvatar}
                        alt="CF Avatar"
                        className="w-10 h-10 rounded-full ring-2 ring-cyan-400/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-cyan-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-white/40 tracking-wide uppercase">
                        Codeforces Rating
                      </p>
                      <p className="text-2xl font-black text-white tracking-tight tabular-nums">
                        {cfRating != null ? cfRating : '—'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full">
                    {cfRank}
                  </span>
                </div>
              </div>

              {/* Streak + Activity Score Card */}
              <div className="bg-[#151515] rounded-2xl border border-white/5 p-5 hover:-translate-y-1 transition-transform duration-200">
                <div className="grid grid-cols-2 gap-4">
                  {/* Streak */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-[#f97316]" />
                      <p className="text-[10px] font-bold text-white/40 tracking-wide uppercase">
                        Streak
                      </p>
                    </div>
                    <p className="text-2xl font-black text-[#f97316] tracking-tight tabular-nums">
                      {streak}
                      <span className="text-sm font-semibold text-white/30 ml-1">days</span>
                    </p>
                  </div>
                  {/* Activity Score */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <p className="text-[10px] font-bold text-white/40 tracking-wide uppercase">
                        XP Score
                      </p>
                    </div>
                    <p className="text-2xl font-black text-amber-400 tracking-tight tabular-nums">
                      {activityScore}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* LeetCode Breakdown */}
            {user?.leetcodeUsername ? (
              <motion.div variants={itemVariants} className="mb-6">
                <div className="bg-[#151515] rounded-2xl border border-white/5 p-5 hover:-translate-y-1 transition-transform duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-[#84cc16]" />
                      <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase">
                        LeetCode Progress
                      </p>
                    </div>
                    <p className="text-sm font-bold text-white tabular-nums">
                      {lcTotal} <span className="text-white/30 font-medium">solved</span>
                    </p>
                  </div>

                  {/* Difficulty stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-[9px] font-bold text-white/40 tracking-wide uppercase mb-0.5">
                        Easy
                      </p>
                      <p className="text-xl font-black text-[#84cc16] tracking-tight tabular-nums">
                        {lcEasy}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-white/40 tracking-wide uppercase mb-0.5">
                        Medium
                      </p>
                      <p className="text-xl font-black text-amber-400 tracking-tight tabular-nums">
                        {lcMedium}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-white/40 tracking-wide uppercase mb-0.5">
                        Hard
                      </p>
                      <p className="text-xl font-black text-red-400 tracking-tight tabular-nums">
                        {lcHard}
                      </p>
                    </div>
                  </div>

                  {/* Colored progress bar */}
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                    {lcTotal > 0 && (
                      <>
                        <div
                          className="h-full bg-[#84cc16] rounded-l-full"
                          style={{ width: `${(lcEasy / lcTotal) * 100}%` }}
                        />
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${(lcMedium / lcTotal) * 100}%` }}
                        />
                        <div
                          className="h-full bg-red-400 rounded-r-full"
                          style={{ width: `${(lcHard / lcTotal) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Link LeetCode Prompt */
              <motion.div variants={itemVariants} className="mb-6">
                <div className="bg-[#151515] rounded-2xl border border-[#f97316]/20 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-[#f97316]" />
                    <p className="text-sm font-bold text-white">
                      Link Your LeetCode Account
                    </p>
                  </div>
                  <p className="text-xs text-white/50 mb-4">
                    Connect your LeetCode account to track progress across both
                    platforms and boost your activity score.
                  </p>

                  {linkError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <p className="text-xs text-red-300">{linkError}</p>
                    </div>
                  )}
                  {linkSuccess && (
                    <div className="flex items-center gap-2 bg-[#84cc16]/10 border border-[#84cc16]/20 rounded-xl px-3 py-2 mb-3">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#84cc16] shrink-0" />
                      <p className="text-xs text-[#84cc16]">{linkSuccess}</p>
                    </div>
                  )}

                  <form onSubmit={handleLinkLeetcode} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="LeetCode username"
                      value={leetcodeInput}
                      onChange={(e) => setLeetcodeInput(e.target.value)}
                      disabled={linkingLeetcode}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#f97316]/50 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={linkingLeetcode}
                      className="bg-[#f97316] hover:bg-[#f97316]/90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linkingLeetcode ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Link'
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Recent Submissions */}
            <motion.div variants={itemVariants}>
              <div className="bg-[#151515] rounded-2xl border border-white/5 p-5">
                <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase mb-4">
                  Recent Submissions
                </p>

                {recentSubmissions.length > 0 ? (
                  <div className="space-y-2">
                    {recentSubmissions.slice(0, 8).map((sub, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${getDifficultyDot(
                              sub.difficulty
                            )}`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {sub.title || sub.problemTitle || sub.name}
                            </p>
                            <p className="text-[10px] text-white/30">
                              {sub.language || ''}
                              {(sub.date || sub.submissionDate) &&
                                ` · ${new Date(
                                  sub.date || sub.submissionDate
                                ).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold tracking-wide uppercase shrink-0 ${getDifficultyText(
                            sub.difficulty
                          )}`}
                        >
                          {sub.difficulty || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Clock className="w-6 h-6 text-white/20 mb-2" />
                    <p className="text-sm text-white/30">
                      {user?.leetcodeUsername
                        ? 'No recent submissions found.'
                        : 'Link your LeetCode account to see submissions.'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// --- Helpers ---
function getDifficultyDot(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'bg-[#84cc16]';
    case 'medium':
      return 'bg-amber-400';
    case 'hard':
      return 'bg-red-400';
    default:
      return 'bg-white/20';
  }
}

function getDifficultyText(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'text-[#84cc16]';
    case 'medium':
      return 'text-amber-400';
    case 'hard':
      return 'text-red-400';
    default:
      return 'text-white/30';
  }
}

export default Boilerplate(DashboardPage);
