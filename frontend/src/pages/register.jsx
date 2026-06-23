import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Box,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';

function RegisterPage() {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    codeforcesHandle: '',
    leetcodeUsername: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.codeforcesHandle.trim()) {
      setError('Codeforces handle is required');
      return false;
    }

    if (formData.codeforcesHandle.trim().length < 2) {
      setError('Codeforces handle must be at least 2 characters');
      return false;
    }

    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        codeforcesHandle: formData.codeforcesHandle.trim(),
        password: formData.password,
      };

      // Include LeetCode username only if provided
      if (formData.leetcodeUsername.trim()) {
        payload.leetcodeUsername = formData.leetcodeUsername.trim();
      }

      await register(payload);
      setSuccess(true);
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Registration failed. Please try again.';

      // Provide user-friendly error messages
      if (message.toLowerCase().includes('handle not found') || message.toLowerCase().includes('not found on codeforces')) {
        setError('The Codeforces handle was not found. Please check and try again.');
      } else if (message.toLowerCase().includes('leetcode') && message.toLowerCase().includes('not found')) {
        setError('The LeetCode username was not found. Please check and try again.');
      } else if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already exists') || message.toLowerCase().includes('already registered')) {
        setError('An account with this Codeforces handle already exists.');
      } else if (message.toLowerCase().includes('unavailable') || message.toLowerCase().includes('timeout')) {
        setError('External service verification is temporarily unavailable. Please try again later.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Success state - show pending approval message
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Box
            sx={{
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              p: 4,
              textAlign: 'center',
            }}
          >
            <CheckCircle sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 700, color: '#fff', mb: 1 }}
            >
              Registration Successful!
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}
            >
              Your account is awaiting admin approval. You will be able to log in
              once an administrator has approved your registration.
            </Typography>
            <Alert
              severity="info"
              sx={{ mb: 3, textAlign: 'left' }}
            >
              Awaiting admin approval — this may take some time. Please check back later.
            </Alert>
            <Link
              href="/login"
              style={{
                color: '#1976d2',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              Go to Login
            </Link>
          </Box>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Box
          sx={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            p: 4,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, textAlign: 'center', mb: 1, color: '#fff' }}
          >
            Create Account
          </Typography>
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', mb: 3, color: 'rgba(255,255,255,0.6)' }}
          >
            Join the IEEE DTU DSA Tracker community
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              required
              label="Codeforces Handle"
              name="codeforcesHandle"
              value={formData.codeforcesHandle}
              onChange={handleChange}
              placeholder="e.g. tourist"
              helperText="Your handle must exist on Codeforces"
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  sx: { color: '#fff' },
                },
                inputLabel: {
                  sx: { color: 'rgba(255,255,255,0.6)' },
                },
                formHelperText: {
                  sx: { color: 'rgba(255,255,255,0.4)' },
                },
              }}
            />

            <TextField
              fullWidth
              label="LeetCode Username (Optional)"
              name="leetcodeUsername"
              value={formData.leetcodeUsername}
              onChange={handleChange}
              placeholder="e.g. leetcode_user"
              helperText="You can link your LeetCode later from your profile"
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  sx: { color: '#fff' },
                },
                inputLabel: {
                  sx: { color: 'rgba(255,255,255,0.6)' },
                },
                formHelperText: {
                  sx: { color: 'rgba(255,255,255,0.4)' },
                },
              }}
            />

            <TextField
              fullWidth
              required
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  sx: { color: '#fff' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
                inputLabel: {
                  sx: { color: 'rgba(255,255,255,0.6)' },
                },
              }}
            />

            <TextField
              fullWidth
              required
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  sx: { color: '#fff' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
                inputLabel: {
                  sx: { color: 'rgba(255,255,255,0.6)' },
                },
              }}
            />

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                boxShadow: '0 4px 14px rgba(25, 118, 210, 0.4)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : (
                'Register'
              )}
            </motion.button>
          </Box>

          <Typography
            variant="body2"
            sx={{ textAlign: 'center', mt: 3, color: 'rgba(255,255,255,0.6)' }}
          >
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
          </Typography>
        </Box>
      </motion.div>
    </div>
  );
}

export default Boilerplate(RegisterPage);
