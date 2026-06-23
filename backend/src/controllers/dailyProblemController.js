const dailyProblemService = require('../services/dailyProblemService');
const { createAppError } = require('../middleware/errorHandler');

/**
 * POST /api/daily/set
 * Sets today's daily problem. Admin only.
 * Supports both Codeforces (contestId + index) and LeetCode (name + url + difficulty).
 */
const setProblem = async (req, res, next) => {
  try {
    const { contestId, index, platform, name, url, difficulty } = req.body;

    // If platform is 'leetcode', allow setting a LC problem directly
    if (platform === 'leetcode') {
      if (!name || !url) {
        throw createAppError(
          'VALIDATION_ERROR',
          'Problem name and URL are required for LeetCode problems.',
          { fields: ['name', 'url'] }
        );
      }

      const problem = await dailyProblemService.setDailyProblemDirect({
        name: name.trim(),
        url: url.trim(),
        platform: 'leetcode',
        rating: difficulty === 'Hard' ? 2000 : difficulty === 'Medium' ? 1400 : 800,
        contestId: 0,
        index: difficulty || 'Medium',
      });

      return res.status(200).json(problem);
    }

    // Default: Codeforces problem
    if (!contestId || !index) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Contest ID and problem index are required.',
        { fields: ['contestId', 'index'] }
      );
    }

    if (typeof contestId !== 'number' || contestId <= 0) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Contest ID must be a positive number.',
        { fields: ['contestId'] }
      );
    }

    if (typeof index !== 'string' || index.trim().length === 0) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Problem index must be a non-empty string.',
        { fields: ['index'] }
      );
    }

    const problem = await dailyProblemService.setDailyProblem(contestId, index.trim());

    res.status(200).json(problem);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/daily/today
 * Returns today's daily problem. Member access.
 */
const getToday = async (req, res, next) => {
  try {
    const problem = await dailyProblemService.getTodayProblem();

    if (!problem) {
      return res.status(200).json(null);
    }

    res.status(200).json(problem);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/daily/history
 * Returns the last 7 daily problems. Member access.
 */
const getHistory = async (req, res, next) => {
  try {
    const problems = await dailyProblemService.getHistory();
    res.status(200).json(problems);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/daily/check/:handle
 * Checks if the member has solved today's daily problem. Member access.
 */
const checkCompletion = async (req, res, next) => {
  try {
    const { handle } = req.params;

    if (!handle || handle.trim().length === 0) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Codeforces handle is required.',
        { fields: ['handle'] }
      );
    }

    const result = await dailyProblemService.checkCompletion(handle.trim(), req.user.memberId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { setProblem, getToday, getHistory, checkCompletion };
