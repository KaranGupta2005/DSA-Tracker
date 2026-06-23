const fetch = require('node-fetch');
const ContestCache = require('../Models/ContestCache');
const Member = require('../Models/Member');

const CF_CONTEST_LIST_URL = 'https://codeforces.com/api/contest.list';
const CACHE_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches upcoming contests from the Codeforces API.
 * Filters to future contests (phase === 'BEFORE'), sorts ascending by start time, limits to 10.
 */
async function fetchCodeforcesContests() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(CF_CONTEST_LIST_URL, { signal: controller.signal });
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error('Codeforces API returned non-OK status');
    }

    const futureContests = data.result
      .filter((contest) => contest.phase === 'BEFORE')
      .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
      .slice(0, 10)
      .map((contest) => ({
        name: contest.name,
        startTime: new Date(contest.startTimeSeconds * 1000),
        duration: contest.durationSeconds,
        url: `https://codeforces.com/contest/${contest.id}`,
      }));

    return futureContests;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generates upcoming LeetCode contests programmatically.
 * LeetCode Weekly Contest: every Saturday at 2:30 AM UTC (next 4 upcoming).
 * LeetCode Biweekly Contest: every other Saturday at 2:30 PM UTC.
 * Returns up to 4 upcoming contests sorted by start time ascending.
 */
function fetchLeetcodeContests() {
  const now = new Date();
  const contests = [];

  // LeetCode Weekly Contest starts every Sunday at 2:30 AM UTC
  // Weekly Contest numbering: Contest 100 was on 2018-09-02
  // We'll generate upcoming ones relative to now
  const weeklyBaseDate = new Date('2024-01-07T02:30:00Z'); // A known Sunday
  const weeklyBaseNumber = 379; // Contest number for that date

  // Find next upcoming weekly contest
  let nextWeekly = new Date(weeklyBaseDate);
  while (nextWeekly <= now) {
    nextWeekly.setDate(nextWeekly.getDate() + 7);
  }

  // Calculate contest number
  const weeksDiff = Math.round((nextWeekly - weeklyBaseDate) / (7 * 24 * 60 * 60 * 1000));
  let weeklyNumber = weeklyBaseNumber + weeksDiff;

  // Generate next 4 weekly contests
  for (let i = 0; i < 4; i++) {
    const contestDate = new Date(nextWeekly);
    contestDate.setDate(contestDate.getDate() + i * 7);
    contests.push({
      name: `Weekly Contest ${weeklyNumber + i}`,
      startTime: contestDate,
      duration: 5400, // 1.5 hours
      url: `https://leetcode.com/contest/weekly-contest-${weeklyNumber + i}`,
    });
  }

  // LeetCode Biweekly Contest: every other Saturday at 2:30 PM UTC
  const biweeklyBaseDate = new Date('2024-01-06T14:30:00Z'); // A known Saturday
  const biweeklyBaseNumber = 121; // Contest number for that date

  let nextBiweekly = new Date(biweeklyBaseDate);
  while (nextBiweekly <= now) {
    nextBiweekly.setDate(nextBiweekly.getDate() + 14);
  }

  const biweeksDiff = Math.round((nextBiweekly - biweeklyBaseDate) / (14 * 24 * 60 * 60 * 1000));
  let biweeklyNumber = biweeklyBaseNumber + biweeksDiff;

  // Generate next 2 biweekly contests
  for (let i = 0; i < 2; i++) {
    const contestDate = new Date(nextBiweekly);
    contestDate.setDate(contestDate.getDate() + i * 14);
    contests.push({
      name: `Biweekly Contest ${biweeklyNumber + i}`,
      startTime: contestDate,
      duration: 5400, // 1.5 hours
      url: `https://leetcode.com/contest/biweekly-contest-${biweeklyNumber + i}`,
    });
  }

  // Sort all contests ascending by start time and limit to 4
  return contests
    .sort((a, b) => a.startTime - b.startTime)
    .slice(0, 4);
}

/**
 * Fetches upcoming contests from both Codeforces and LeetCode.
 * Uses caching: on success updates cache, on failure serves cached data with staleness indicator.
 * If cache > 24h and fresh data unavailable, includes a warning.
 */
