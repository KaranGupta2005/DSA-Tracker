import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Flame,
  Code2,
  TrendingUp,
  Link2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Check,
  X,
  Zap,
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
    <div className={`bg-white/10 animate-pulse rounded-2xl h-44 ${className}`} />
  );
}

function SkeletonBlock({ className = '' }) {
  return (
    <div className={`bg-white/10 animate-pulse rounded-2xl h-64 ${className}`} />
  );
}

// --- Rank color helper ---
function getRankColor(rank) {
  if (!rank) return 'text-gray-400';
  const r = rank.toLowerCase();
  if (r.includes('legendary') || r.includes('tourist')) return 'text-red-500';
  if (r.includes('international grandmaster')) return 'text-red-400';
  if (r.includes('grandmaster')) return 'text-red-300';
  if (r.includes('international master')) return 'text-orange-400';
  if (r.includes('master')) return 'text-orange-300';
  if (r.includes('candidate master')) return 'text-violet-400';
  if (r.includes('expert')) return 'text-blue-400';
  if (r.includes('specialist')) return 'text-cyan-400';
  if (r.includes('pupil')) return 'text-green-400';
  if (r.includes('newbie')) return 'text-gray-400';
  return 'text-white/60';
}

function getRankBg(rank) {
  if (!rank) return 'bg-gray-400/10';
  const r = rank.toLowerCase();
  if (r.includes('grandmaster')) return 'bg-red-400/10';
  if (r.includes('master')) return 'bg-orange-400/10';
  if (r.includes('candidate')) return 'bg-violet-400/10';
  if (r.includes('expert')) return 'bg-blue-400/10';
  if (r.includes('specialist')) return 'bg-cyan-400/10';
  if (r.includes('pupil')) return 'bg-green-400/10';
  return 'bg-gray-400/10';
}

function getDifficultyDot(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'bg-[#84cc16]';
    case 'medium': return 'bg-amber-400';
    case 'hard': return 'bg-red-400';
    default: return 'bg-white/20';
  }
}

