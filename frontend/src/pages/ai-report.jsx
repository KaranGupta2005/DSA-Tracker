import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  TrendingUp as StrengthIcon,
  TrendingDown as WeaknessIcon,
  Lightbulb as RecommendIcon,
  Code as ProblemIcon,
  Map as RoadmapIcon,
  ErrorOutline as ErrorIcon,
  DataUsage as DataIcon,
} from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function AIReportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(''); // 'insufficient_data' | 'unavailable' | 'generic'

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setErrorType('');
    setReport(null);

    try {
      const response = await api.post('/ai/report');
      setReport(response.data);
    } catch (err) {
      const status = err.response?.status;
      const errorCode = err.response?.data?.error?.code;

      if (status === 422 || errorCode === 'INSUFFICIENT_DATA') {
        setErrorType('insufficient_data');
        setError(
          'You need to solve at least 10 problems before generating a performance report. Keep practicing and come back soon!'
        );
      } else if (status === 503 || errorCode === 'AI_SERVICE_UNAVAILABLE') {
        setErrorType('unavailable');
        setError(
          'The AI service is temporarily unavailable. Please try again in a few minutes.'
        );
      } else {
        setErrorType('generic');
        setError(
          err.response?.data?.error?.message ||
            'Something went wrong while generating your report. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Auth loading state
  if (authLoading || (!user && !error)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <CircularProgress sx={{ color: '#1976d2' }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <AIIcon sx={{ color: '#8b5cf6', fontSize: 32 }} />
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, color: '#fff' }}
            >
              AI Performance Report
            </Typography>
          </div>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Get AI-powered insights about your coding patterns, strengths, and
            areas for improvement.
          </Typography>
        </motion.div>

        {/* Initial State: Generate Button */}
        {!report && !loading && !error && (
          <motion.div variants={itemVariants}>
            <Box
              sx={{
                background:
                  'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: 3,
                p: 5,
                textAlign: 'center',
              }}
            >
              <AIIcon
                sx={{ color: '#8b5cf6', fontSize: 64, mb: 2, opacity: 0.8 }}
              />
              <Typography
                variant="h6"
                sx={{ color: '#fff', fontWeight: 600, mb: 1 }}
              >
                Ready to analyze your performance?
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, maxWidth: 480, mx: 'auto' }}
              >
                Our AI will analyze your solving patterns, identify strengths and
                weaknesses, and provide personalized recommendations to improve
                your competitive programming skills.
              </Typography>
              <motion.button
                onClick={generateReport}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="py-3 px-8 rounded-xl font-semibold text-white text-base transition-all cursor-pointer"
                style={{
                  background:
                    'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                }}
              >
                Generate Report
              </motion.button>
            </Box>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <motion.div variants={itemVariants}>
            <Box
              sx={{
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3,
                p: 5,
                textAlign: 'center',
              }}
            >
              <CircularProgress
                sx={{ color: '#8b5cf6', mb: 2 }}
                size={48}
              />
              <Typography
                variant="h6"
                sx={{ color: '#fff', fontWeight: 600, mb: 1 }}
              >
                Analyzing your performance...
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.5)' }}
              >
                This may take 10–30 seconds as our AI reviews your solving
                patterns and generates personalized insights.
              </Typography>
              <LinearProgress
                sx={{
                  mt: 3,
                  mx: 'auto',
                  maxWidth: 300,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#8b5cf6',
                    borderRadius: 2,
                  },
                }}
              />
            </Box>
          </motion.div>
        )}

        {/* Error States */}
        {error && !loading && (
          <motion.div variants={itemVariants}>
            <Box
              sx={{
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${
                  errorType === 'insufficient_data'
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'
                }`,
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
              }}
            >
              {errorType === 'insufficient_data' ? (
                <DataIcon
                  sx={{ color: '#f59e0b', fontSize: 48, mb: 2, opacity: 0.8 }}
                />
              ) : (
                <ErrorIcon
                  sx={{ color: '#ef4444', fontSize: 48, mb: 2, opacity: 0.8 }}
                />
              )}
              <Typography
                variant="h6"
                sx={{
                  color: errorType === 'insufficient_data' ? '#f59e0b' : '#ef4444',
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                {errorType === 'insufficient_data'
                  ? 'Not Enough Data Yet'
                  : errorType === 'unavailable'
                  ? 'Service Temporarily Unavailable'
                  : 'Something Went Wrong'}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, maxWidth: 480, mx: 'auto' }}
              >
                {error}
              </Typography>
              <motion.button
                onClick={() => {
                  setError('');
                  setErrorType('');
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="py-2 px-6 rounded-lg font-semibold text-white text-sm transition-all cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                Try Again
              </motion.button>
            </Box>
          </motion.div>
        )}

        {/* Report Display */}
        {report && !loading && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Overall Assessment */}
            <motion.div variants={itemVariants}>
              <ReportSection
                icon={<AIIcon sx={{ color: '#8b5cf6' }} />}
                title="Overall Assessment"
              >
                <Typography
                  variant="body1"
                  sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}
                >
                  {report.assessment}
                </Typography>
              </ReportSection>
            </motion.div>

            {/* Strengths */}
            {report.strengths && report.strengths.length > 0 && (
              <motion.div variants={itemVariants}>
                <ReportSection
                  icon={<StrengthIcon sx={{ color: '#22c55e' }} />}
                  title="Strengths"
                >
                  <div className="flex flex-wrap gap-2">
                    {report.strengths.map((strength, idx) => (
                      <Chip
                        key={idx}
                        label={strength}
                        sx={{
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          fontWeight: 600,
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          '& .MuiChip-label': { px: 1.5 },
                        }}
                      />
                    ))}
                  </div>
                </ReportSection>
              </motion.div>
            )}

            {/* Weaknesses */}
            {report.weaknesses && report.weaknesses.length > 0 && (
              <motion.div variants={itemVariants}>
                <ReportSection
                  icon={<WeaknessIcon sx={{ color: '#f97316' }} />}
                  title="Weaknesses"
                >
                  <div className="flex flex-wrap gap-2">
                    {report.weaknesses.map((weakness, idx) => (
                      <Chip
                        key={idx}
                        label={weakness}
                        sx={{
                          backgroundColor: 'rgba(249, 115, 22, 0.15)',
                          color: '#fb923c',
                          fontWeight: 600,
                          border: '1px solid rgba(249, 115, 22, 0.3)',
                          '& .MuiChip-label': { px: 1.5 },
                        }}
                      />
                    ))}
                  </div>
                </ReportSection>
              </motion.div>
            )}

            {/* Recommendations */}
            {report.recommendations && (
              <motion.div variants={itemVariants}>
                <ReportSection
                  icon={<RecommendIcon sx={{ color: '#facc15' }} />}
                  title="Recommendations"
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {report.recommendations}
                  </Typography>
                </ReportSection>
              </motion.div>
            )}

            {/* Recommended Problems */}
            {report.problems && report.problems.length > 0 && (
              <motion.div variants={itemVariants}>
                <ReportSection
                  icon={<ProblemIcon sx={{ color: '#3b82f6' }} />}
                  title="Recommended Problems"
                >
                  <div className="space-y-3">
                    {report.problems.map((problem, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 2,
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 1,
                        }}
                      >
                        <div>
                          <Typography
                            variant="body2"
                            sx={{ color: '#fff', fontWeight: 600 }}
                          >
                            {problem.title}
                          </Typography>
                          {problem.link && (
                            <Typography
                              component="a"
                              href={problem.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="caption"
                              sx={{
                                color: '#60a5fa',
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' },
                              }}
                            >
                              View Problem →
                            </Typography>
                          )}
                        </div>
                        <Chip
                          label={problem.difficulty}
                          size="small"
                          sx={{
                            backgroundColor: getDifficultyColor(problem.difficulty),
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                    ))}
                  </div>
                </ReportSection>
              </motion.div>
            )}

            {/* Roadmap */}
            {report.roadmap && report.roadmap.length > 0 && (
              <motion.div variants={itemVariants}>
                <ReportSection
                  icon={<RoadmapIcon sx={{ color: '#a78bfa' }} />}
                  title="Improvement Roadmap"
                >
                  <div className="space-y-4">
                    {report.roadmap.map((phase, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 2,
                          p: 2.5,
                          borderLeft: '3px solid #a78bfa',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Typography
                            variant="subtitle2"
                            sx={{ color: '#a78bfa', fontWeight: 700 }}
                          >
                            Phase {idx + 1}: {phase.title}
                          </Typography>
                          {phase.timeline && (
                            <Chip
                              label={phase.timeline}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(167, 139, 250, 0.15)',
                                color: '#a78bfa',
                                fontWeight: 500,
                                fontSize: '0.7rem',
                              }}
                            />
                          )}
                        </div>
                        <Typography
                          variant="body2"
                          sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}
                        >
                          {phase.description}
                        </Typography>
                      </Box>
                    ))}
                  </div>
                </ReportSection>
              </motion.div>
            )}

            {/* Generate New Report Button */}
            <motion.div variants={itemVariants} className="text-center pt-4">
              <motion.button
                onClick={generateReport}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="py-2.5 px-6 rounded-lg font-semibold text-white text-sm transition-all cursor-pointer"
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                }}
              >
                Generate New Report
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/** Reusable report section wrapper */
function ReportSection({ icon, title, children }) {
  return (
    <Box
      sx={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 3,
        p: 3,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
          {title}
        </Typography>
      </div>
      {children}
    </Box>
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

export default Boilerplate(AIReportPage);
