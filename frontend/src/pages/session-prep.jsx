import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Checkbox,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  School as SchoolIcon,
  AutoAwesome as AIIcon,
  Quiz as QuizIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import Boilerplate from '@/components/Boilerplate';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function SessionPrepPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // State
  const [curriculum, setCurriculum] = useState([]);
  const [progress, setProgress] = useState({ completedModules: [], totalModules: 0, completionPercentage: 0 });
  const [timeline, setTimeline] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // AI content state per module
  const [generatedContent, setGeneratedContent] = useState({});
  const [generatedQuestions, setGeneratedQuestions] = useState({});
  const [loadingContent, setLoadingContent] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState({});
  const [aiError, setAiError] = useState('');

  // Expanded modules (to show content/questions)
  const [expandedModules, setExpandedModules] = useState({});

  // View mode: 'curriculum' or 'timeline'
  const [viewMode, setViewMode] = useState('curriculum');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [currRes, progRes, timeRes] = await Promise.all([
        api.get('/session-prep/curriculum').catch(() => null),
        api.get('/session-prep/progress').catch(() => null),
        api.get('/session-prep/timeline').catch(() => null),
      ]);

      if (currRes?.data) {
        setCurriculum(currRes.data.categories || currRes.data || []);
      }
      if (progRes?.data) {
        setProgress(progRes.data);
      }
      if (timeRes?.data) {
        setTimeline(timeRes.data.milestones || timeRes.data || []);
      }
    } catch (err) {
      setError('Failed to load session prep data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Check if a module is completed
  const isModuleCompleted = (moduleId) => {
    return progress.completedModules.some((m) => m.moduleId === moduleId);
  };

  // Toggle module completion
  const handleToggleComplete = async (moduleId) => {
    if (isModuleCompleted(moduleId)) return; // Already completed, no undo
    try {
      await api.post('/session-prep/complete', { moduleId });
      // Update local progress
      setProgress((prev) => {
        const newCompleted = [...prev.completedModules, { moduleId, completedAt: new Date().toISOString() }];
        const newPercentage = prev.totalModules > 0
          ? Math.round((newCompleted.length / prev.totalModules) * 100)
          : 0;
        return {
          ...prev,
          completedModules: newCompleted,
          completionPercentage: newPercentage,
        };
      });
    } catch (err) {
      setError('Failed to mark module as complete.');
    }
  };

  // Generate AI content for a topic
  const handleGenerateContent = async (moduleId, topic) => {
    setLoadingContent((prev) => ({ ...prev, [moduleId]: true }));
    setAiError('');
    try {
      const res = await api.post('/ai/session/content', { topic });
      setGeneratedContent((prev) => ({ ...prev, [moduleId]: res.data }));
      setExpandedModules((prev) => ({ ...prev, [moduleId]: true }));
    } catch (err) {
      if (err.response?.status === 503 || err.code === 'ECONNABORTED') {
        setAiError('AI service temporarily unavailable. Please try again later.');
      } else {
        setAiError('Failed to generate content. Please try again.');
      }
    } finally {
      setLoadingContent((prev) => ({ ...prev, [moduleId]: false }));
    }
  };

  // Generate practice questions for a topic
  const handleGenerateQuestions = async (moduleId, topic) => {
    setLoadingQuestions((prev) => ({ ...prev, [moduleId]: true }));
    setAiError('');
    try {
      const res = await api.post('/ai/session/questions', { topic });
      setGeneratedQuestions((prev) => ({ ...prev, [moduleId]: res.data }));
      setExpandedModules((prev) => ({ ...prev, [moduleId]: true }));
    } catch (err) {
      if (err.response?.status === 503 || err.code === 'ECONNABORTED') {
        setAiError('AI service temporarily unavailable. Please try again later.');
      } else {
        setAiError('Failed to generate questions. Please try again.');
      }
    } finally {
      setLoadingQuestions((prev) => ({ ...prev, [moduleId]: false }));
    }
  };

  // Toggle expanded state for a module
  const toggleExpanded = (moduleId) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  // Loading state
  if (authLoading || (!user && !error)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <CircularProgress sx={{ color: '#1976d2' }} />
      </div>
    );
  }

  const currentCategory = curriculum[activeTab] || null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Page Header */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <SchoolIcon sx={{ fontSize: 32, color: '#8b5cf6' }} />
                Session Prep
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                AI/ML session preparation — master topics to lead workshops by Sep 2026
              </Typography>
            </div>

            {/* View toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'curriculum' ? 'contained' : 'outlined'}
                size="small"
                startIcon={<SchoolIcon />}
                onClick={() => setViewMode('curriculum')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(viewMode === 'curriculum'
                    ? { background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }
                    : { color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.4)' }),
                }}
              >
                Curriculum
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'contained' : 'outlined'}
                size="small"
                startIcon={<TimelineIcon />}
                onClick={() => setViewMode('timeline')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(viewMode === 'timeline'
                    ? { background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }
                    : { color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.4)' }),
                }}
              >
                Timeline
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div variants={itemVariants} className="mb-6">
          <Box
            sx={{
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              p: 3,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                Overall Progress
              </Typography>
              <Typography variant="body2" sx={{ color: '#8b5cf6', fontWeight: 700 }}>
                {progress.completionPercentage}%
              </Typography>
            </div>
            <LinearProgress
              variant="determinate"
              value={progress.completionPercentage}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
                  borderRadius: 5,
                },
              }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, display: 'block' }}>
              {progress.completedModules.length} of {progress.totalModules} modules completed
            </Typography>
          </Box>
        </motion.div>

        {/* AI Error Alert */}
        <AnimatePresence>
          {aiError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert
                severity="warning"
                onClose={() => setAiError('')}
                sx={{
                  mb: 3,
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  color: '#ffb74d',
                }}
              >
                {aiError}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#8b5cf6' }} />
          </Box>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <>
            {viewMode === 'curriculum' && (
              <motion.div variants={itemVariants}>
                {/* Category Tabs */}
                {curriculum.length > 0 && (
                  <Box
                    sx={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 3,
                      mb: 3,
                    }}
                  >
                    <Tabs
                      value={activeTab}
                      onChange={(_, newValue) => setActiveTab(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{
                        px: 2,
                        '& .MuiTab-root': {
                          color: 'rgba(255,255,255,0.6)',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          minHeight: 56,
                        },
                        '& .Mui-selected': {
                          color: '#8b5cf6 !important',
                        },
                        '& .MuiTabs-indicator': {
                          backgroundColor: '#8b5cf6',
                          height: 3,
                          borderRadius: '3px 3px 0 0',
                        },
                      }}
                    >
                      {curriculum.map((category, index) => (
                        <Tab
                          key={category.id || index}
                          label={category.name || category.title || `Category ${index + 1}`}
                        />
                      ))}
                    </Tabs>
                  </Box>
                )}

                {/* Module List */}
                {currentCategory && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {(currentCategory.modules || []).map((module) => {
                      const moduleId = module.id || module._id;
                      const completed = isModuleCompleted(moduleId);
                      const isExpanded = expandedModules[moduleId];
                      const content = generatedContent[moduleId];
                      const questions = generatedQuestions[moduleId];
                      const isContentLoading = loadingContent[moduleId];
                      const isQuestionsLoading = loadingQuestions[moduleId];

                      return (
                        <Box
                          key={moduleId}
                          sx={{
                            background: 'rgba(15, 23, 42, 0.8)',
                            backdropFilter: 'blur(20px)',
                            border: completed
                              ? '1px solid rgba(139, 92, 246, 0.3)'
                              : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            transition: 'border-color 0.2s',
                            '&:hover': {
                              borderColor: 'rgba(139, 92, 246, 0.4)',
                            },
                          }}
                        >
                          {/* Module Header */}
                          <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Checkbox
                              checked={completed}
                              onChange={() => handleToggleComplete(moduleId)}
                              disabled={completed}
                              sx={{
                                color: 'rgba(255,255,255,0.3)',
                                '&.Mui-checked': { color: '#8b5cf6' },
                                '&.Mui-disabled': { color: completed ? '#8b5cf6' : undefined },
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  color: completed ? 'rgba(255,255,255,0.6)' : '#fff',
                                  fontWeight: 600,
                                  textDecoration: completed ? 'line-through' : 'none',
                                }}
                              >
                                {module.name || module.title}
                              </Typography>
                              {module.description && (
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                                  {module.description}
                                </Typography>
                              )}
                            </Box>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={isContentLoading ? <CircularProgress size={14} color="inherit" /> : <AIIcon />}
                                onClick={() => handleGenerateContent(moduleId, module.name || module.title)}
                                disabled={isContentLoading}
                                sx={{
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  color: '#a78bfa',
                                  borderColor: 'rgba(167, 139, 250, 0.3)',
                                  '&:hover': {
                                    borderColor: '#a78bfa',
                                    backgroundColor: 'rgba(167, 139, 250, 0.08)',
                                  },
                                }}
                              >
                                Generate Content
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={isQuestionsLoading ? <CircularProgress size={14} color="inherit" /> : <QuizIcon />}
                                onClick={() => handleGenerateQuestions(moduleId, module.name || module.title)}
                                disabled={isQuestionsLoading}
                                sx={{
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  color: '#22d3ee',
                                  borderColor: 'rgba(34, 211, 238, 0.3)',
                                  '&:hover': {
                                    borderColor: '#22d3ee',
                                    backgroundColor: 'rgba(34, 211, 238, 0.08)',
                                  },
                                }}
                              >
                                Practice Questions
                              </Button>

                              {/* Expand/collapse toggle */}
                              {(content || questions) && (
                                <IconButton
                                  size="small"
                                  onClick={() => toggleExpanded(moduleId)}
                                  sx={{ color: 'rgba(255,255,255,0.5)' }}
                                >
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              )}

                              {completed && (
                                <CheckIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
                              )}
                            </div>
                          </Box>

                          {/* Expanded Content */}
                          <Collapse in={isExpanded}>
                            <Box
                              sx={{
                                px: 3,
                                pb: 3,
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              {/* Generated Content */}
                              {content && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="subtitle2" sx={{ color: '#a78bfa', fontWeight: 700, mb: 1 }}>
                                    Generated Content
                                  </Typography>
                                  {content.explanation && (
                                    <Box sx={{ mb: 1.5 }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                        Explanation
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5, whiteSpace: 'pre-wrap' }}>
                                        {content.explanation}
                                      </Typography>
                                    </Box>
                                  )}
                                  {content.talkingPoints && (
                                    <Box sx={{ mb: 1.5 }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                        Talking Points
                                      </Typography>
                                      <ul className="mt-1 space-y-1 list-disc list-inside">
                                        {(Array.isArray(content.talkingPoints) ? content.talkingPoints : [content.talkingPoints]).map((point, i) => (
                                          <li key={i}>
                                            <Typography variant="body2" component="span" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                              {point}
                                            </Typography>
                                          </li>
                                        ))}
                                      </ul>
                                    </Box>
                                  )}
                                  {content.code && (
                                    <Box sx={{ mb: 1.5 }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                        Example Code
                                      </Typography>
                                      <Box
                                        component="pre"
                                        sx={{
                                          mt: 0.5,
                                          p: 2,
                                          borderRadius: 1,
                                          backgroundColor: 'rgba(0,0,0,0.4)',
                                          border: '1px solid rgba(255,255,255,0.08)',
                                          overflow: 'auto',
                                          fontSize: '0.8rem',
                                          color: '#e2e8f0',
                                          fontFamily: 'monospace',
                                        }}
                                      >
                                        {content.code}
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                              )}

                              {/* Generated Questions */}
                              {questions && (
                                <Box sx={{ mt: content ? 2 : 2 }}>
                                  <Typography variant="subtitle2" sx={{ color: '#22d3ee', fontWeight: 700, mb: 1 }}>
                                    Practice Questions
                                  </Typography>
                                  <div className="space-y-3">
                                    {(questions.questions || questions || []).map((q, i) => (
                                      <Box
                                        key={i}
                                        sx={{
                                          p: 2,
                                          borderRadius: 1.5,
                                          backgroundColor: 'rgba(34, 211, 238, 0.05)',
                                          border: '1px solid rgba(34, 211, 238, 0.15)',
                                        }}
                                      >
                                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>
                                          Q{i + 1}: {q.question || q.text || q}
                                        </Typography>
                                        {(q.answer || q.modelAnswer) && (
                                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
                                            <strong style={{ color: '#22d3ee' }}>Answer:</strong>{' '}
                                            {q.answer || q.modelAnswer}
                                          </Typography>
                                        )}
                                      </Box>
                                    ))}
                                  </div>
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </motion.div>
                )}

                {/* Empty curriculum state */}
                {curriculum.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 8, color: 'rgba(255,255,255,0.5)' }}>
                    <SchoolIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" sx={{ color: 'inherit' }}>
                      No curriculum available
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'inherit', mt: 1 }}>
                      The session prep curriculum has not been set up yet.
                    </Typography>
                  </Box>
                )}
              </motion.div>
            )}

            {/* Timeline View */}
            {viewMode === 'timeline' && (
              <motion.div
                variants={itemVariants}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Box
                  sx={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    p: 3,
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ color: '#8b5cf6' }} />
                    Milestone Timeline — Through September 2026
                  </Typography>

                  {timeline.length > 0 ? (
                    <div className="relative">
                      {/* Vertical line */}
                      <div
                        className="absolute left-4 top-0 bottom-0 w-0.5"
                        style={{ backgroundColor: 'rgba(139, 92, 246, 0.3)' }}
                      />

                      <div className="space-y-6">
                        {timeline.map((milestone, index) => {
                          const milestoneDate = new Date(milestone.date || milestone.month);
                          const isPast = milestoneDate < new Date();

                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="relative pl-10"
                            >
                              {/* Timeline dot */}
                              <div
                                className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2"
                                style={{
                                  backgroundColor: isPast ? '#8b5cf6' : 'transparent',
                                  borderColor: '#8b5cf6',
                                }}
                              />

                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  backgroundColor: isPast
                                    ? 'rgba(139, 92, 246, 0.08)'
                                    : 'rgba(255,255,255,0.03)',
                                  border: isPast
                                    ? '1px solid rgba(139, 92, 246, 0.2)'
                                    : '1px solid rgba(255,255,255,0.06)',
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <Typography variant="body2" sx={{ color: '#8b5cf6', fontWeight: 700 }}>
                                    {milestoneDate.toLocaleDateString(undefined, {
                                      month: 'long',
                                      year: 'numeric',
                                    })}
                                  </Typography>
                                  {isPast && (
                                    <Chip
                                      label="Completed"
                                      size="small"
                                      sx={{
                                        backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                        color: '#a78bfa',
                                        fontSize: '0.65rem',
                                        height: 20,
                                      }}
                                    />
                                  )}
                                </div>
                                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                                  {milestone.title || milestone.name}
                                </Typography>
                                {milestone.description && (
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
                                    {milestone.description}
                                  </Typography>
                                )}
                              </Box>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'rgba(255,255,255,0.5)' }}>
                      <TimelineIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" sx={{ color: 'inherit' }}>
                        No milestones available
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'inherit', mt: 1 }}>
                        Timeline milestones have not been configured yet.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

export default Boilerplate(SessionPrepPage);