async function getUpcomingContests() {
  let cfContests = null;
  let lcContests = null;
  let cfFetchFailed = false;
  let lcFetchFailed = false;

  // Attempt to fetch fresh Codeforces contests
  try {
    cfContests = await fetchCodeforcesContests();
    // Update cache on success
    await ContestCache.findOneAndUpdate(
      { platform: 'codeforces' },
      { platform: 'codeforces', contests: cfContests, lastFetchedAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (err) {
    cfFetchFailed = true;
  }

  // Fetch LeetCode contests (programmatic, no network call)
  try {
    lcContests = fetchLeetcodeContests();
    // Update cache on success
    await ContestCache.findOneAndUpdate(
      { platform: 'leetcode' },
      { platform: 'leetcode', contests: lcContests, lastFetchedAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (err) {
    lcFetchFailed = true;
  }

  // If any fetch failed, serve cached data
  let cfCache = null;
  let lcCache = null;

  if (cfFetchFailed) {
    cfCache = await ContestCache.findOne({ platform: 'codeforces' });
    if (cfCache) {
      cfContests = cfCache.contests;
    }
  }

  if (lcFetchFailed) {
    lcCache = await ContestCache.findOne({ platform: 'leetcode' });
    if (lcCache) {
      lcContests = lcCache.contests;
    }
  }

  // Determine staleness
  const now = new Date();
  let stale = cfFetchFailed || lcFetchFailed;
  let staleWarning = null;
  let lastFetchedAt = now;

  if (stale) {
    // Find the oldest cache timestamp
    const caches = [cfCache, lcCache].filter(Boolean);
    if (caches.length > 0) {
      const oldestFetch = caches.reduce(
        (oldest, cache) => (cache.lastFetchedAt < oldest ? cache.lastFetchedAt : oldest),
        caches[0].lastFetchedAt
      );
      lastFetchedAt = oldestFetch;

      const ageMs = now - oldestFetch;
      if (ageMs > CACHE_STALE_THRESHOLD_MS) {
        staleWarning = 'Contest information may be outdated. Data was last fetched more than 24 hours ago.';
      }
    } else {
      // No cache available at all
      lastFetchedAt = null;
      staleWarning = 'Contest data is unavailable. Unable to fetch from external services and no cached data exists.';
    }
  }

  return {
    contests: {
      codeforces: cfContests || [],
      leetcode: lcContests || [],
    },
    lastFetchedAt,
    stale,
    staleWarning,
  };
}

/**
 * Saves a member's push notification subscription.
 * @param {string} memberId - The member's ID
 * @param {object} subscription - The push subscription object from the client
 */
async function subscribeMember(memberId, subscription) {
  await Member.findByIdAndUpdate(memberId, { pushSubscription: subscription });
}

// Exported pure filtering functions for property-based testing
/**
 * Filters and sorts contests from a raw Codeforces API response.
 * @param {Array} contests - Raw contest objects with phase and startTimeSeconds
 * @param {Date} now - The current time reference
 * @returns {Array} Filtered, sorted, and limited contest list
 */
function filterCodeforcesContests(contests, now) {
  return contests
    .filter((contest) => contest.phase === 'BEFORE' && new Date(contest.startTimeSeconds * 1000) > now)
    .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
    .slice(0, 10)
    .map((contest) => ({
      name: contest.name,
      startTime: new Date(contest.startTimeSeconds * 1000),
      duration: contest.durationSeconds,
      url: `https://codeforces.com/contest/${contest.id}`,
    }));
}

/**
 * Filters and sorts LeetCode contests for only future ones.
 * @param {Array} contests - Contest objects with startTime as Date
 * @param {Date} now - The current time reference
 * @returns {Array} Filtered, sorted, and limited contest list
 */
function filterLeetcodeContests(contests, now) {
  return contests
    .filter((contest) => contest.startTime > now)
    .sort((a, b) => a.startTime - b.startTime)
    .slice(0, 4);
}

module.exports = {
  fetchCodeforcesContests,
  fetchLeetcodeContests,
  getUpcomingContests,
  subscribeMember,
  filterCodeforcesContests,
  filterLeetcodeContests,
};
