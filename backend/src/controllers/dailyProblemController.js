const dailyProblemService = require('../services/dailyProblemService');
const { createAppError } = require('../middleware/errorHandler');

/**
 * POST /api/daily/set
 * Sets today's daily problem. Admin only.
 */
const setProblem = async (req, res, next) => {
  try {
    const { contestId, index } = req.body;

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

module.exports = { setProblem, getToday, getHistory };
