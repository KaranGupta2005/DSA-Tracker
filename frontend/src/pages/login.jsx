import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Box,
  TextField,
  Typography,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';

function LoginPage() {
  const router = useRouter();
  const { login, adminLogin } = useAuth();

  const [activeTab, setActiveTab] = useState(0); // 0 = Member, 1 = Admin
  const [formData, setFormData] = useState({
    codeforcesHandle: '',
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
    setFormData({ codeforcesHandle: '', username: '', password: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const validateForm = () => {
    if (activeTab === 0) {
      if (!formData.codeforcesHandle.trim()) {
        setError('Codeforces handle is required');
        return false;
      }
      if (!formData.password) {
        setError('Password is required');
        return false;
      }
    } else {
      if (!formData.username.trim()) {
        setError('Username is required');
        return false;
      }
      if (!formData.password) {
        setError('Password is required');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      if (activeTab === 0) {
        // Member login
        await login({
          codeforcesHandle: formData.codeforcesHandle.trim(),
          password: formData.password,
        });
      } else {
        // Admin login
        await adminLogin({
          username: formData.username.trim(),
          password: formData.password,
        });
      }
      router.push('/dashboard');
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Login failed. Please check your credentials.';

      // Handle pending member case
      if (err.response?.status === 403 && message.toLowerCase().includes('pending')) {
        setError('Your account is awaiting admin approval. Please try again later.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
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
            Welcome Back
          </Typography>
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', mb: 3, color: 'rgba(255,255,255,0.6)' }}
          >
            Sign in to your IEEE DTU DSA Tracker account
          </Typography>

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              mb: 3,
              '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', textTransform: 'none', fontWeight: 600 },
              '& .Mui-selected': { color: '#1976d2' },
              '& .MuiTabs-indicator': { backgroundColor: '#1976d2' },
            }}
          >
            <Tab label="Member" />
            <Tab label="Admin" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {activeTab === 0 ? (
              <TextField
                fullWidth
                label="Codeforces Handle"
                name="codeforcesHandle"
                value={formData.codeforcesHandle}
                onChange={handleChange}
                placeholder="e.g. tourist"
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    sx: { color: '#fff' },
                  },
                  inputLabel: {
                    sx: { color: 'rgba(255,255,255,0.6)' },
                  },
                }}
              />
            ) : (
              <TextField
                fullWidth
                label="Admin Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter admin username"
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    sx: { color: '#fff' },
                  },
                  inputLabel: {
                    sx: { color: 'rgba(255,255,255,0.6)' },
                  },
                }}
              />
            )}

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              sx={{ mb: 3 }}
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
                `Sign In as ${activeTab === 0 ? 'Member' : 'Admin'}`
              )}
            </motion.button>
          </Box>

          <Typography
            variant="body2"
            sx={{ textAlign: 'center', mt: 3, color: 'rgba(255,255,255,0.6)' }}
          >
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
              Register
            </Link>
          </Typography>
        </Box>
      </motion.div>
    </div>
  );
}

export default Boilerplate(LoginPage);
