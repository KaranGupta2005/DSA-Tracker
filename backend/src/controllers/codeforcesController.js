const codeforcesService = require('../services/codeforcesService');
const Member = require('../Models/Member');

/**
 * GET /api/codeforces/profile/:handle
 * Fetches the Codeforces profile (rating, rank, avatar) for the given handle.
 * Also persists updated rating/rank to the Member model if the requester owns the handle.
 */
const getProfile = async (req, res, next) => {
  try {
    const { handle } = req.params;
    const profile = await codeforcesService.getProfile(handle);

    // Persist rating/rank update if the logged-in user owns this handle
    if (req.user && req.user.memberId) {
      const member = await Member.findById(req.user.memberId);
      if (member && member.codeforcesHandle === handle) {
        member.codeforcesRating = profile.rating || member.codeforcesRating;
        member.codeforcesRank = profile.rank || member.codeforcesRank;
        await member.save();
      }
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/codeforces/contests/:handle
 * Fetches at most 5 most recent contest history entries for the given handle.
 */
const getContestHistory = async (req, res, next) => {
  try {
    const { handle } = req.params;
    const contests = await codeforcesService.getContestHistory(handle);
    res.json(contests);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/codeforces/check-problem
 * Checks if a specific handle has solved a given problem (contestId + index).
 */
const checkProblem = async (req, res, next) => {
  try {
    const { handle, contestId, index } = req.body;

    if (!handle || contestId == null || !index) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'handle, contestId, and index are required.',
          details: {},
        },
      });
    }

    const result = await codeforcesService.checkProblemSolved(
      handle,
      Number(contestId),
      index
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/codeforces/check-all
 * Checks problem completion for all active members (admin only).
 */
const checkAll = async (req, res, next) => {
  try {
    const { contestId, index } = req.body;

    if (contestId == null || !index) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'contestId and index are required.',
          details: {},
        },
      });
    }

    const results = await codeforcesService.checkAllMembers(
      Number(contestId),
      index
    );
    res.json(results);
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, getContestHistory, checkProblem, checkAll };
