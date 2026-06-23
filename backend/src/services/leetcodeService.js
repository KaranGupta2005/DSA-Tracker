const fetch = require('node-fetch');
const { createAppError } = require('../middleware/errorHandler');

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

/**
 * Makes a GraphQL request to LeetCode with a 10-second timeout.
 * @param {string} query - GraphQL query string
 * @returns {Promise<object>} Parsed JSON response
 */
const leetcodeGraphQL = async (query) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response;
  try {
    response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw createAppError(
        'EXTERNAL_SERVICE_UNAVAILABLE',
        'LeetCode API request timed out. Please try again later.'
      );
    }
    throw createAppError(
      'EXTERNAL_SERVICE_UNAVAILABLE',
      'Unable to reach LeetCode API. Please try again later.'
    );
  }

  clearTimeout(timeout);
  const data = await response.json();
  return data;
};

/**
 * Verifies that a LeetCode username exists by calling the LeetCode GraphQL API.
 * @param {string} username - The LeetCode username to verify
 * @returns {Promise<{username: string, ranking: number|null}>}
 */
const verifyUsername = async (username) => {
  const query = `query {
    matchedUser(username: "${username}") {
      username
      profile {
        realName
        ranking
      }
    }
  }`;

  const data = await leetcodeGraphQL(query);

  if (!data.data || !data.data.matchedUser) {
    throw createAppError(
      'HANDLE_NOT_FOUND',
      'LeetCode username not found.'
    );
  }

  const user = data.data.matchedUser;

  return {
    username: user.username,
    ranking: user.profile?.ranking || null,
  };
};

/**
 * Fetches Easy/Medium/Hard solved counts for a LeetCode user.
 * @param {string} username - The LeetCode username
 * @returns {Promise<{easy: number, medium: number, hard: number, total: number}>}
 */
const getStats = async (username) => {
  const query = `query {
    matchedUser(username: "${username}") {
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }`;

  const data = await leetcodeGraphQL(query);

  if (!data.data || !data.data.matchedUser) {
    throw createAppError('HANDLE_NOT_FOUND', 'LeetCode username not found.');
  }

  const acStats = data.data.matchedUser.submitStatsGlobal.acSubmissionNum;
  const result = { easy: 0, medium: 0, hard: 0, total: 0 };

  for (const entry of acStats) {
    const difficulty = entry.difficulty.toLowerCase();
    if (difficulty === 'easy') result.easy = entry.count;
    else if (difficulty === 'medium') result.medium = entry.count;
    else if (difficulty === 'hard') result.hard = entry.count;
    else if (difficulty === 'all') result.total = entry.count;
  }

  // If 'All' wasn't provided, sum manually
  if (result.total === 0) {
    result.total = result.easy + result.medium + result.hard;
  }

  return result;
};

/**
 * Fetches tag-level problem counts for a LeetCode user.
 * Merges fundamental, intermediate, and advanced categories into a flat map.
 * @param {string} username - The LeetCode username
 * @returns {Promise<object>} Map of tagName → count
 */
const getTags = async (username) => {
  const query = `query {
    matchedUser(username: "${username}") {
      tagProblemCounts {
        advanced {
          tagName
          problemsSolved
        }
        intermediate {
          tagName
          problemsSolved
        }
        fundamental {
          tagName
          problemsSolved
        }
      }
    }
  }`;

  const data = await leetcodeGraphQL(query);

  if (!data.data || !data.data.matchedUser) {
    throw createAppError('HANDLE_NOT_FOUND', 'LeetCode username not found.');
  }

  const tagCounts = data.data.matchedUser.tagProblemCounts;
  const merged = {};

  const categories = ['fundamental', 'intermediate', 'advanced'];
  for (const category of categories) {
    const tags = tagCounts[category] || [];
    for (const tag of tags) {
      if (merged[tag.tagName]) {
        merged[tag.tagName] += tag.problemsSolved;
      } else {
        merged[tag.tagName] = tag.problemsSolved;
      }
    }
  }

  return merged;
};

/**
 * Fetches the 15 most recent accepted submissions for a LeetCode user.
 * @param {string} username - The LeetCode username
 * @returns {Promise<Array<{title: string, difficulty: string|null, date: string, language: string}>>}
 */
const getRecentSubmissions = async (username) => {
  const query = `query {
    recentAcSubmissionList(username: "${username}", limit: 15) {
      title
      titleSlug
      timestamp
      lang
      statusDisplay
    }
  }`;

  const data = await leetcodeGraphQL(query);

  if (!data.data || !data.data.recentAcSubmissionList) {
    throw createAppError('HANDLE_NOT_FOUND', 'LeetCode username not found.');
  }

  const submissions = data.data.recentAcSubmissionList;

  return submissions.map((sub) => ({
    title: sub.title,
    titleSlug: sub.titleSlug,
    difficulty: null, // Not available from this query directly
    date: new Date(parseInt(sub.timestamp, 10) * 1000).toISOString(),
    language: sub.lang,
  }));
};

