const { generateReport } = require('../services/aiService');
const { generateTopicContent, generatePracticeQuestions } = require('../services/sessionPrepService');
const Member = require('../Models/Member');
const { createAppError } = require('../middleware/errorHandler');

/**
 * POST /api/ai/report
 * Generates an AI performance report for the authenticated member.
 * Fetches the member with their LeetCode stats, then calls generateReport.
 */
const getReport = async (req, res, next) => {
  try {
    const { memberId, role } = req.user;

    if (!memberId) {
      throw createAppError('AUTH_REQUIRED', 'Authentication is required.');
    }

    if (role === 'admin') {
      throw createAppError('FORBIDDEN', 'AI reports are only available for members. Please login as a member.');
    }

    const member = await Member.findById(memberId);

    if (!member) {
      throw createAppError('NOT_FOUND', 'Member not found.');
    }

    if (!member.leetcodeUsername) {
      throw createAppError(
        'INSUFFICIENT_DATA',
        'Please link your LeetCode account before generating a performance report.',
        { reason: 'no_leetcode_linked' }
      );
    }

    const report = await generateReport(member);

    res.json({
      report,
      generatedAt: new Date().toISOString(),
      memberId: member._id,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai/session/content
 * Generates AI-powered topic content (explanations, talking points, example code).
 * Body: { topic: string }
 * On AI unavailability, returns a message and retains previously generated content.
 */
const getSessionContent = async (req, res, next) => {
  try {
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Topic is required and must be a non-empty string.',
        { fields: ['topic'] }
      );
    }

    const content = await generateTopicContent(topic.trim());

    res.json({
      ...content,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // On AI unavailability, return friendly message suggesting to retain previously generated content
    if (err.code === 'AI_SERVICE_UNAVAILABLE') {
      return res.status(503).json({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'AI service is temporarily unavailable. Previously generated content has been retained. Please try again later.',
          details: { retainPrevious: true },
        },
      });
    }
    next(err);
  }
};

/**
 * POST /api/ai/session/questions
 * Generates AI-powered practice questions with model answers for a session topic.
 * Body: { topic: string }
 * On AI unavailability, returns a message and retains previously generated content.
 */
const getSessionQuestions = async (req, res, next) => {
  try {
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Topic is required and must be a non-empty string.',
        { fields: ['topic'] }
      );
    }

    const questions = await generatePracticeQuestions(topic.trim());

    res.json({
      ...questions,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // On AI unavailability, return friendly message suggesting to retain previously generated content
    if (err.code === 'AI_SERVICE_UNAVAILABLE') {
      return res.status(503).json({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'AI service is temporarily unavailable. Previously generated content has been retained. Please try again later.',
          details: { retainPrevious: true },
        },
      });
    }
    next(err);
  }
};

module.exports = { getReport, getSessionContent, getSessionQuestions };
