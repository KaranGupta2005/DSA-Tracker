import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Trophy,
  Flame,
  Code2,
  TrendingUp,
  Zap,
  RefreshCw,
  User,
  Activity,
} from 'lucide-react';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

/** Map CF rank to tailwind-friendly color */
function getRankColor(rank) {
  if (!rank) return '#808080';
  const r = rank.toLowerCase();
  if (r.includes('grandmaster')) return '#ef4444';
  if (r.includes('master') && !r.includes('candidate')) return '#f97316';
  if (r.includes('candidate master')) return '#a855f7';
  if (r.includes('expert')) return '#3b82f6';
  if (r.includes('specialist')) return '#14b8a6';
  if (r.includes('pupil')) return '#22c55e';
  return '#808080'; // newbie / unrated
}

/** Difficulty colors */
function getDifficultyClasses(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'hard':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return 'bg-white/10 text-white/60 border-white/10';
  }
}

function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Codeforces state
  const [cfProfile, setCfProfile] = useState(null);
  const [cfContests, setCfContests] = useState([]);
  const [loadingCF, setLoadingCF] = useState(false);

  // LeetCode state
  const [lcData, setLcData] = useState(null);
  const [lcSubmissions, setLcSubmissions] = useState([]);
  const [lcCalendar, setLcCalendar] = useState({});
  const [loadingLC, setLoadingLC] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // LeetCode linking state
  const [leetcodeInput, setLeetcodeInput] = useState('');
  const [linkingLeetcode, setLinkingLeetcode] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfileData = async () => {
    await Promise.all([fetchCodeforcesData(), fetchLeetCodeData()]);
  };

  const fetchCodeforcesData = async () => {
    if (!user?.codeforcesHandle) return;
    setLoadingCF(true);
    try {
      const [profileRes, contestsRes] = await Promise.all([
        api.get(`/codeforces/profile/${user.codeforcesHandle}`).catch(() => null),
        api.get(`/codeforces/contests/${user.codeforcesHandle}`).catch(() => null),
      ]);
      if (profileRes?.data) setCfProfile(profileRes.data);
      if (contestsRes?.data) {
        const contests = Array.isArray(contestsRes.data)
          ? contestsRes.data
          : contestsRes.data.contests || [];
        setCfContests(contests.slice(0, 5));
      }
    } catch {
      // handled gracefully
    } finally {
      setLoadingCF(false);
    }
  };

  const fetchLeetCodeData = async () => {
    if (!user?.leetcodeUsername) return;
    setLoadingLC(true);
    try {
      const [statsRes, subsRes, syncRes] = await Promise.all([
        api.get(`/leetcode/stats/${user.leetcodeUsername}`).catch(() => null),
        api.get(`/leetcode/submissions/${user.leetcodeUsername}`).catch(() => null),
        api.get(`/leetcode/sync/${user.leetcodeUsername}`).catch(() => null),
      ]);
      if (statsRes?.data) {
        const raw = statsRes.data.data || statsRes.data;
        setLcData({
          easy: raw.stats?.easy ?? raw.easy ?? 0,
          medium: raw.stats?.medium ?? raw.medium ?? 0,
          hard: raw.stats?.hard ?? raw.hard ?? 0,
          tags: raw.tags || {},
          currentStreak: raw.streak ?? raw.currentStreak ?? 0,
        });
      }
      if (subsRes?.data) {
        const subs = Array.isArray(subsRes.data)
          ? subsRes.data
          : subsRes.data.submissions || subsRes.data.recentSubmissions || [];
        setLcSubmissions(subs.slice(0, 15));
      }
      // Get calendar from sync response
      if (syncRes?.data) {
        const raw = syncRes.data.data || syncRes.data;
        if (raw.submissionCalendar) {
          setLcCalendar(raw.submissionCalendar);
        }
      }
    } catch {
      // handled gracefully
    } finally {
      setLoadingLC(false);
    }
  };

  const handleSyncLeetCode = async () => {
    if (!user?.leetcodeUsername) return;
    setSyncing(true);
    try {
      const res = await api.get(`/leetcode/sync/${user.leetcodeUsername}`);
      if (res?.data) {
        const raw = res.data.data || res.data;
        setLcData({
          easy: raw.stats?.easy ?? raw.easy ?? 0,
          medium: raw.stats?.medium ?? raw.medium ?? 0,
          hard: raw.stats?.hard ?? raw.hard ?? 0,
          tags: raw.tags || {},
          currentStreak: raw.streak ?? raw.currentStreak ?? 0,
        });
        const subs = raw.recentSubmissions || [];
        setLcSubmissions(subs.slice(0, 15));
      }
    } catch {
      // sync failed silently
    } finally {
      setSyncing(false);
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
    try {
      await api.patch('/auth/profile/leetcode', {
        leetcodeUsername: leetcodeInput.trim(),
      });
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

  // Loading skeleton
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#09090b] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-48 bg-white/5 rounded-3xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-60 bg-white/5 rounded-2xl animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cfRating = cfProfile?.rating ?? null;
  const cfRank = cfProfile?.rank ?? 'Unrated';
  const cfAvatar = cfProfile?.avatar ?? null;
  const rankColor = getRankColor(cfRank);

  const lcEasy = lcData?.easy ?? 0;
  const lcMedium = lcData?.medium ?? 0;
  const lcHard = lcData?.hard ?? 0;
  const lcTotal = lcEasy + lcMedium + lcHard;
  const lcTags = lcData?.tags || {};
  const currentStreak = lcData?.currentStreak ?? 0;

  return (
    <div className="min-h-screen bg-[#09090b] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ===== PROFILE BANNER ===== */}
        <div className="relative">
          <div
            className="h-48 rounded-3xl"
            style={{
              background: `linear-gradient(135deg, ${rankColor}33 0%, ${rankColor}11 50%, transparent 100%)`,
              border: `1px solid ${rankColor}22`,
            }}
          >
            {/* Rank badge top-right */}
            <div className="absolute top-4 right-5 flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border"
                style={{
                  color: rankColor,
                  backgroundColor: `${rankColor}15`,
                  borderColor: `${rankColor}30`,
                }}
              >
                {cfRank}
              </span>
              {cfRating != null && (
                <span
                  className="text-2xl font-black"
                  style={{ color: rankColor }}
                >
                  {cfRating}
                </span>
              )}
            </div>
          </div>

          {/* Avatar overlapping banner */}
          <div className="absolute -bottom-10 left-6 flex items-end gap-4">
            {cfAvatar ? (
              <img
                src={cfAvatar}
                alt={user?.codeforcesHandle || 'Avatar'}
                className="w-20 h-20 rounded-2xl border-4 border-[#09090b] object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-[#09090b] bg-[#151515] flex items-center justify-center">
                <User className="w-8 h-8 text-white/40" />
              </div>
            )}
            <div className="mb-1">
              <h1 className="text-xl font-bold text-white">
                {user?.codeforcesHandle || user?.name || 'User'}
              </h1>
              {user?.leetcodeUsername && (
                <p className="text-xs text-white/40">LC: {user.leetcodeUsername}</p>
              )}
            </div>
          </div>
        </div>

        {/* Spacer for avatar overlap */}
        <div className="h-6" />

        {/* ===== GRAPHS SECTION ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* CF Rating Graph */}
          {cfContests.length > 0 && (
            <div className="bg-[#151515] rounded-2xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase">CF Rating History</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{cfRank}</span>
                  <span className="text-sm font-bold text-cyan-400">{cfRating || '—'}</span>
                </div>
              </div>
              <div className="flex items-end gap-[3px] h-28">
                {cfContests.map((contest, i) => {
                  const ratings = cfContests.map(c => c.newRating || 0);
                  const min = Math.min(...ratings) - 50;
                  const max = Math.max(...ratings) + 50;
                  const height = max > min ? ((contest.newRating - min) / (max - min)) * 100 : 50;
                  const change = contest.newRating - contest.oldRating;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all hover:opacity-80 cursor-pointer"
                      style={{
                        height: `${Math.max(8, height)}%`,
                        backgroundColor: change >= 0 ? '#84cc16' : '#ef4444',
                        opacity: 0.4 + (i / cfContests.length) * 0.6,
                      }}
                      title={`${contest.contestName || 'Contest'}: ${contest.newRating} (${change >= 0 ? '+' : ''}${change})`}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-white/30 mt-2">{cfContests.length} contests</p>
            </div>
          )}

          {/* LC Submission Heatmap */}
          {user?.leetcodeUsername && Object.keys(lcCalendar).length > 0 && (
            <div className="bg-[#151515] rounded-2xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase">
                  LC Submissions
                </p>
                <p className="text-xs text-white/50">
                  {Object.values(lcCalendar).reduce((s, v) => s + v, 0)} in past year
                </p>
              </div>
              <div className="grid grid-rows-7 grid-flow-col gap-[2px] overflow-x-auto pb-1">
                {(() => {
                  const today = new Date();
                  const cells = [];
                  for (let i = 364; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const ts = Math.floor(date.setHours(0, 0, 0, 0) / 1000).toString();
                    const count = lcCalendar[ts] || 0;
                    const intensity = count === 0 ? 'bg-white/[0.04]' :
                      count <= 2 ? 'bg-[#0e4429]' :
                      count <= 5 ? 'bg-[#006d32]' :
                      count <= 8 ? 'bg-[#26a641]' : 'bg-[#39d353]';
                    cells.push(
                      <div
                        key={i}
                        className={`w-[10px] h-[10px] rounded-[2px] ${intensity}`}
                        title={`${date.toLocaleDateString()}: ${count} submissions`}
                      />
                    );
                  }
                  return cells;
                })()}
              </div>
              <div className="flex items-center gap-2 mt-2 justify-end">
                <span className="text-[9px] text-white/30">Less</span>
                <div className="w-[8px] h-[8px] rounded-[2px] bg-white/[0.04]" />
                <div className="w-[8px] h-[8px] rounded-[2px] bg-[#0e4429]" />
                <div className="w-[8px] h-[8px] rounded-[2px] bg-[#006d32]" />
                <div className="w-[8px] h-[8px] rounded-[2px] bg-[#26a641]" />
                <div className="w-[8px] h-[8px] rounded-[2px] bg-[#39d353]" />
                <span className="text-[9px] text-white/30">More</span>
              </div>
            </div>
          )}
        </div>

        {/* ===== 2-COLUMN LAYOUT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* CF Contest History */}
            <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
              <h2 className="text-[11px] font-bold text-white/40 tracking-wider uppercase mb-4">
                Codeforces Contest History
              </h2>

              {loadingCF ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : cfContests.length > 0 ? (
                <div className="space-y-2">
                  {cfContests.map((contest, idx) => {
                    const ratingChange = contest.newRating - contest.oldRating;
                    const isPositive = ratingChange >= 0;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm text-white font-medium truncate">
                            {contest.contestName || `Contest #${contest.contestId}`}
                          </p>
                          <p className="text-xs text-white/40">
                            Rank #{contest.rank}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className="text-xs text-white/40">
                            {contest.oldRating} → {contest.newRating}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              isPositive ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {ratingChange}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/30 text-center py-4">
                  {user?.codeforcesHandle
                    ? 'No contest history found.'
                    : 'No Codeforces handle linked.'}
                </p>
              )}
            </div>

            {/* LC Difficulty Breakdown */}
            <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-bold text-white/40 tracking-wider uppercase">
                  LeetCode Breakdown
                </h2>
                {user?.leetcodeUsername && (
                  <button
                    onClick={handleSyncLeetCode}
                    disabled={syncing}
                    className="bg-[#84cc16] text-black text-[10px] font-black uppercase rounded-full px-5 py-2 flex items-center gap-1.5 hover:bg-[#a3e635] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing' : 'Sync'}
                  </button>
                )}
              </div>

              {!user?.leetcodeUsername ? (
                <LinkLeetCodeWidget
                  leetcodeInput={leetcodeInput}
                  setLeetcodeInput={setLeetcodeInput}
                  handleLinkLeetcode={handleLinkLeetcode}
                  linkingLeetcode={linkingLeetcode}
                  linkError={linkError}
                />
              ) : loadingLC ? (
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Difficulty bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <DifficultyCard label="Easy" count={lcEasy} color="#22c55e" total={lcTotal} />
                    <DifficultyCard label="Medium" count={lcMedium} color="#f59e0b" total={lcTotal} />
                    <DifficultyCard label="Hard" count={lcHard} color="#ef4444" total={lcTotal} />
                  </div>

                  {/* Total progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white/40">Total Solved</span>
                      <span className="text-xs font-bold text-white">{lcTotal}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, (lcTotal / 3000) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LC Tag Distribution */}
            {user?.leetcodeUsername && Object.keys(lcTags).length > 0 && (
              <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
                <h2 className="text-[11px] font-bold text-white/40 tracking-wider uppercase mb-4">
                  Tag Distribution
                </h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(lcTags)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tag, count]) => {
                      const hue = (tag.charCodeAt(0) * 37 + tag.length * 53) % 360;
                      const color = `hsl(${hue}, 70%, 65%)`;
                      return (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-lg text-xs border"
                          style={{
                            color,
                            backgroundColor: `hsl(${hue}, 70%, 65%, 0.1)`,
                            borderColor: `hsl(${hue}, 70%, 65%, 0.2)`,
                          }}
                        >
                          {tag} ({count})
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (1/3 width) */}
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Rating"
                value={cfRating ?? '—'}
                icon={<Trophy className="w-4 h-4" />}
                color="#fbbf24"
              />
              <StatCard
                label="Problems"
                value={lcTotal}
                icon={<Code2 className="w-4 h-4" />}
                color="#22c55e"
              />
              <StatCard
                label="Streak"
                value={currentStreak}
                icon={<Flame className="w-4 h-4" />}
                color="#f97316"
              />
              <StatCard
                label="Score"
                value={lcEasy + lcMedium * 2 + lcHard * 3}
                icon={<Zap className="w-4 h-4" />}
                color="#a855f7"
              />
            </div>

            {/* Recent Submissions */}
            <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
              <h2 className="text-[11px] font-bold text-white/40 tracking-wider uppercase mb-4">
                Recent Submissions
              </h2>

              {loadingLC ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : lcSubmissions.length > 0 ? (
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {lcSubmissions.map((sub, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm text-white font-medium truncate">
                          {sub.title || sub.problemTitle || sub.name}
                        </p>
                        <p className="text-[11px] text-white/40">
                          {sub.language || ''}{' '}
                          {(sub.date || sub.submissionDate || sub.timestamp) &&
                            `• ${new Date(
                              sub.date || sub.submissionDate || sub.timestamp
                            ).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getDifficultyClasses(
                          sub.difficulty
                        )}`}
                      >
                        {sub.difficulty || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/30 text-center py-4">
                  No submissions yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Stat card for sidebar grid */
function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-[#151515] rounded-2xl p-4 border border-white/5">
      <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
        {icon}
      </div>
      <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase">
        {label}
      </p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

/** Difficulty breakdown card */
function DifficultyCard({ label, count, color, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
      <p className="text-xs font-semibold mb-1" style={{ color }}>
        {label}
      </p>
      <p className="text-xl font-bold text-white">{count}</p>
      <div className="h-2 bg-white/5 rounded-full mt-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[10px] text-white/30 mt-1">{pct}%</p>
    </div>
  );
}

/** Link LeetCode widget (orange accent NxtDevs style) */
function LinkLeetCodeWidget({
  leetcodeInput,
  setLeetcodeInput,
  handleLinkLeetcode,
  linkingLeetcode,
  linkError,
}) {
  return (
    <div className="bg-[#1a1200] rounded-xl p-4 border border-orange-500/20">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-semibold text-orange-300">
          Link LeetCode Account
        </span>
      </div>
      <p className="text-xs text-white/50 mb-3">
        Connect your LeetCode to see stats, tags, and submissions.
      </p>

      {linkError && (
        <p className="text-xs text-red-400 mb-2">{linkError}</p>
      )}

      <form onSubmit={handleLinkLeetcode} className="flex gap-2">
        <input
          type="text"
          value={leetcodeInput}
          onChange={(e) => setLeetcodeInput(e.target.value)}
          placeholder="LeetCode username"
          disabled={linkingLeetcode}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={linkingLeetcode}
          className="bg-orange-500 text-black text-xs font-bold uppercase rounded-lg px-4 py-2 hover:bg-orange-400 transition-colors disabled:opacity-50"
        >
          {linkingLeetcode ? '...' : 'Connect'}
        </button>
      </form>
    </div>
  );
}

export default Boilerplate(ProfilePage);
