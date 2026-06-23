const fetch = require('node-fetch');
const { createAppError } = require('../middleware/errorHandler');

/**
 * Verifies that a Codeforces handle exists by calling the user.info API endpoint.
 * @param {string} handle - The Codeforces handle to verify
 * @returns {Promise<{handle: string, rating: number|null, rank: string, avatar: string}>}
 */
const verifyHandle = async (handle) => {
  let response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    response = await fetch(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
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
      'HANDLE_NOT_FOUND',
      `Codeforces handle "${handle}" was not found.`
    );
  }

  const user = data.result[0];

  return {
    handle: user.handle,
    rating: user.rating || null,
    rank: user.rank || 'Unrated',
    avatar: user.avatar || '',
  };
};

/**
 * Fetches the Codeforces profile for a given handle (rating, rank, avatar).
 * Returns "Unrated" rank and null rating if the user is unrated.
 * @param {string} handle - The Codeforces handle
 * @returns {Promise<{handle: string, rating: number|null, rank: string, avatar: string}>}
 */
const getProfile = async (handle) => {
  let response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    response = await fetch(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
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
      'HANDLE_NOT_FOUND',
      `Codeforces handle "${handle}" was not found.`
    );
  }

  const user = data.result[0];

  return {
    handle: user.handle,
    rating: user.rating || null,
    rank: user.rank || 'Unrated',
    avatar: user.avatar || '',
  };
};

/**
 * Fetches the contest history for a given handle from Codeforces user.rating endpoint.
 * Returns at most 5 most recent contests in reverse chronological order.
 * @param {string} handle - The Codeforces handle
 * @returns {Promise<Array<{contestName: string, contestId: number, rank: number, oldRating: number, newRating: number, timestamp: number}>>}
 */
const getContestHistory = async (handle) => {
  let response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    response = await fetch(
      `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`,
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
      'HANDLE_NOT_FOUND',
      `Codeforces handle "${handle}" was not found.`
    );
  }

  const contests = data.result || [];

  // Sort by ratingUpdateTimeSeconds descending (most recent first)
  const sorted = [...contests].sort(
    (a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds
  );

  // Return at most 5 most recent entries
  return sorted.slice(0, 5).map((entry) => ({
    contestName: entry.contestName,
    contestId: entry.contestId,
    rank: entry.rank,
    oldRating: entry.oldRating,
    newRating: entry.newRating,
    timestamp: entry.ratingUpdateTimeSeconds,
  }));
};

/**
 * Checks if a given handle has solved a specific problem (contestId + index).
 * Queries the user.status endpoint with at most 1000 submissions and checks
 * for verdict "OK" with matching contestId and case-insensitive index.
 * @param {string} handle - The Codeforces handle
 * @param {number} contestId - The contest ID
 * @param {string} index - The problem index (e.g., "A", "B1")
 * @returns {Promise<{solved: boolean, handle: string, contestId: number, index: string}>}
 */
const checkProblemSolved = async (handle, contestId, index) => {
  let response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    response = await fetch(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&count=1000`,
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
      'HANDLE_NOT_FOUND',
      `Codeforces handle "${handle}" was not found.`
    );
  }

  const submissions = data.result || [];

  const solved = submissions.some(
    (sub) =>
      sub.verdict === 'OK' &&
      sub.problem.contestId === contestId &&
      sub.problem.index.toLowerCase() === index.toLowerCase()
  );

  return { solved, handle, contestId, index };
};

/**
 * Checks problem completion for all active members sequentially with a 250ms delay
 * between API calls to respect Codeforces rate limits.
 * @param {number} contestId - The contest ID
 * @param {string} index - The problem index (e.g., "A", "B1")
 * @returns {Promise<Array<{handle: string, solved: boolean}>>}
 */
const checkAllMembers = async (contestId, index) => {
  const Member = require('../Models/Member');
  const members = await Member.find({ status: 'active' });

  const results = [];

  for (const member of members) {
    try {
      const result = await checkProblemSolved(member.codeforcesHandle, contestId, index);
      results.push({ handle: member.codeforcesHandle, solved: result.solved });
    } catch (err) {
      // If a single member check fails (e.g., handle not found), record as not solved
      results.push({ handle: member.codeforcesHandle, solved: false });
    }

    // 250ms delay between sequential API calls
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return results;
};

module.exports = { verifyHandle, getProfile, getContestHistory, checkProblemSolved, checkAllMembers };
