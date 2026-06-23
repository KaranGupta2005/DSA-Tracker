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
  const [contestId, setContestId] = useState('');
  const [problemIndex, setProblemIndex] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submittingProblem, setSubmittingProblem] = useState(false);

  // Confirmation dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null); // { type: 'approve' | 'reject', member }
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

  // Fetch all members
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    setMembersError('');
    try {
      const response = await api.get('/leaderboard');
      const data = response.data.leaderboard || response.data || [];
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

  useEffect(() => {
    if (user && isAdmin()) {
      fetchMembers();
    }
  }, [user, isAdmin, fetchMembers]);

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

  // Handle approve/reject action
  const handleConfirmAction = async () => {
    if (!dialogAction) return;

    setActionLoading(true);
    try {
      const { type, member } = dialogAction;
      const memberId = member._id || member.id;

      if (type === 'approve') {
        await api.patch(`/auth/admin/approve/${memberId}`);
      } else {
        await api.delete(`/auth/admin/reject/${memberId}`);
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

    const parsedContestId = parseInt(contestId, 10);
    if (!contestId || isNaN(parsedContestId) || parsedContestId <= 0) {
      setFormError('Contest ID must be a positive number.');
      return false;
    }

    const trimmedIndex = problemIndex.trim().toUpperCase();
    if (!trimmedIndex || !/^[A-Z]$/.test(trimmedIndex)) {
      setFormError('Problem index must be a single letter (A-Z).');
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
      await api.post('/daily/set', {
        contestId: parseInt(contestId, 10),
        index: problemIndex.trim().toUpperCase(),
      });
      setFormSuccess('Daily problem set successfully!');
      setContestId('');
      setProblemIndex('');
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
              <TextField
                label="Contest ID"
                placeholder="e.g. 1900"
                value={contestId}
                onChange={(e) => {
                  setContestId(e.target.value);
                  setFormError('');
                }}
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
                onChange={(e) => {
                  setProblemIndex(e.target.value);
                  setFormError('');
                }}
                size="small"
                required
                sx={{ minWidth: 130 }}
                slotProps={{
                  input: { sx: { color: '#fff' } },
                  inputLabel: { sx: { color: 'rgba(255,255,255,0.6)' } },
                }}
              />
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
          {dialogAction?.type === 'approve' ? 'Approve Member' : 'Reject Member'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Are you sure you want to {dialogAction?.type}{' '}
            <strong style={{ color: '#fff' }}>
              {dialogAction?.member?.codeforcesHandle}
            </strong>
            ?
            {dialogAction?.type === 'reject' &&
              ' This will permanently remove their registration.'}
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
                : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Boilerplate(AdminDashboardPage);
