import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Shield as AdminIcon,
  CheckCircle as ApproveIcon,
  CheckCircle,
  Cancel as RejectIcon,
  Assignment as ProblemIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();

  // Member data
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState('');

  // Daily problem form state
  const [problemPlatform, setProblemPlatform] = useState('codeforces'); // 'codeforces' | 'leetcode'
  const [contestId, setContestId] = useState('');
  const [problemIndex, setProblemIndex] = useState('');
  const [lcProblemName, setLcProblemName] = useState('');
  const [lcProblemUrl, setLcProblemUrl] = useState('');
  const [lcDifficulty, setLcDifficulty] = useState('Medium');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submittingProblem, setSubmittingProblem] = useState(false);

  // Daily completions state
  const [completions, setCompletions] = useState([]);
  const [completionsTotal, setCompletionsTotal] = useState(0);
  const [completionsProblemName, setCompletionsProblemName] = useState('');
  const [loadingCompletions, setLoadingCompletions] = useState(false);

  // Confirmation dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null); // { type: 'approve' | 'reject' | 'delete', member }
  const [actionLoading, setActionLoading] = useState(false);

  // Admin role guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin()) {
        router.push('/dashboard');
      }
    }
  }, [authLoading, user, isAdmin, router]);

  // Fetch all members (including pending)
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    setMembersError('');
    try {
      const response = await api.get('/auth/admin/members');
      const data = response.data.members || response.data || [];
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to load members.';
      setMembersError(message);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // Fetch today's daily problem completions
  const fetchCompletions = useCallback(async () => {
    setLoadingCompletions(true);
    try {
      const response = await api.get('/daily/completions');
      setCompletions(response.data.completions || []);
      setCompletionsTotal(response.data.total || 0);
      setCompletionsProblemName(response.data.problemName || '');
    } catch {
      // Silently fail — completions section is supplementary
    } finally {
      setLoadingCompletions(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin()) {
      fetchMembers();
      fetchCompletions();
    }
  }, [user, isAdmin, fetchMembers, fetchCompletions]);

  // Filter pending and active members
  const pendingMembers = members.filter((m) => m.status === 'pending');
  const allMembers = members;

  // Open confirmation dialog
  const openConfirmDialog = (type, member) => {
    setDialogAction({ type, member });
    setDialogOpen(true);
  };

  // Close confirmation dialog
  const closeDialog = () => {
    setDialogOpen(false);
    setDialogAction(null);
  };

  // Handle approve/reject/delete action
  const handleConfirmAction = async () => {
    if (!dialogAction) return;

    setActionLoading(true);
    try {
      const { type, member } = dialogAction;
      const memberId = member._id || member.id;

      if (type === 'approve') {
        await api.patch(`/auth/admin/approve/${memberId}`);
      } else if (type === 'reject') {
        await api.delete(`/auth/admin/reject/${memberId}`);
      } else if (type === 'delete') {
        await api.delete(`/auth/admin/members/${memberId}`);
      }

      // Refresh members list
      await fetchMembers();
      closeDialog();
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        `Failed to ${dialogAction.type} member.`;
      setMembersError(message);
      closeDialog();
    } finally {
      setActionLoading(false);
    }
  };

  // Validate daily problem form
  const validateForm = () => {
    setFormError('');

    if (problemPlatform === 'leetcode') {
      if (!lcProblemName.trim()) {
        setFormError('Problem name is required for LeetCode problems.');
        return false;
      }
      if (!lcProblemUrl.trim()) {
        setFormError('Problem URL is required for LeetCode problems.');
        return false;
      }
      return true;
    }

    // Codeforces validation
    const parsedContestId = parseInt(contestId, 10);
    if (!contestId || isNaN(parsedContestId) || parsedContestId <= 0) {
      setFormError('Contest ID must be a positive number.');
      return false;
    }

    const trimmedIndex = problemIndex.trim().toUpperCase();
    if (!trimmedIndex || !/^[A-Z][0-9]?$/.test(trimmedIndex)) {
      setFormError('Problem index must be a letter (A-Z) optionally followed by a digit.');
      return false;
    }

    return true;
  };

  // Handle daily problem form submission
  const handleSetProblem = async (e) => {
    e.preventDefault();
    setFormSuccess('');

    if (!validateForm()) return;

    setSubmittingProblem(true);
    try {
      if (problemPlatform === 'leetcode') {
        await api.post('/daily/set', {
          platform: 'leetcode',
          name: lcProblemName.trim(),
          url: lcProblemUrl.trim(),
          difficulty: lcDifficulty,
        });
      } else {
        await api.post('/daily/set', {
          contestId: parseInt(contestId, 10),
          index: problemIndex.trim().toUpperCase(),
        });
      }
      setFormSuccess('Daily problem set successfully!');
      setContestId('');
      setProblemIndex('');
      setLcProblemName('');
      setLcProblemUrl('');
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to set daily problem.';
      setFormError(message);
    } finally {
      setSubmittingProblem(false);
    }
  };

  // Loading / guard state
  if (authLoading || (!user && !membersError)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <CircularProgress sx={{ color: '#1976d2' }} />
      </div>
    );
  }

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
            <AdminIcon
              sx={{ fontSize: 36, mr: 1, verticalAlign: 'middle', color: '#8b5cf6' }}
            />
            Admin Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Manage members and assign daily problems
          </Typography>
        </motion.div>

        {/* Pending Members Section */}
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
              <PeopleIcon sx={{ color: '#f59e0b' }} />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                Pending Members
              </Typography>
              {pendingMembers.length > 0 && (
                <Chip
                  label={pendingMembers.length}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    fontWeight: 700,
                  }}
                />
              )}
            </div>

            {loadingMembers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} sx={{ color: '#1976d2' }} />
              </Box>
            ) : membersError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {membersError}
              </Alert>
            ) : pendingMembers.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 3 }}
              >
                No pending members to review.
              </Typography>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {pendingMembers.map((member) => (
                    <motion.div
                      key={member._id || member.id || member.codeforcesHandle}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 2,
                          borderRadius: 2,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <Box>
                          <Typography
                            variant="body1"
                            sx={{ color: '#fff', fontWeight: 600 }}
                          >
                            {member.codeforcesHandle}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            Registered:{' '}
                            {member.createdAt
                              ? new Date(member.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </Typography>
                        </Box>
                        <div className="flex gap-2">
                          <Button
                            variant="contained"
                            size="small"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => openConfirmDialog('approve', member)}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<RejectIcon />}
                            onClick={() => openConfirmDialog('reject', member)}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                          >
                            Reject
                          </Button>
                        </div>
                      </Box>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Box>
        </motion.div>

        {/* Daily Problem Assignment Section */}
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
              <ProblemIcon sx={{ color: '#22c55e' }} />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                Daily Problem Assignment
              </Typography>
            </div>

            {/* Platform Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={problemPlatform === 'codeforces' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => { setProblemPlatform('codeforces'); setFormError(''); }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(problemPlatform === 'codeforces'
                    ? { background: '#1976d2' }
                    : { color: '#1976d2', borderColor: 'rgba(25,118,210,0.4)' }),
                }}
              >
                Codeforces
              </Button>
              <Button
                variant={problemPlatform === 'leetcode' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => { setProblemPlatform('leetcode'); setFormError(''); }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(problemPlatform === 'leetcode'
                    ? { background: '#f59e0b' }
                    : { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }),
                }}
              >
                LeetCode
              </Button>
            </div>

            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            {formSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {formSuccess}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSetProblem}
              sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}
            >
              {problemPlatform === 'codeforces' ? (
                <>
                  <TextField
                    label="Contest ID"
                    placeholder="e.g. 1900"
                    value={contestId}
                    onChange={(e) => { setContestId(e.target.value); setFormError(''); }}
                    size="small"
                    type="number"
                    required
                    sx={{ minWidth: 150 }}
                    slotProps={{
                      input: { sx: { color: '#fff' } },
                      inputLabel: { sx: { color: 'rgba(255,255,255,0.6)' } },
                    }}
                  />
                  <TextField
                    label="Problem Index"
                    placeholder="e.g. A, B, C"
                    value={problemIndex}
                    onChange={(e) => { setProblemIndex(e.target.value); setFormError(''); }}
                    size="small"
                    required
                    sx={{ minWidth: 130 }}
                    slotProps={{
                      input: { sx: { color: '#fff' } },
                      inputLabel: { sx: { color: 'rgba(255,255,255,0.6)' } },
                    }}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Problem Name"
                    placeholder="e.g. Two Sum"
                    value={lcProblemName}
                    onChange={(e) => { setLcProblemName(e.target.value); setFormError(''); }}
                    size="small"
                    required
                    sx={{ minWidth: 180 }}
                    slotProps={{
                      input: { sx: { color: '#fff' } },
                      inputLabel: { sx: { color: 'rgba(255,255,255,0.6)' } },
                    }}
                  />
                  <TextField
                    label="LeetCode URL"
                    placeholder="https://leetcode.com/problems/..."
                    value={lcProblemUrl}
                    onChange={(e) => { setLcProblemUrl(e.target.value); setFormError(''); }}
                    size="small"
                    required
                    sx={{ minWidth: 250 }}
                    slotProps={{
                      input: { sx: { color: '#fff' } },
                      inputLabel: { sx: { color: 'rgba(255,255,255,0.6)' } },
                    }}
                  />
                  <TextField
                    label="Difficulty"
                    value={lcDifficulty}
                    onChange={(e) => setLcDifficulty(e.target.value)}
                    size="small"
                    select
                    SelectProps={{ native: true }}
                    sx={{ minWidth: 120 }}
                    slotProps={{
                      input: { sx: { color: '#fff' } },
                      inputLabel: { sx: { color: 'rgba(255,255,255,0.6)' } },
                    }}
                  >
                    <option value="Easy" style={{ background: '#1e293b' }}>Easy</option>
                    <option value="Medium" style={{ background: '#1e293b' }}>Medium</option>
                    <option value="Hard" style={{ background: '#1e293b' }}>Hard</option>
                  </TextField>
                </>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={submittingProblem}
                startIcon={
                  submittingProblem ? (
                    <CircularProgress size={18} sx={{ color: '#fff' }} />
                  ) : (
                    <ProblemIcon />
                  )
                }
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  },
                }}
              >
                Set Problem
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={async () => {
                  try {
                    await api.delete('/daily/today');
                    setFormSuccess('Today\'s problem deleted.');
                  } catch (err) {
                    setFormError(err.response?.data?.error?.message || 'No problem to delete.');
                  }
                }}
                sx={{ textTransform: 'none', fontWeight: 600, ml: 1 }}
              >
                Delete POTD
              </Button>
            </Box>
          </Box>
        </motion.div>

        {/* Today's Completions Section */}
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
              <CheckCircle sx={{ color: '#4caf50' }} />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                Today&apos;s Completions
              </Typography>
              {completionsTotal > 0 && (
                <Chip
                  label={completionsTotal}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    fontWeight: 700,
                  }}
                />
              )}
            </div>

            {completionsProblemName && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                Problem: <strong style={{ color: '#fff' }}>{completionsProblemName}</strong>
              </Typography>
            )}

            {loadingCompletions ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} sx={{ color: '#1976d2' }} />
              </Box>
            ) : completions.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 2 }}
              >
                No members have completed today&apos;s problem yet.
              </Typography>
            ) : (
              <div className="space-y-2">
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  {completionsTotal} member{completionsTotal !== 1 ? 's' : ''} completed today&apos;s problem
                </Typography>
                {completions.map((c, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 1.5,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ color: '#4caf50', fontSize: 16 }} />
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                        {c.codeforcesHandle || 'Unknown'}
                      </Typography>
                      {c.leetcodeUsername && (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                          (LC: {c.leetcodeUsername})
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      {c.completedAt ? new Date(c.completedAt).toLocaleTimeString() : ''}
                    </Typography>
                  </Box>
                ))}
              </div>
            )}
          </Box>
        </motion.div>

        {/* Broadcast Notification Section */}
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
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                📢 Send Notification to All
              </Typography>
            </div>
            <Box
              component="form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const title = form.notifTitle.value;
                const body = form.notifBody.value;
                if (!title || !body) return;
                try {
                  const res = await api.post('/contests/broadcast', { title, body, url: '/' });
                  setFormSuccess(`Notification sent to ${res.data.sent} members!`);
                  form.reset();
                } catch (err) {
                  setFormError(err.response?.data?.error?.message || 'Failed to send notification.');
                }
              }}
              sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}
            >
              <TextField
                name="notifTitle"
                label="Title"
                placeholder="e.g. 🚀 New Feature!"
                size="small"
                required
                sx={{ minWidth: 200 }}
                slotProps={{
                  input: { sx: { color: '#fff' } },
                  inputLabel: { sx: { color: 'rgba(255,255,255,0.6)' } },
                }}
              />
              <TextField
                name="notifBody"
                label="Message"
                placeholder="e.g. Check out the new leaderboard..."
                size="small"
                required
                sx={{ minWidth: 300, flex: 1 }}
                slotProps={{
                  input: { sx: { color: '#fff' } },
                  inputLabel: { sx: { color: 'rgba(255,255,255,0.6)' } },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' },
                }}
              >
                Broadcast
              </Button>
            </Box>
          </Box>
        </motion.div>

        {/* All Members Section */}
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
            <div className="flex items-center gap-2 mb-4">
              <PeopleIcon sx={{ color: '#3b82f6' }} />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                All Members
              </Typography>
              {allMembers.length > 0 && (
                <Chip
                  label={allMembers.length}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    fontWeight: 700,
                  }}
                />
              )}
            </div>

            {loadingMembers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} sx={{ color: '#1976d2' }} />
              </Box>
            ) : allMembers.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 3 }}
              >
                No members found.
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  background: 'transparent',
                  boxShadow: 'none',
                  '& .MuiTableCell-root': {
                    borderColor: 'rgba(255,255,255,0.06)',
                  },
                }}
              >
                <Table size="small" aria-label="Members table">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        Handle
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        LeetCode
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        Status
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        Activity Score
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allMembers.map((member) => (
                      <TableRow
                        key={member._id || member.id || member.codeforcesHandle}
                        sx={{
                          '&:hover': {
                            background: 'rgba(255,255,255,0.02)',
                          },
                        }}
                      >
                        <TableCell sx={{ color: '#fff', fontWeight: 500 }}>
                          {member.codeforcesHandle}
                        </TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          {member.leetcodeUsername || '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={member.status || 'active'}
                            size="small"
                            sx={{
                              backgroundColor:
                                member.status === 'pending'
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : 'rgba(34, 197, 94, 0.2)',
                              color:
                                member.status === 'pending'
                                  ? '#f59e0b'
                                  : '#22c55e',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {member.activityScore ?? 0}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => openConfirmDialog('delete', member)}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.7rem', minWidth: 'auto', px: 1.5, py: 0.5 }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </motion.div>
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        aria-labelledby="confirm-dialog-title"
        PaperProps={{
          sx: {
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle id="confirm-dialog-title" sx={{ color: '#fff', fontWeight: 600 }}>
          {dialogAction?.type === 'approve' ? 'Approve Member' : dialogAction?.type === 'delete' ? 'Permanently Remove Member' : 'Reject Member'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {dialogAction?.type === 'delete' ? (
              <>This will permanently remove <strong style={{ color: '#fff' }}>{dialogAction?.member?.codeforcesHandle}</strong> and all their data. This cannot be undone.</>
            ) : (
              <>
                Are you sure you want to {dialogAction?.type}{' '}
                <strong style={{ color: '#fff' }}>
                  {dialogAction?.member?.codeforcesHandle}
                </strong>
                ?
                {dialogAction?.type === 'reject' &&
                  ' This will permanently remove their registration.'}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeDialog}
            disabled={actionLoading}
            sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            disabled={actionLoading}
            variant="contained"
            color={dialogAction?.type === 'approve' ? 'success' : 'error'}
            startIcon={
              actionLoading ? (
                <CircularProgress size={16} sx={{ color: '#fff' }} />
              ) : dialogAction?.type === 'approve' ? (
                <ApproveIcon />
              ) : (
                <RejectIcon />
              )
            }
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {actionLoading
              ? 'Processing...'
              : dialogAction?.type === 'approve'
                ? 'Approve'
                : dialogAction?.type === 'delete'
                  ? 'Remove Permanently'
                  : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Boilerplate(AdminDashboardPage);
