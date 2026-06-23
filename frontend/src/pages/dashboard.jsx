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
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  LocalFireDepartment as FireIcon,
  Code as CodeIcon,
  TrendingUp as TrendingUpIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

// Animation variants for staggered entrance
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

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

      // Fetch Codeforces profile
      if (user.codeforcesHandle) {
        requests.push(
          api.get(`/codeforces/profile/${user.codeforcesHandle}`).catch(() => null)
        );
      } else {
        requests.push(Promise.resolve(null));
      }

      // Fetch LeetCode stats if linked
      if (user.leetcodeUsername) {
        requests.push(
          api.get(`/leetcode/sync/${user.leetcodeUsername}`).catch(() => null)
        );
      } else {
        requests.push(Promise.resolve(null));
      }

      // Fetch leaderboard for activity score
      requests.push(api.get('/leaderboard').catch(() => null));

      const [cfRes, lcRes, lbRes] = await Promise.all(requests);

      if (cfRes?.data) setCfProfile(cfRes.data);
      if (lcRes?.data) setLcStats(lcRes.data);

      // Find current user's entry in leaderboard
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
    } catch (err) {
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
      // Update local user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.leetcodeUsername = leetcodeInput.trim();
      localStorage.setItem('user', JSON.stringify(storedUser));
      // Reload dashboard data
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

  const cfRating = cfProfile?.rating ?? user?.codeforcesRating ?? null;
  const cfRank = cfProfile?.rank ?? user?.codeforcesRank ?? 'Unrated';
  const cfAvatar = cfProfile?.avatar ?? user?.avatar ?? null;
  const streak = lcStats?.currentStreak ?? user?.currentStreak ?? 0;
  const activityScore =
    leaderboardData?.activityScore ?? user?.activityScore ?? 0;

  const lcEasy = lcStats?.easy ?? user?.leetcodeStats?.easy ?? 0;
  const lcMedium = lcStats?.medium ?? user?.leetcodeStats?.medium ?? 0;
  const lcHard = lcStats?.hard ?? user?.leetcodeStats?.hard ?? 0;
  const lcTotal = lcEasy + lcMedium + lcHard;

  const recentSubmissions = lcStats?.recentSubmissions || [];

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
            Dashboard
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.6)' }}
          >
            Welcome back, {user?.codeforcesHandle || 'Member'}
          </Typography>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants} className="mb-6">
            <Alert severity="error">{error}</Alert>
          </motion.div>
        )}

        {loadingData ? (
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center py-20"
          >
            <CircularProgress sx={{ color: '#1976d2' }} />
          </motion.div>
        ) : (
          <>
            {/* Stats Overview Cards */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            >
              {/* Codeforces Card */}
              <StatCard
                icon={<TrophyIcon sx={{ color: '#fbbf24' }} />}
                label="CF Rating"
                value={cfRating != null ? cfRating : 'Unrated'}
                subtitle={cfRank}
                avatar={cfAvatar}
                color="#fbbf24"
              />

              {/* LeetCode Total Card */}
              <StatCard
                icon={<CodeIcon sx={{ color: '#22c55e' }} />}
                label="LC Solved"
                value={lcTotal}
                subtitle={`E:${lcEasy} M:${lcMedium} H:${lcHard}`}
                color="#22c55e"
              />

              {/* Streak Card */}
              <StatCard
                icon={<FireIcon sx={{ color: '#f97316' }} />}
                label="Current Streak"
                value={`${streak} days`}
                subtitle="Keep it going!"
                color="#f97316"
              />

              {/* Activity Score Card */}
              <StatCard
                icon={<TrendingUpIcon sx={{ color: '#8b5cf6' }} />}
                label="Activity Score"
                value={activityScore}
                subtitle="Points earned"
                color="#8b5cf6"
              />
            </motion.div>

            {/* LeetCode Difficulty Breakdown */}
            {user?.leetcodeUsername && (
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
                  <Typography
                    variant="h6"
                    sx={{ color: '#fff', fontWeight: 600, mb: 2 }}
                  >
                    LeetCode Progress
                  </Typography>
                  <div className="grid grid-cols-3 gap-4">
                    <DifficultyBar
                      label="Easy"
                      count={lcEasy}
                      total={lcTotal || 1}
                      color="#22c55e"
                    />
                    <DifficultyBar
                      label="Medium"
                      count={lcMedium}
                      total={lcTotal || 1}
                      color="#f59e0b"
                    />
                    <DifficultyBar
                      label="Hard"
                      count={lcHard}
                      total={lcTotal || 1}
                      color="#ef4444"
                    />
                  </div>
                </Box>
              </motion.div>
            )}

            {/* LeetCode Link Prompt */}
            {!user?.leetcodeUsername && (
              <motion.div variants={itemVariants} className="mb-8">
                <Box
                  sx={{
                    background:
                      'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)',
                    border: '1px solid rgba(25, 118, 210, 0.3)',
                    borderRadius: 3,
                    p: 3,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon sx={{ color: '#1976d2' }} />
                    <Typography
                      variant="h6"
                      sx={{ color: '#fff', fontWeight: 600 }}
                    >
                      Link Your LeetCode Account
                    </Typography>
                  </div>
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}
                  >
                    Connect your LeetCode account to track your progress across
                    both platforms and boost your activity score.
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
                        background:
                          'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
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
              </motion.div>
            )}

            {/* Recent Submissions */}
            <motion.div variants={itemVariants}>
              <Box
                sx={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 3,
                  p: 3,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ color: '#fff', fontWeight: 600, mb: 2 }}
                >
                  Recent Submissions
                </Typography>

                {recentSubmissions.length > 0 ? (
                  <div className="space-y-2">
                    {recentSubmissions.slice(0, 5).map((sub, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded-lg"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <div>
                          <Typography
                            variant="body2"
                            sx={{ color: '#fff', fontWeight: 500 }}
                          >
                            {sub.title || sub.problemTitle || sub.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: 'rgba(255,255,255,0.5)' }}
                          >
                            {sub.language || ''}{' '}
                            {sub.date || sub.submissionDate
                              ? `• ${new Date(
                                  sub.date || sub.submissionDate
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 3 }}
                  >
                    {user?.leetcodeUsername
                      ? 'No recent submissions found.'
                      : 'Link your LeetCode account to see recent submissions.'}
                  </Typography>
                )}
              </Box>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/** Stat card component */
function StatCard({ icon, label, value, subtitle, avatar, color }) {
  return (
    <Box
      sx={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 3,
        p: 2.5,
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
      <div className="flex items-center gap-2 mb-2">
        {avatar ? (
          <Avatar src={avatar} sx={{ width: 32, height: 32 }} alt="CF Avatar" />
        ) : (
          icon
        )}
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}
        >
          {label}
        </Typography>
      </div>
      <Typography
        variant="h5"
        sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}
      >
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
        {subtitle}
      </Typography>
    </Box>
  );
}

/** Difficulty progress bar component */
function DifficultyBar({ label, count, total, color }) {
  const percentage = Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <Typography variant="body2" sx={{ color, fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          {count}
        </Typography>
      </div>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
            borderRadius: 3,
          },
        }}
      />
    </div>
  );
}

/** Get chip background color based on difficulty */
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

export default Boilerplate(DashboardPage);
