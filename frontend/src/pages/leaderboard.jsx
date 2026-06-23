import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  useMediaQuery,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  LocalFireDepartment as StreakIcon,
  Code as CodeIcon,
  TrendingUp as ScoreIcon,
} from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

const PERIODS = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'All-Time', value: 'all-time' },
];

function LeaderboardPage() {
  const { isAuthenticated } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePeriod, setActivePeriod] = useState(2); // default: all-time
  const isMobile = useMediaQuery('(max-width:768px)');

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
    fetchLeaderboard(PERIODS[activePeriod].value);
  }, [activePeriod, fetchLeaderboard]);

  const handlePeriodChange = (event, newValue) => {
    setActivePeriod(newValue);
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return 'rgba(255, 255, 255, 0.7)';
  };

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <Typography
          variant="h3"
          component="h1"
          sx={{ fontWeight: 800, color: '#fff', mb: 1 }}
        >
          <TrophyIcon sx={{ fontSize: 40, color: '#FFD700', mr: 1, verticalAlign: 'middle' }} />
          Leaderboard
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          Compete, climb, and conquer — see how you stack up against fellow members.
        </Typography>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Box
          sx={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 2,
            mb: 4,
            p: 1,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Tabs
            value={activePeriod}
            onChange={handlePeriodChange}
            variant="fullWidth"
            aria-label="Leaderboard time period filter"
            sx={{
              width: '100%',
              maxWidth: 400,
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                minHeight: 44,
              },
              '& .Mui-selected': { color: '#90caf9' },
              '& .MuiTabs-indicator': { backgroundColor: '#1976d2', borderRadius: 2 },
            }}
          >
            {PERIODS.map((p) => (
              <Tab key={p.value} label={p.label} />
            ))}
          </Tabs>
        </Box>
      </motion.div>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#1976d2' }} />
        </Box>
      )}

      {/* Empty State */}
      {!loading && !error && members.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            No leaderboard data available for this period.
          </Typography>
        </motion.div>
      )}

      {/* Leaderboard Table */}
      {!loading && members.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {/* Table Header */}
          {!isMobile && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 120px 100px 120px',
                gap: 2,
                px: 3,
                py: 1.5,
                mb: 1,
              }}
            >
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                Rank
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                Member
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600, textAlign: 'center' }}>
                Problems
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600, textAlign: 'center' }}>
                Streak
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600, textAlign: 'center' }}>
                Score
              </Typography>
            </Box>
          )}

          {/* Rows */}
          <AnimatePresence mode="popLayout">
            {members.map((member, index) => {
              const rank = member.rank || index + 1;
              return (
                <motion.div
                  key={member.codeforcesHandle || member._id || index}
                  layoutId={member.codeforcesHandle || member._id || `member-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  {isMobile ? (
                    /* Mobile Card Layout */
                    <Box
                      sx={{
                        background: rank <= 3
                          ? 'rgba(25, 118, 210, 0.08)'
                          : 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${rank <= 3 ? 'rgba(25, 118, 210, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
                        borderRadius: 2,
                        p: 2,
                        mb: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography
                            variant="h6"
                            sx={{ color: getRankColor(rank), fontWeight: 700, minWidth: 36 }}
                          >
                            {getRankEmoji(rank)}
                          </Typography>
                          <Box>
                            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                              {member.codeforcesHandle}
                            </Typography>
                            {member.leetcodeUsername && (
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                                LC: {member.leetcodeUsername}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 700 }}>
                            <ScoreIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            {member.activityScore ?? 0}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-around' }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <CodeIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
                          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.6)' }}>
                            {member.totalProblems ?? 0} solved
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <StreakIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.6)' }}>
                            {member.currentStreak ?? 0} days
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    /* Desktop Row Layout */
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 120px 100px 120px',
                        gap: 2,
                        alignItems: 'center',
                        px: 3,
                        py: 2,
                        mb: 1,
                        background: rank <= 3
                          ? 'rgba(25, 118, 210, 0.06)'
                          : 'rgba(15, 23, 42, 0.5)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${rank <= 3 ? 'rgba(25, 118, 210, 0.15)' : 'rgba(255, 255, 255, 0.05)'}`,
                        borderRadius: 2,
                        transition: 'background 0.2s ease',
                        '&:hover': {
                          background: 'rgba(25, 118, 210, 0.1)',
                          border: '1px solid rgba(25, 118, 210, 0.25)',
                        },
                      }}
                    >
                      {/* Rank */}
                      <Typography
                        variant="h6"
                        sx={{ color: getRankColor(rank), fontWeight: 700 }}
                      >
                        {getRankEmoji(rank)}
                      </Typography>

                      {/* Handle(s) */}
                      <Box>
                        <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                          {member.codeforcesHandle}
                        </Typography>
                        {member.leetcodeUsername && (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            LC: {member.leetcodeUsername}
                          </Typography>
                        )}
                      </Box>

                      {/* Problems Solved */}
                      <Typography
                        variant="body2"
                        sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: 500 }}
                      >
                        <CodeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle', color: 'rgba(255,255,255,0.4)' }} />
                        {member.totalProblems ?? 0}
                      </Typography>

                      {/* Streak */}
                      <Typography
                        variant="body2"
                        sx={{ color: '#ff9800', textAlign: 'center', fontWeight: 500 }}
                      >
                        <StreakIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        {member.currentStreak ?? 0}
                      </Typography>

                      {/* Activity Score */}
                      <Typography
                        variant="body1"
                        sx={{ color: '#90caf9', textAlign: 'center', fontWeight: 700 }}
                      >
                        {member.activityScore ?? 0}
                      </Typography>
                    </Box>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

export default Boilerplate(LeaderboardPage);
