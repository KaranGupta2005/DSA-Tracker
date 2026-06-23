import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Snackbar,
} from '@mui/material';
import {
  EmojiEvents as ContestIcon,
  NotificationsActive as NotifIcon,
  Schedule as TimeIcon,
  Timer as DurationIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import api from '@/utils/api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Convert a VAPID base64 string to a Uint8Array for pushManager.subscribe
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Format duration from seconds to a human-readable string (e.g. "2:30")
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Format an ISO date string to the user's local timezone
 */
function formatStartTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Platform badge color mappings
 */
const platformStyles = {
  codeforces: {
    label: 'Codeforces',
    color: '#1976d2',
    bgColor: 'rgba(25, 118, 210, 0.15)',
  },
  leetcode: {
    label: 'LeetCode',
    color: '#f5a623',
    bgColor: 'rgba(245, 166, 35, 0.15)',
  },
};

/**
 * Contests page — displays upcoming Codeforces (up to 10) and LeetCode (up to 4) contests.
 * Shows contest name, platform badge, start time (local timezone), and duration.
 * Includes push notification subscription and staleness warning.
 */
function ContestsPage() {
  const [contests, setContests] = useState({ codeforces: [], leetcode: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStale, setIsStale] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchContests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/contests/upcoming');
      const data = response.data;

      setContests({
        codeforces: (data.codeforces || []).slice(0, 10),
        leetcode: (data.leetcode || []).slice(0, 4),
      });
      setLastFetchedAt(data.lastFetchedAt || null);

      // Check staleness: isStale flag from API or lastFetchedAt > 24h ago
      if (data.isStale) {
        setIsStale(true);
      } else if (data.lastFetchedAt) {
        const fetchedAt = new Date(data.lastFetchedAt);
        const hoursAgo = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
        setIsStale(hoursAgo > 24);
      }
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to load contests. Please try again later.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  /**
   * Subscribe to push notifications using Web Push API
   */
  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSnackbar({
        open: true,
        message: 'Push notifications are not supported in this browser.',
        severity: 'error',
      });
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setSnackbar({
        open: true,
        message: 'Push notifications are not configured.',
        severity: 'error',
      });
      return;
    }

    try {
      setSubscribing(true);

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setSnackbar({
          open: true,
          message: 'Notification permission denied. Please enable notifications in your browser settings.',
          severity: 'warning',
        });
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications with VAPID key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to backend
      await api.post('/contests/subscribe', { subscription });

      setSubscribed(true);
      setSnackbar({
        open: true,
        message: 'Subscribed to contest notifications!',
        severity: 'success',
      });
    } catch (err) {
      console.error('Push subscription error:', err);
      setSnackbar({
        open: true,
        message: 'Failed to subscribe to notifications. Please try again.',
        severity: 'error',
      });
    } finally {
      setSubscribing(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  const renderContestCard = (contest, index) => {
    const platform = platformStyles[contest.platform] || platformStyles.codeforces;

    return (
      <motion.div key={`${contest.platform}-${index}`} variants={itemVariants}>
        <Card
          sx={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 2,
            mb: 2,
            transition: 'border-color 0.2s, transform 0.2s',
            '&:hover': {
              borderColor: platform.color,
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Chip
                    label={platform.label}
                    size="small"
                    sx={{
                      backgroundColor: platform.bgColor,
                      color: platform.color,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      border: `1px solid ${platform.color}30`,
                    }}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={contest.name}
                >
                  {contest.name}
                </Typography>
              </Box>

              {contest.url && (
                <Button
                  href={contest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="outlined"
                  sx={{
                    color: platform.color,
                    borderColor: `${platform.color}50`,
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    '&:hover': {
                      borderColor: platform.color,
                      backgroundColor: platform.bgColor,
                    },
                  }}
                >
                  View
                </Button>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                mt: 2,
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimeIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2" sx={{ color: 'inherit' }}>
                  {formatStartTime(contest.startTime)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DurationIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2" sx={{ color: 'inherit' }}>
                  {formatDuration(contest.duration)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5 }}
          >
            <ContestIcon sx={{ fontSize: 32, color: '#1976d2' }} />
            Upcoming Contests
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
            Stay updated with competitive programming contests
          </Typography>
        </div>

        <Button
          variant="contained"
          startIcon={subscribing ? <CircularProgress size={18} color="inherit" /> : <NotifIcon />}
          onClick={handleSubscribe}
          disabled={subscribing || subscribed}
          sx={{
            background: subscribed
              ? 'rgba(76, 175, 80, 0.2)'
              : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            color: subscribed ? '#4caf50' : '#fff',
            border: subscribed ? '1px solid rgba(76, 175, 80, 0.4)' : 'none',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.2,
            borderRadius: 2,
            boxShadow: subscribed ? 'none' : '0 4px 14px rgba(25, 118, 210, 0.3)',
            '&:hover': {
              background: subscribed
                ? 'rgba(76, 175, 80, 0.3)'
                : 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
            },
            '&:disabled': {
              color: subscribed ? '#4caf50' : 'rgba(255,255,255,0.5)',
            },
          }}
        >
          {subscribed ? 'Subscribed' : 'Subscribe to notifications'}
        </Button>
      </motion.div>

      {/* Staleness Warning */}
      {isStale && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <Alert
            severity="warning"
            icon={<WarningIcon />}
            sx={{
              mb: 3,
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              color: '#ffb74d',
              '& .MuiAlert-icon': { color: '#ffb74d' },
            }}
          >
            Contest information may be outdated
            {lastFetchedAt && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255,183,77,0.7)' }}>
                Last updated: {new Date(lastFetchedAt).toLocaleString()}
              </Typography>
            )}
          </Alert>
        </motion.div>
      )}

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

      {/* Contest Lists */}
      {!loading && !error && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Codeforces Contests */}
          {contests.codeforces.length > 0 && (
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: platformStyles.codeforces.color,
                  }}
                />
                Codeforces
                <Chip
                  label={contests.codeforces.length}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(25, 118, 210, 0.15)',
                    color: '#1976d2',
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              </Typography>
              {contests.codeforces.map((contest, index) =>
                renderContestCard({ ...contest, platform: 'codeforces' }, index)
              )}
            </Box>
          )}

          {/* LeetCode Contests */}
          {contests.leetcode.length > 0 && (
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: platformStyles.leetcode.color,
                  }}
                />
                LeetCode
                <Chip
                  label={contests.leetcode.length}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(245, 166, 35, 0.15)',
                    color: '#f5a623',
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              </Typography>
              {contests.leetcode.map((contest, index) =>
                renderContestCard({ ...contest, platform: 'leetcode' }, index)
              )}
            </Box>
          )}

          {/* Empty State */}
          {contests.codeforces.length === 0 && contests.leetcode.length === 0 && (
            <motion.div variants={itemVariants}>
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                <ContestIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" sx={{ color: 'inherit' }}>
                  No upcoming contests found
                </Typography>
                <Typography variant="body2" sx={{ color: 'inherit', mt: 1 }}>
                  Check back later for upcoming Codeforces and LeetCode contests.
                </Typography>
              </Box>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default Boilerplate(ContestsPage);
