const fetch = require('node-fetch');
const DailyProblem = require('../Models/DailyProblem');
const { createAppError } = require('../middleware/errorHandler');

/**
 * Fetches problem details from Codeforces contest.standings API.
 * @param {number} contestId - The contest ID
 * @param {string} index - The problem index (e.g., "A", "B1")
 * @returns {Promise<{name: string, rating: number}>}
 */
const fetchProblemFromCF = async (contestId, index) => {
  let response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    response = await fetch(
      `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw createAppError(
        'EXTERNAL_SERVICE_UNAVAILABLE',
        'Codeforces API request timed out. Please try again later.'
      );
    }
    throw createAppError(
      'EXTERNAL_SERVICE_UNAVAILABLE',
      'Unable to reach Codeforces API. Please try again later.'
    );
  }

  const data = await response.json();

  if (data.status !== 'OK') {
    throw createAppError(
      'NOT_FOUND',
      `Contest with ID ${contestId} was not found on Codeforces.`
    );
  }

  const problems = data.result.problems || [];
  const problem = problems.find(
    (p) => p.index.toLowerCase() === index.toLowerCase()
  );

  if (!problem) {
    throw createAppError(
      'NOT_FOUND',
      `Problem with index "${index}" was not found in contest ${contestId}.`
    );
  }

  return {
    name: problem.name,
    rating: problem.rating || 0,
  };
};

/**
 * Sets the daily problem for today's UTC date.
 * Fetches problem details from CF, upserts the record, and enforces 7-record retention.
 * @param {number} contestId - The Codeforces contest ID
 * @param {string} index - The problem index (e.g., "A", "B1")
 * @returns {Promise<Object>} The upserted DailyProblem document
 */
const setDailyProblem = async (contestId, index) => {
  const { name, rating } = await fetchProblemFromCF(contestId, index);

  const todayStr = new Date().toISOString().split('T')[0];

  const problem = await DailyProblem.findOneAndUpdate(
    { date: todayStr },
    {
      contestId,
      index,
      name,
      rating,
      date: todayStr,
      platform: 'codeforces',
      url: `https://codeforces.com/contest/${contestId}/problem/${index}`,
    },
    { upsert: true, new: true }
  );

  // Enforce 7-record retention limit
  const totalCount = await DailyProblem.countDocuments();
  if (totalCount > 7) {
    const toKeep = await DailyProblem.find().sort({ date: -1 }).limit(7).select('_id');
    const keepIds = toKeep.map((doc) => doc._id);
    await DailyProblem.deleteMany({ _id: { $nin: keepIds } });
  }

  return problem;
};

/**
 * Gets today's daily problem by current UTC date.
 * @returns {Promise<Object|null>} The DailyProblem document for today, or null
 */
const getTodayProblem = async () => {
  const todayStr = new Date().toISOString().split('T')[0];
  return DailyProblem.findOne({ date: todayStr });
};

/**
 * Gets the last 7 daily problems ordered by date descending.
 * @returns {Promise<Array>} Array of DailyProblem documents
 */
const getHistory = async () => {
  return DailyProblem.find().sort({ date: -1 }).limit(7);
};

/**
 * Checks if a member has completed today's daily problem by querying the Codeforces API.
 * If solved, records the completion in the DailyProblem.completions array (avoiding duplicates).
 * @param {string} handle - The Codeforces handle to check
 * @param {string} memberId - The member's ObjectId
 * @returns {Promise<{solved: boolean, problem: Object, alreadyCompleted: boolean}>}
 */
const checkCompletion = async (handle, memberId) => {
  const problem = await getTodayProblem();

  if (!problem) {
    throw createAppError(
      'NOT_FOUND',
      'No daily problem has been set for today.'
    );
  }

  // Check if member already completed this problem
  const alreadyCompleted = problem.completions.some(
    (c) => c.memberId.toString() === memberId.toString()
  );

  if (alreadyCompleted) {
    return { solved: true, problem, alreadyCompleted: true };
  }

  const codeforcesService = require('./codeforcesService');
  const { solved } = await codeforcesService.checkProblemSolved(handle, problem.contestId, problem.index);

  if (solved) {
    await DailyProblem.findByIdAndUpdate(problem._id, {
      $push: { completions: { memberId, completedAt: new Date() } },
    });
  }

  return { solved, problem, alreadyCompleted: false };
};

/**
 * Directly sets a daily problem without fetching from Codeforces API.
 * Used for LeetCode problems or manually entered problems.
 * @param {{ name: string, url?: string, platform?: string, rating: number, contestId: number, index: string }} data
 * @returns {Promise<Object>} The upserted DailyProblem document
 */
const setDailyProblemDirect = async (data) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const problem = await DailyProblem.findOneAndUpdate(
    { date: todayStr },
    {
      contestId: data.contestId || 0,
      index: data.index || 'LC',
      name: data.name,
      rating: data.rating || 0,
      url: data.url || null,
      platform: data.platform || 'codeforces',
      date: todayStr,
    },
    { upsert: true, new: true }
  );

  // Enforce 7-record retention limit
  const totalCount = await DailyProblem.countDocuments();
  if (totalCount > 7) {
    const toKeep = await DailyProblem.find().sort({ date: -1 }).limit(7).select('_id');
    const keepIds = toKeep.map((doc) => doc._id);
    await DailyProblem.deleteMany({ _id: { $nin: keepIds } });
  }

  return problem;
};

module.exports = { setDailyProblem, setDailyProblemDirect, getTodayProblem, getHistory, fetchProblemFromCF, checkCompletion };
