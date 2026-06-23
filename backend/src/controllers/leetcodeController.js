const leetcodeService = require('../services/leetcodeService');
const Member = require('../Models/Member');

/**
 * Full profile sync handler.
 * GET /api/leetcode/sync/:username
 * Also persists the stats to the Member document for leaderboard use.
 */
const sync = async (req, res, next) => {
  try {
    const { username } = req.params;
    const result = await leetcodeService.syncProfile(username);

    // Persist stats to the Member model so leaderboard can use them
    if (req.user && req.user.memberId && result.stats) {
      const updateData = {
        leetcodeStats: {
          easy: result.stats.easy || 0,
          medium: result.stats.medium || 0,
          hard: result.stats.hard || 0,
          tags: result.tags || {},
        },
        currentStreak: result.streak || 0,
        lastSyncedAt: new Date(),
      };

      // Fetch LC contest rating if available
      try {
        const lcRatingData = await leetcodeService.getContestRating(username);
        if (lcRatingData && lcRatingData.rating) {
          updateData.leetcodeRating = Math.round(lcRatingData.rating);
        }
      } catch (e) {
        // LC rating fetch is optional — don't fail the sync
      }

      await Member.findByIdAndUpdate(req.user.memberId, updateData);
    }

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
