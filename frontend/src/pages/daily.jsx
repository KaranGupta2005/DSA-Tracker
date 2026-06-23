import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  OpenInNew,
  CalendarToday,
  Star,
} from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

function DailyProblemPage() {
  const { user } = useAuth();

  const [todayProblem, setTodayProblem] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [checking, setChecking] = useState(false);
  const [solvedStatus, setSolvedStatus] = useState(null); // null | true | false
  const [error, setError] = useState('');
  const [checkError, setCheckError] = useState('');

  // Fetch today's problem
  useEffect(() => {
    const fetchToday = async () => {
      try {
        const response = await api.get('/daily/today');
        setTodayProblem(response.data);
      } catch (err) {
        const message =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load today\'s problem';
        setError(message);
      } finally {
        setLoadingToday(false);
      }
    };

    fetchToday();
  }, []);

  // Fetch history (last 7 problems)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/daily/history');
        setHistory(response.data);
      } catch {
        // Silently fail for history — today's problem is more important
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  // Check if the member solved today's problem
  const handleCheckSolved = async () => {
    if (!user?.codeforcesHandle) {
      setCheckError('No Codeforces handle found. Please update your profile.');
      return;
    }

    setChecking(true);
    setCheckError('');
    setSolvedStatus(null);

    try {
      const response = await api.get(`/daily/check/${user.codeforcesHandle}`);
      setSolvedStatus(response.data.solved);
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to check submission status';
      setCheckError(message);
    } finally {
      setChecking(false);
    }
  };

  // Get rating color based on Codeforces rating ranges
  const getRatingColor = (rating) => {
    if (!rating || rating === 0) return '#9e9e9e';
    if (rating < 1200) return '#808080';
    if (rating < 1400) return '#008000';
    if (rating < 1600) return '#03a89e';
    if (rating < 1900) return '#0000ff';
    if (rating < 2100) return '#aa00aa';
    if (rating < 2400) return '#ff8c00';
    return '#ff0000';
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, mb: 1, color: '#fff' }}
        >
          Daily Problem
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}
        >
          Solve today&apos;s challenge and keep your streak alive
        </Typography>

        {/* Today's Problem Card */}
        {loadingToday ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#1976d2' }} />
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ mb: 4 }}>
            {error}
          </Alert>
        ) : todayProblem ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Box
              sx={{
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                p: 4,
                mb: 4,
              }}
            >
              {/* Problem Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    {formatDate(todayProblem.date)}
                  </Typography>
                </Box>
                <Chip
                  icon={<Star sx={{ fontSize: 16 }} />}
                  label={`Rating: ${todayProblem.rating || 'Unrated'}`}
                  size="small"
                  sx={{
                    color: getRatingColor(todayProblem.rating),
                    borderColor: getRatingColor(todayProblem.rating),
                    '& .MuiChip-icon': { color: getRatingColor(todayProblem.rating) },
                  }}
                  variant="outlined"
                />
              </Box>

              {/* Problem Name & Link */}
              <Typography
                variant="h5"
                component="h2"
                sx={{ fontWeight: 600, color: '#fff', mb: 1 }}
              >
                {todayProblem.name}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  Contest {todayProblem.contestId} &bull; Problem {todayProblem.index}
                </Typography>
                <a
                  href={`https://codeforces.com/contest/${todayProblem.contestId}/problem/${todayProblem.index}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  Solve on Codeforces <OpenInNew sx={{ fontSize: 14 }} />
                </a>
              </Box>

              {/* Check Solved Button */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <motion.button
                  onClick={handleCheckSolved}
                  disabled={checking}
                  whileHover={{ scale: checking ? 1 : 1.02 }}
                  whileTap={{ scale: checking ? 1 : 0.98 }}
                  className="py-2.5 px-5 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 4px 14px rgba(25, 118, 210, 0.4)',
                    border: 'none',
                    cursor: checking ? 'not-allowed' : 'pointer',
                  }}
                >
                  {checking ? (
                    <CircularProgress size={20} sx={{ color: '#fff' }} />
                  ) : (
                    'Check if I solved it'
                  )}
                </motion.button>

                {/* Solved Status Indicator */}
                {solvedStatus === true && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 22 }} />
                    <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      Solved! Great work!
                    </Typography>
                  </motion.div>
                )}

                {solvedStatus === false && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1"
                  >
                    <RadioButtonUnchecked sx={{ color: '#ff9800', fontSize: 22 }} />
                    <Typography variant="body2" sx={{ color: '#ff9800', fontWeight: 600 }}>
                      Not solved yet — keep going!
                    </Typography>
                  </motion.div>
                )}
              </Box>

              {checkError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {checkError}
                </Alert>
              )}
            </Box>
          </motion.div>
        ) : (
          <Alert severity="info" sx={{ mb: 4 }}>
            No daily problem has been set for today.
          </Alert>
        )}

        {/* History Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Typography
            variant="h6"
            component="h3"
            sx={{ fontWeight: 600, color: '#fff', mb: 2 }}
          >
            Recent Problems
          </Typography>

          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: '#1976d2' }} />
            </Box>
          ) : history.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              No problem history available.
            </Typography>
          ) : (
            <Box
              sx={{
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              {history.map((problem, index) => (
                <Box key={problem.date || index}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 3,
                      py: 2,
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                      {/* Completion indicator */}
                      {problem.completions && problem.completions.length > 0 ? (
                        <CheckCircle sx={{ color: '#4caf50', fontSize: 20, flexShrink: 0 }} />
                      ) : (
                        <RadioButtonUnchecked sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, flexShrink: 0 }} />
                      )}
                      <Box sx={{ minWidth: 0 }}>
                        <a
                          href={`https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-blue-400 transition-colors text-sm font-medium"
                          style={{ textDecoration: 'none' }}
                        >
                          {problem.name}
                        </a>
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: 'rgba(255,255,255,0.4)' }}
                        >
                          {formatDate(problem.date)} &bull; Contest {problem.contestId}{problem.index}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={problem.rating || 'Unrated'}
                      size="small"
                      sx={{
                        color: getRatingColor(problem.rating),
                        borderColor: getRatingColor(problem.rating),
                        fontSize: '0.75rem',
                      }}
                      variant="outlined"
                    />
                  </Box>
                  {index < history.length - 1 && (
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Boilerplate(DailyProblemPage);