/**
 * Fetches the submission calendar (date→count map) for a LeetCode user.
 * @param {string} username - The LeetCode username
 * @returns {Promise<object>} Object mapping Unix timestamps (seconds) to submission counts
 */
const getSubmissionCalendar = async (username) => {
  const query = `query {
    matchedUser(username: "${username}") {
      submissionCalendar
    }
  }`;

  const data = await leetcodeGraphQL(query);

  if (!data.data || !data.data.matchedUser) {
    throw createAppError('HANDLE_NOT_FOUND', 'LeetCode username not found.');
  }

  const calendarStr = data.data.matchedUser.submissionCalendar;

  if (!calendarStr) {
    return {};
  }

  try {
    return JSON.parse(calendarStr);
  } catch {
    return {};
  }
};

/**
 * Calculates the current streak from a submission calendar.
 * A streak is the number of consecutive UTC calendar days with count > 0
 * ending on or before the current UTC date.
 * @param {object} submissionCalendar - Object mapping Unix timestamps (seconds) to counts
 * @returns {number} The streak count
 */
const calculateStreak = (submissionCalendar) => {
  if (!submissionCalendar || typeof submissionCalendar !== 'object') {
    return 0;
  }

  // Convert Unix timestamp keys to UTC date strings (YYYY-MM-DD) and build a Set
  const datesWithSubmissions = new Set();

  for (const [timestamp, count] of Object.entries(submissionCalendar)) {
    if (count > 0) {
      const date = new Date(parseInt(timestamp, 10) * 1000);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
      datesWithSubmissions.add(dateStr);
    }
  }

  if (datesWithSubmissions.size === 0) {
    return 0;
  }

  // Start from today's UTC date and count backwards
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let streak = 0;
  let currentDate = new Date(todayStr + 'T00:00:00Z');

  // Check if today has submissions; if not, start from yesterday
  if (!datesWithSubmissions.has(todayStr)) {
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    const yesterdayStr = currentDate.toISOString().split('T')[0];
    if (!datesWithSubmissions.has(yesterdayStr)) {
      return 0;
    }
  }

  // Count consecutive days backwards
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (datesWithSubmissions.has(dateStr)) {
      streak++;
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Performs a full profile sync for a LeetCode user.
 * Fetches stats, tags, recent submissions, and streak.
 * Handles partial failures gracefully.
 * @param {string} username - The LeetCode username
 * @returns {Promise<{stats: object|null, tags: object|null, recentSubmissions: Array|null, streak: number|null, errors: Array<string>}>}
 */
const syncProfile = async (username) => {
  const result = {
    stats: null,
    tags: null,
    recentSubmissions: null,
    submissionCalendar: null,
    streak: null,
    errors: [],
  };

  // Fetch stats
  try {
    result.stats = await getStats(username);
  } catch (err) {
    result.errors.push(`stats: ${err.message}`);
  }

  // Fetch tags
  try {
    result.tags = await getTags(username);
  } catch (err) {
    result.errors.push(`tags: ${err.message}`);
  }

  // Fetch recent submissions
  try {
    result.recentSubmissions = await getRecentSubmissions(username);
  } catch (err) {
    result.errors.push(`recentSubmissions: ${err.message}`);
  }

  // Fetch submission calendar and calculate streak
  try {
    const calendar = await getSubmissionCalendar(username);
    result.submissionCalendar = calendar;
    result.streak = calculateStreak(calendar);
  } catch (err) {
    result.errors.push(`streak: ${err.message}`);
  }

  return result;
};

/**
 * Fetches the LeetCode contest rating for a user.
 * @param {string} username
 * @returns {Promise<{rating: number, attendedContests: number, globalRanking: number}>}
 */
const getContestRating = async (username) => {
  const query = `query {
    userContestRanking(username: "${username}") {
      rating
      attendedContestsCount
      globalRanking
    }
  }`;

  const data = await leetcodeGraphQL(query);

  if (!data.data || !data.data.userContestRanking) {
    return { rating: 0, attendedContests: 0, globalRanking: 0 };
  }

  const ranking = data.data.userContestRanking;
  return {
    rating: ranking.rating || 0,
    attendedContests: ranking.attendedContestsCount || 0,
    globalRanking: ranking.globalRanking || 0,
  };
};

module.exports = {
  verifyUsername,
  getStats,
  getTags,
  getRecentSubmissions,
  getSubmissionCalendar,
  calculateStreak,
  syncProfile,
  getContestRating,
};
