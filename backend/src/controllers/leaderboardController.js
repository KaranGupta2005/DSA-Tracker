const leaderboardService = require('../services/leaderboardService');
const { createAppError } = require('../middleware/errorHandler');

/**
 * GET /api/leaderboard
 * Returns the leaderboard with all-time scores (default).
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await leaderboardService.getLeaderboard('all-time');
    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/filter?period=weekly|monthly|all-time
 * Returns the leaderboard filtered by a time period.
 */
const getFilteredLeaderboard = async (req, res, next) => {
  try {
    const { period } = req.query;
    const validPeriods = ['weekly', 'monthly', 'all-time'];

    if (period && !validPeriods.includes(period)) {
      throw createAppError(
        'VALIDATION_ERROR',
        `Invalid period "${period}". Must be one of: weekly, monthly, all-time.`
      );
    }

    const leaderboard = await leaderboardService.getLeaderboard(period || 'all-time');
    res.json({ leaderboard, period: period || 'all-time' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/leaderboard/sync/:memberId
 * Triggers recalculation of a member's activity score.
 */
const syncScore = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      throw createAppError('VALIDATION_ERROR', 'memberId parameter is required.');
    }

    const result = await leaderboardService.syncMemberScore(memberId);
    res.json({ message: 'Score synced successfully', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeaderboard, getFilteredLeaderboard, syncScore };
