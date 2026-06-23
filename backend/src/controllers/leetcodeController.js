const leetcodeService = require('../services/leetcodeService');

/**
 * Full profile sync handler.
 * GET /api/leetcode/sync/:username
 */
const sync = async (req, res, next) => {
  try {
    const { username } = req.params;
    const result = await leetcodeService.syncProfile(username);

    res.json({
      success: true,
      data: result,
      partialFailure: result.errors.length > 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get stats (Easy/Medium/Hard counts) handler.
 * GET /api/leetcode/stats/:username
 */
const getStats = async (req, res, next) => {
  try {
    const { username } = req.params;
    const stats = await leetcodeService.getStats(username);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get recent accepted submissions handler.
 * GET /api/leetcode/submissions/:username
 */
const getSubmissions = async (req, res, next) => {
  try {
    const { username } = req.params;
    const submissions = await leetcodeService.getRecentSubmissions(username);

    res.json({
      success: true,
      data: submissions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current streak handler.
 * GET /api/leetcode/streak/:username
 */
const getStreak = async (req, res, next) => {
  try {
    const { username } = req.params;
    const calendar = await leetcodeService.getSubmissionCalendar(username);
    const streak = leetcodeService.calculateStreak(calendar);

    res.json({
      success: true,
      data: { streak },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sync,
  getStats,
  getSubmissions,
  getStreak,
};
