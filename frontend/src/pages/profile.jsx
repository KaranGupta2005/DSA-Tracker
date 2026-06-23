import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  LocalFireDepartment as FireIcon,
  Code as CodeIcon,
  Sync as SyncIcon,
  Link as LinkIcon,
  Timeline as TimelineIcon,
  Category as CategoryIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/** Map CF rank to badge color */
function getRankColor(rank) {
  if (!rank) return '#808080';
  const r = rank.toLowerCase();
  if (r.includes('legendary grandmaster')) return '#ff0000';
  if (r.includes('international grandmaster')) return '#ff0000';
  if (r.includes('grandmaster')) return '#ff0000';
  if (r.includes('international master')) return '#ff8c00';
  if (r.includes('master')) return '#ff8c00';
  if (r.includes('candidate master')) return '#aa00aa';
  if (r.includes('expert')) return '#0000ff';
  if (r.includes('specialist')) return '#03a89e';
  if (r.includes('pupil')) return '#008000';
  if (r.includes('newbie')) return '#808080';
  return '#808080';
}

/** Get difficulty chip color */
function getDifficultyColor(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'rgba(34, 197, 94, 0.3)';
    case 'medium':
      return 'rgba(245, 158, 11, 0.3)';
    case 'hard':
      return 'rgba(239, 68, 68, 0.3)';
    default:
      return 'rgba(255, 255, 255, 0.1)';
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
  const [loadingLC, setLoadingLC] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // LeetCode linking state
  const [leetcodeInput, setLeetcodeInput] = useState('');
  const [linkingLeetcode, setLinkingLeetcode] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  // General
  const [error, setError] = useState('');

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
    setError('');
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
      // Error handled gracefully
    } finally {
      setLoadingCF(false);
    }
  };

  const fetchLeetCodeData = async () => {
    if (!user?.leetcodeUsername) return;
    setLoadingLC(true);
    try {
      const [statsRes, subsRes] = await Promise.all([
        api.get(`/leetcode/stats/${user.leetcodeUsername}`).catch(() => null),
        api.get(`/leetcode/submissions/${user.leetcodeUsername}`).catch(() => null),
      ]);
      if (statsRes?.data) setLcData(statsRes.data);
      if (subsRes?.data) {
        const subs = Array.isArray(subsRes.data)
          ? subsRes.data
          : subsRes.data.submissions || subsRes.data.recentSubmissions || [];
        setLcSubmissions(subs.slice(0, 15));
      }
    } catch {
      // Error handled gracefully
    } finally {
      setLoadingLC(false);
    }
  };

  const handleSyncLeetCode = async () => {
    if (!user?.leetcodeUsername) return;
    setSyncing(true);
    setError('');
    try {
      const res = await api.get(`/leetcode/sync/${user.leetcodeUsername}`);
      if (res?.data) {
        setLcData(res.data);
        const subs = res.data.recentSubmissions || [];
        setLcSubmissions(subs.slice(0, 15));
      }
    } catch {
      setError('Failed to sync LeetCode data. Please try again.');
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
    setLinkSuccess('');

    try {
      await api.patch('/auth/profile/leetcode', {
        leetcodeUsername: leetcodeInput.trim(),
      });
      setLinkSuccess('LeetCode account linked successfully!');
      setLeetcodeInput('');
      // Update local user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.leetcodeUsername = leetcodeInput.trim();
      localStorage.setItem('user', JSON.stringify(storedUser));
      // Reload to reflect changes
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

  // Loading state
  if (authLoading || (!user && !error)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <CircularProgress sx={{ color: '#1976d2' }} />
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}
          >
            Profile
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Your competitive programming stats
          </Typography>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants} className="mb-6">
            <Alert severity="error">{error}</Alert>
          </motion.div>
        )}

        {/* ===== CODEFORCES SECTION ===== */}
        <motion.div variants={itemVariants} className="mb-8">
          <Box
            sx={{
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              p: 3,
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrophyIcon sx={{ color: '#fbbf24' }} />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                Codeforces
              </Typography>
            </div>

            {loadingCF ? (
              <div className="flex justify-center py-6">
                <CircularProgress size={28} sx={{ color: '#fbbf24' }} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CF Profile Card */}
                <div className="flex items-center gap-4">
                  {cfAvatar && (
                    <Avatar
                      src={cfAvatar}
                      sx={{ width: 64, height: 64, border: `2px solid ${rankColor}` }}
                      alt={user?.codeforcesHandle}
                    />
                  )}
                  <div>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                      {user?.codeforcesHandle}
                    </Typography>
                    <div className="flex items-center gap-2 mt-1">
                      <Chip
                        label={cfRank}
                        size="small"
                        sx={{
                          backgroundColor: `${rankColor}22`,
                          color: rankColor,
                          fontWeight: 700,
                          border: `1px solid ${rankColor}44`,
                        }}
                      />
                      {cfRating != null && (
                        <Typography
                          variant="body2"
                          sx={{ color: rankColor, fontWeight: 700 }}
                        >
                          {cfRating}
                        </Typography>
                      )}
                    </div>
                  </div>
                </div>

                {/* CF Rating Visual */}
                <div>
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, fontWeight: 500 }}
                  >
                    Rating
                  </Typography>
                  <Box
                    sx={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 2,
                      p: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="h3"
                      sx={{ color: rankColor, fontWeight: 800 }}
                    >
                      {cfRating != null ? cfRating : 'N/A'}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {cfRating != null ? 'Current Rating' : 'Unrated'}
                    </Typography>
                  </Box>
                </div>
              </div>
            )}

            {/* CF Contest History */}
            {cfContests.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <TimelineIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 20 }} />
                  <Typography
                    variant="subtitle2"
                    sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
                  >
                    Recent Contests
                  </Typography>
                </div>
                <div className="space-y-2">
                  {cfContests.map((contest, idx) => {
                    const ratingChange = contest.newRating - contest.oldRating;
                    const isPositive = ratingChange >= 0;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between py-2 px-3 rounded-lg"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#fff',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {contest.contestName || contest.name || `Contest #${contest.contestId}`}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            Rank: #{contest.rank}
                          </Typography>
                        </div>
                        <div className="text-right">
                          <Typography
                            variant="body2"
                            sx={{
                              color: isPositive ? '#22c55e' : '#ef4444',
                              fontWeight: 700,
                            }}
                          >
                            {isPositive ? '+' : ''}{ratingChange}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            {contest.newRating}
                          </Typography>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </Box>
        </motion.div>

        {/* ===== LEETCODE SECTION ===== */}
        <motion.div variants={itemVariants} className="mb-8">
          <Box
            sx={{
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              p: 3,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CodeIcon sx={{ color: '#22c55e' }} />
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                  LeetCode
                </Typography>
                {currentStreak > 0 && (
                  <Chip
                    icon={<FireIcon sx={{ color: '#f97316', fontSize: 16 }} />}
                    label={`${currentStreak} day streak`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(249, 115, 22, 0.15)',
                      color: '#f97316',
                      fontWeight: 600,
                      ml: 1,
                    }}
                  />
                )}
              </div>

              {/* Sync Button */}
              {user?.leetcodeUsername && (
                <motion.button
                  onClick={handleSyncLeetCode}
                  disabled={syncing}
                  whileHover={{ scale: syncing ? 1 : 1.05 }}
                  whileTap={{ scale: syncing ? 1 : 0.95 }}
                  className="flex items-center gap-1 py-1.5 px-3 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    border: 'none',
                    cursor: syncing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {syncing ? (
                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                  ) : (
                    <SyncIcon sx={{ fontSize: 16 }} />
                  )}
                  {syncing ? 'Syncing...' : 'Sync LeetCode'}
                </motion.button>
              )}
            </div>

            {/* Link LeetCode Form (if not linked) */}
            {!user?.leetcodeUsername && (
              <Box
                sx={{
                  background:
                    'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: 2,
                  p: 3,
                  mb: 2,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon sx={{ color: '#22c55e' }} />
                  <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
                    Link Your LeetCode Account
                  </Typography>
                </div>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}
                >
                  Connect your LeetCode account to see difficulty breakdown, tag
                  distribution, and recent submissions.
                </Typography>

                {linkError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {linkError}
                  </Alert>
                )}
                {linkSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {linkSuccess}
                  </Alert>
                )}

                <Box
                  component="form"
                  onSubmit={handleLinkLeetcode}
                  className="flex gap-2 items-start"
                >
                  <TextField
                    size="small"
                    placeholder="LeetCode username"
                    value={leetcodeInput}
                    onChange={(e) => setLeetcodeInput(e.target.value)}
                    disabled={linkingLeetcode}
                    sx={{ flex: 1 }}
                    slotProps={{
                      input: { sx: { color: '#fff' } },
                      inputLabel: { sx: { color: 'rgba(255,255,255,0.6)' } },
                    }}
                  />
                  <motion.button
                    type="submit"
                    disabled={linkingLeetcode}
                    whileHover={{ scale: linkingLeetcode ? 1 : 1.02 }}
                    whileTap={{ scale: linkingLeetcode ? 1 : 0.98 }}
                    className="py-2 px-4 rounded-lg font-semibold text-white text-sm transition-all disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: 'none',
                      cursor: linkingLeetcode ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {linkingLeetcode ? (
                      <CircularProgress size={18} sx={{ color: '#fff' }} />
                    ) : (
                      'Link'
                    )}
                  </motion.button>
                </Box>
              </Box>
            )}

            {/* LC Content (when linked) */}
            {user?.leetcodeUsername && (
              <>
                {loadingLC ? (
                  <div className="flex justify-center py-6">
                    <CircularProgress size={28} sx={{ color: '#22c55e' }} />
                  </div>
                ) : (
                  <>
                    {/* Difficulty Breakdown */}
                    <div className="mb-6">
                      <Typography
                        variant="subtitle2"
                        sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, mb: 2 }}
                      >
                        Difficulty Breakdown
                      </Typography>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <DifficultyCard
                          label="Easy"
                          count={lcEasy}
                          color="#22c55e"
                          total={lcTotal}
                        />
                        <DifficultyCard
                          label="Medium"
                          count={lcMedium}
                          color="#f59e0b"
                          total={lcTotal}
                        />
                        <DifficultyCard
                          label="Hard"
                          count={lcHard}
                          color="#ef4444"
                          total={lcTotal}
                        />
                      </div>
                    </div>

                    {/* Tag Distribution */}
                    {Object.keys(lcTags).length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <CategoryIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 20 }} />
                          <Typography
                            variant="subtitle2"
                            sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
                          >
                            Tag Distribution
                          </Typography>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(lcTags)
                            .sort(([, a], [, b]) => b - a)
                            .map(([tag, count]) => (
                              <Tooltip key={tag} title={`${count} problems`} arrow>
                                <Chip
                                  label={`${tag} (${count})`}
                                  size="small"
                                  sx={{
                                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                    color: '#a5b4fc',
                                    fontWeight: 500,
                                    fontSize: '0.75rem',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                  }}
                                />
                              </Tooltip>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Submissions */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <HistoryIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 20 }} />
                        <Typography
                          variant="subtitle2"
                          sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
                        >
                          Recent Submissions ({lcSubmissions.length})
                        </Typography>
                      </div>

                      {lcSubmissions.length > 0 ? (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                          {lcSubmissions.map((sub, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="flex items-center justify-between py-2 px-3 rounded-lg"
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              <div className="flex-1 min-w-0 mr-3">
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: '#fff',
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {sub.title || sub.problemTitle || sub.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'rgba(255,255,255,0.4)' }}
                                >
                                  {sub.language || ''}{' '}
                                  {sub.date || sub.submissionDate || sub.timestamp
                                    ? `• ${new Date(
                                        sub.date || sub.submissionDate || sub.timestamp
                                      ).toLocaleDateString()}`
                                    : ''}
                                </Typography>
                              </div>
                              <Chip
                                label={sub.difficulty || 'N/A'}
                                size="small"
                                sx={{
                                  backgroundColor: getDifficultyColor(sub.difficulty),
                                  color: '#fff',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                }}
                              />
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'rgba(255,255,255,0.5)',
                            textAlign: 'center',
                            py: 3,
                          }}
                        >
                          No recent submissions found. Try syncing your profile.
                        </Typography>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </Box>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Difficulty card with count and progress bar */
function DifficultyCard({ label, count, color, total }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Box
      sx={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2,
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: color,
        },
      }}
    >
      <Typography variant="body2" sx={{ color, fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
        {count}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 5,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
            borderRadius: 3,
          },
        }}
      />
      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5, display: 'block' }}
      >
        {percentage}% of total
      </Typography>
    </Box>
  );
}

export default Boilerplate(ProfilePage);
