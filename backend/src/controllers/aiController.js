const { generateReport } = require('../services/aiService');
const Member = require('../Models/Member');
const { createAppError } = require('../middleware/errorHandler');

/**
 * POST /api/ai/report
 * Generates an AI performance report for the authenticated member.
 * Fetches the member with their LeetCode stats, then calls generateReport.
 */
const getReport = async (req, res, next) => {
  try {
    const { memberId } = req.user;

    if (!memberId) {
      throw createAppError('AUTH_REQUIRED', 'Authentication is required.');
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

module.exports = { getReport };