function getDifficultyText(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'text-[#84cc16]';
    case 'medium': return 'text-amber-400';
    case 'hard': return 'text-red-400';
    default: return 'text-white/30';
  }
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

  // Edit states for profile cards
  const [editingCF, setEditingCF] = useState(false);
  const [cfInput, setCfInput] = useState('');
  const [cfEditLoading, setCfEditLoading] = useState(false);
  const [cfEditError, setCfEditError] = useState('');

  const [editingLC, setEditingLC] = useState(false);
  const [lcInput, setLcInput] = useState('');
  const [lcEditLoading, setLcEditLoading] = useState(false);
  const [lcEditError, setLcEditError] = useState('');

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
        requests.push(api.get(`/codeforces/profile/${user.codeforcesHandle}`).catch(() => null));
      } else {
        requests.push(Promise.resolve(null));
      }
      if (user.leetcodeUsername) {
        requests.push(api.get(`/leetcode/sync/${user.leetcodeUsername}`).catch(() => null));
      } else {
        requests.push(Promise.resolve(null));
      }
      requests.push(api.get('/leaderboard').catch(() => null));
      const [cfRes, lcRes, lbRes] = await Promise.all(requests);
      if (cfRes?.data) setCfProfile(cfRes.data);
      if (lcRes?.data) {
        // Normalize the LC sync response structure
        const raw = lcRes.data.data || lcRes.data;
        setLcStats({
          easy: raw.stats?.easy ?? raw.easy ?? 0,
          medium: raw.stats?.medium ?? raw.medium ?? 0,
          hard: raw.stats?.hard ?? raw.hard ?? 0,
          currentStreak: raw.streak ?? raw.currentStreak ?? 0,
          recentSubmissions: raw.recentSubmissions || [],
          tags: raw.tags || {},
          totalAvailable: raw.stats?.total ?? raw.totalAvailable ?? 3972,
        });
        // Store submission calendar for heatmap
        if (raw.submissionCalendar) {
          setLcCalendar(raw.submissionCalendar);
        }
      }
      if (lbRes?.data) {
        const members = lbRes.data.leaderboard || lbRes.data;
        const myEntry = Array.isArray(members)
          ? members.find(
              (m) => m.codeforcesHandle === user.codeforcesHandle || m._id === user._id || m.id === user._id
            )
          : null;
        setLeaderboardData(myEntry);
      }
      // Fetch CF contest history
      if (user.codeforcesHandle) {
        // Moved to profile page
      }
    } catch {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoadingData(false);
    }
  };

  // Handle CF handle update
  const handleUpdateCF = async (e) => {
    e.preventDefault();
    if (!cfInput.trim()) { setCfEditError('Handle is required.'); return; }
    setCfEditLoading(true);
    setCfEditError('');
    try {
      const res = await api.patch('/auth/profile/codeforces', { codeforcesHandle: cfInput.trim() });
      const updated = res.data.member;
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.codeforcesHandle = updated.codeforcesHandle;
      storedUser.codeforcesRating = updated.codeforcesRating;
      storedUser.codeforcesRank = updated.codeforcesRank;
      localStorage.setItem('user', JSON.stringify(storedUser));
      setEditingCF(false);
      setCfInput('');
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update handle.';
      setCfEditError(msg);
    } finally {
      setCfEditLoading(false);
    }
  };

  // Handle LC username update
  const handleUpdateLC = async (e) => {
    e.preventDefault();
    if (!lcInput.trim()) { setLcEditError('Username is required.'); return; }
    setLcEditLoading(true);
    setLcEditError('');
    try {
      await api.patch('/auth/profile/leetcode', { leetcodeUsername: lcInput.trim() });
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.leetcodeUsername = lcInput.trim();
      localStorage.setItem('user', JSON.stringify(storedUser));
      setEditingLC(false);
      setLcInput('');
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update username.';
      setLcEditError(msg);
    } finally {
      setLcEditLoading(false);
    }
  };

  const handleLinkLeetcode = async (e) => {
    e.preventDefault();
    if (!leetcodeInput.trim()) { setLinkError('Please enter your LeetCode username.'); return; }
    setLinkingLeetcode(true);
    setLinkError('');
    setLinkSuccess('');
    try {
      await api.patch('/auth/profile/leetcode', { leetcodeUsername: leetcodeInput.trim() });
      setLinkSuccess('LeetCode account linked successfully!');
      setLeetcodeInput('');
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.leetcodeUsername = leetcodeInput.trim();
      localStorage.setItem('user', JSON.stringify(storedUser));
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to link LeetCode account.';
      setLinkError(msg);
    } finally {
      setLinkingLeetcode(false);
    }
  };

  // Auth loading state
  if (authLoading || (!user && !error)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Derived data
  const cfRating = cfProfile?.rating ?? user?.codeforcesRating ?? null;
  const cfRank = cfProfile?.rank ?? user?.codeforcesRank ?? 'Unrated';
  const cfAvatar = cfProfile?.avatar ?? null;
  const cfContestsAttended = cfProfile?.contestsAttended ?? null;
  const cfMaxRating = cfProfile?.maxRating ?? null;
  const streak = lcStats?.currentStreak ?? 0;
  const activityScore = leaderboardData?.activityScore ?? 0;
  const lcEasy = lcStats?.easy ?? 0;
  const lcMedium = lcStats?.medium ?? 0;
  const lcHard = lcStats?.hard ?? 0;
  const lcTotal = lcEasy + lcMedium + lcHard;
  const lcTotalAvailable = 3400; // Approximate total LC problems
  const recentSubmissions = lcStats?.recentSubmissions || [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase mb-1">Dashboard</p>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-24" />
          </div>
          <SkeletonBlock />
        </motion.div>
      ) : (
        <>

          {/* ===== PROFILE CARDS ===== */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            {/* LEFT: Codeforces Profile Card */}
            <div className="bg-[#151515] rounded-2xl border border-white/5 p-6 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                {/* Header with avatar and edit */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {cfAvatar ? (
                      <img src={cfAvatar} alt="CF" className="w-12 h-12 rounded-full ring-2 ring-cyan-400/30" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-cyan-400/10 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-cyan-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-white/40 tracking-wide uppercase">Codeforces</p>
                      <AnimatePresence mode="wait">
                        {editingCF ? (
                          <motion.form
                            key="cf-edit"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            onSubmit={handleUpdateCF}
                            className="flex items-center gap-1 mt-1"
                          >
                            <input
                              type="text"
                              value={cfInput}
                              onChange={(e) => setCfInput(e.target.value)}
                              placeholder="New handle"
                              autoFocus
                              disabled={cfEditLoading}
                              className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white placeholder:text-white/30 outline-none focus:border-cyan-400/50"
                            />
                            <button type="submit" disabled={cfEditLoading} className="p-1 text-green-400 hover:text-green-300">
                              <Check className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => { setEditingCF(false); setCfEditError(''); }} className="p-1 text-red-400 hover:text-red-300">
                              <X className="w-4 h-4" />
                            </button>
                          </motion.form>
                        ) : (
                          <motion.p key="cf-display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold text-white">
                            {user?.codeforcesHandle || '—'}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  {!editingCF && (
                    <button onClick={() => { setEditingCF(true); setCfInput(user?.codeforcesHandle || ''); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {cfEditError && <p className="text-xs text-red-400 mb-3">{cfEditError}</p>}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Contest Rating</p>
                    <p className="text-3xl font-black text-white tabular-nums">
                      {cfRating != null ? cfRating.toLocaleString() : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Max Rating</p>
                    <p className="text-lg font-bold text-white/80 tabular-nums">
                      {cfMaxRating ? cfMaxRating.toLocaleString() : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Attended</p>
                    <p className="text-xl font-bold text-white/80 tabular-nums">
                      {cfContestsAttended ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Rank badge */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getRankColor(cfRank)} ${getRankBg(cfRank)}`}>
                    {cfRank}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: LeetCode Profile Card */}
            <div className="bg-[#151515] rounded-2xl border border-white/5 p-6 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#f97316]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                {user?.leetcodeUsername ? (
                  <>
                    {/* Header with edit */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#f97316]/10 flex items-center justify-center">
                          <Code2 className="w-6 h-6 text-[#f97316]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white/40 tracking-wide uppercase">LeetCode</p>
                          <AnimatePresence mode="wait">
                            {editingLC ? (
                              <motion.form
                                key="lc-edit"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onSubmit={handleUpdateLC}
                                className="flex items-center gap-1 mt-1"
                              >
                                <input
                                  type="text"
                                  value={lcInput}
                                  onChange={(e) => setLcInput(e.target.value)}
                                  placeholder="New username"
                                  autoFocus
                                  disabled={lcEditLoading}
                                  className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#f97316]/50"
                                />
                                <button type="submit" disabled={lcEditLoading} className="p-1 text-green-400 hover:text-green-300">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => { setEditingLC(false); setLcEditError(''); }} className="p-1 text-red-400 hover:text-red-300">
                                  <X className="w-4 h-4" />
                                </button>
                              </motion.form>
                            ) : (
                              <motion.p key="lc-display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold text-white">
                                {user.leetcodeUsername}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      {!editingLC && (
                        <button onClick={() => { setEditingLC(true); setLcInput(user.leetcodeUsername || ''); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {lcEditError && <p className="text-xs text-red-400 mb-3">{lcEditError}</p>}

                    {/* Main stats area */}
                    <div className="flex items-center gap-6 mb-4">
                      {/* Large solved number */}
                      <div>
                        <p className="text-4xl font-black text-white tabular-nums">{lcTotal}</p>
                        <p className="text-xs text-[#84cc16] font-medium">
                          ✓ Solved <span className="text-white/30">/ {lcTotalAvailable}</span>
                        </p>
                      </div>
                      {/* Difficulty pills */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#84cc16] bg-[#84cc16]/10 px-2 py-0.5 rounded">Easy</span>
                          <span className="text-sm font-bold text-white">{lcEasy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Med.</span>
                          <span className="text-sm font-bold text-white">{lcMedium}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">Hard</span>
                          <span className="text-sm font-bold text-white">{lcHard}</span>
                        </div>
                      </div>
                    </div>

                    {/* Streak */}
                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                      <Flame className="w-4 h-4 text-[#f97316]" />
                      <span className="text-sm font-bold text-[#f97316]">{streak}</span>
                      <span className="text-[10px] text-white/30">day streak</span>
                    </div>
                  </>
                ) : (
                  /* Link LeetCode form */
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-5 h-5 text-[#f97316]" />
                      <p className="text-sm font-bold text-white">Link LeetCode</p>
                    </div>
                    <p className="text-xs text-white/50 mb-4">Connect your LeetCode account to track progress.</p>
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
                        className="bg-[#f97316] hover:bg-[#f97316]/90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {linkingLeetcode ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Connect'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

          </motion.div>

          {/* Quick Stats Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#151515] rounded-2xl border border-white/5 p-4 hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] font-bold text-white/40 tracking-wide uppercase">XP Score</p>
              </div>
              <p className="text-2xl font-black text-amber-400 tracking-tight tabular-nums">{activityScore}</p>
            </div>
            <div className="bg-[#151515] rounded-2xl border border-white/5 p-4 hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-[#f97316]" />
                <p className="text-[10px] font-bold text-white/40 tracking-wide uppercase">Streak</p>
              </div>
              <p className="text-2xl font-black text-[#f97316] tracking-tight tabular-nums">
                {streak}<span className="text-sm font-semibold text-white/30 ml-1">days</span>
              </p>
            </div>
            <div className="bg-[#151515] rounded-2xl border border-white/5 p-4 hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-cyan-400" />
                <p className="text-[10px] font-bold text-white/40 tracking-wide uppercase">CF Rating</p>
              </div>
              <p className="text-2xl font-black text-cyan-400 tracking-tight tabular-nums">
                {cfRating != null ? cfRating : '—'}
              </p>
            </div>
            <div className="bg-[#151515] rounded-2xl border border-white/5 p-4 hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#84cc16]" />
                <p className="text-[10px] font-bold text-white/40 tracking-wide uppercase">LC Solved</p>
              </div>
              <p className="text-2xl font-black text-[#84cc16] tracking-tight tabular-nums">{lcTotal}</p>
            </div>
          </motion.div>

          {/* Recent Submissions */}
          <motion.div variants={itemVariants}>
            <div className="bg-[#151515] rounded-2xl border border-white/5 p-5">
              <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase mb-4">Recent Submissions</p>
              {recentSubmissions.length > 0 ? (
                <div className="space-y-2">
                  {recentSubmissions.slice(0, 8).map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${getDifficultyDot(sub.difficulty)}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{sub.title || sub.problemTitle || sub.name}</p>
                          <p className="text-[10px] text-white/30">
                            {sub.language || ''}
                            {(sub.date || sub.submissionDate) && ` · ${new Date(sub.date || sub.submissionDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold tracking-wide uppercase shrink-0 ${getDifficultyText(sub.difficulty)}`}>
                        {sub.difficulty || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <Clock className="w-6 h-6 text-white/20 mb-2" />
                  <p className="text-sm text-white/30">
                    {user?.leetcodeUsername ? 'No recent submissions found.' : 'Link your LeetCode account to see submissions.'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

export default Boilerplate(DashboardPage);
