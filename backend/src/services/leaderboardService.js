const Member = require('../Models/Member');
const DailyProblem = require('../Models/DailyProblem');

/**
 * Calculates the activity score using the weighted formula.
 * Pure function — exported for direct property testing.
 *
 * Formula: (problems × 1) + (streak × 2) + (contests_30d × 5) + (daily_completions × 3)
 *
 * @param {{ problemsSolved: number, streak: number, contestsLast30Days: number, dailyCompletions: number }} stats
 * @returns {number} Non-negative integer activity score
 */
const calculateActivityScore = (stats) => {
  const problemsSolved = Math.max(0, Math.floor(Number(stats.problemsSolved) || 0));
  const streak = Math.max(0, Math.floor(Number(stats.streak) || 0));
  const contestsLast30Days = Math.max(0, Math.floor(Number(stats.contestsLast30Days) || 0));
  const dailyCompletions = Math.max(0, Math.floor(Number(stats.dailyCompletions) || 0));

  return (problemsSolved * 1) + (streak * 2) + (contestsLast30Days * 5) + (dailyCompletions * 3);
};

/**
 * Computes the start date boundary for a given period filter.
 * @param {string} period - "weekly" | "monthly" | "all-time"
 * @returns {Date|null} The earliest date to include, or null for all-time
 */
const getPeriodStartDate = (period) => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (period) {
    case 'weekly': {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 6); // last 7 days including today
      return start;
    }
    case 'monthly': {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 29); // last 30 days including today
      return start;
    }
    case 'all-time':
    default:
      return null;
  }
};

/**
 * Gets the stats for a member for a given period.
 * @param {object} member - Member document from MongoDB
 * @param {string} period - "weekly" | "monthly" | "all-time"
 * @returns {Promise<{ problemsSolved: number, streak: number, contestsLast30Days: number, dailyCompletions: number }>}
 */
const getMemberStats = async (member, period) => {
  const periodStart = getPeriodStartDate(period);

  // Total problems solved: CF rating-derived problems + LC total
  // Since we don't track daily problem counts historically, use total for all periods
  // CF contribution: we use codeforcesRating as a proxy is not ideal;
  // The real "problems solved" comes from the member's tracked data.
  // Using LeetCode stats (easy + medium + hard) + CF total (we don't store CF solved count directly).
  // For now, CF problems can be approximated from contest participation or stored separately.
  // Based on the Member schema, we have leetcodeStats but no cfProblemsSolved field.
  // The design says "total problems solved across Codeforces and LeetCode"
  // LC: easy + medium + hard; CF: not directly stored, so we use 0 for CF-only problems.
  // A more complete implementation would track this. For now, LC stats serve as the primary source.
  const lcTotal = (member.leetcodeStats?.easy || 0) +
    (member.leetcodeStats?.medium || 0) +
    (member.leetcodeStats?.hard || 0);

  // If LeetCode not linked, LC components contribute 0
  const problemsSolved = member.leetcodeUsername ? lcTotal : 0;

  // Current streak from member record
  const streak = member.currentStreak || 0;

  // Contests in the last 30 days: check contest history
  // Since we don't store contest participation timestamps in the Member schema directly,
  // and the codeforcesService.getContestHistory fetches from the API,
  // we'll count based on lastSyncedAt for simplification.
  // A more complete implementation would store contest timestamps.
  // For period filtering, we use a simplified approach.
  let contestsLast30Days = 0;
  // This would normally query contest history; simplified to 0 for now
  // since contest participation tracking isn't persisted in the Member model.

  // Daily problem completions within the period
  let dailyCompletions = 0;
  const query = {};
  if (periodStart) {
    query.date = { $gte: periodStart.toISOString().split('T')[0] };
  }

  const dailyProblems = await DailyProblem.find(query);
  for (const dp of dailyProblems) {
    const completion = dp.completions.find(
      (c) => c.memberId && c.memberId.toString() === member._id.toString()
    );
    if (completion) {
      // If period filtering by completedAt timestamp
      if (periodStart && completion.completedAt) {
        if (new Date(completion.completedAt) >= periodStart) {
          dailyCompletions++;
        }
      } else {
        dailyCompletions++;
      }
    }
  }

  return {
    problemsSolved,
    streak,
    contestsLast30Days,
    dailyCompletions,
  };
};

/**
 * Gets the leaderboard for a given period.
 * Fetches all active members, calculates scores, sorts by score descending
 * with tie-breaking by most recent submission timestamp (lastSyncedAt).
 *
 * @param {string} period - "weekly" | "monthly" | "all-time"
 * @returns {Promise<Array<{ rank: number, memberId: string, handle: string, score: number, problemsSolved: number, streak: number }>>}
 */
const getLeaderboard = async (period = 'all-time') => {
  const members = await Member.find({ status: 'active' });

  const scored = [];

  for (const member of members) {
    const stats = await getMemberStats(member, period);
    const score = calculateActivityScore(stats);

    scored.push({
      memberId: member._id.toString(),
      codeforcesHandle: member.codeforcesHandle,
      handle: member.codeforcesHandle,
      leetcodeUsername: member.leetcodeUsername || null,
      codeforcesRating: member.codeforcesRating || 0,
      codeforcesRank: member.codeforcesRank || 'Unrated',
      leetcodeStats: member.leetcodeStats || { easy: 0, medium: 0, hard: 0 },
      score,
      activityScore: score,
      problemsSolved: stats.problemsSolved,
      totalProblems: stats.problemsSolved,
      streak: stats.streak,
      currentStreak: stats.streak,
      lastSyncedAt: member.lastSyncedAt || new Date(0),
    });
  }

  // Sort by score descending; tie-break by lastSyncedAt (more recent = higher rank)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.lastSyncedAt) - new Date(a.lastSyncedAt);
  });

  // Assign ranks
  return scored.map((entry, index) => ({
    rank: index + 1,
    memberId: entry.memberId,
    codeforcesHandle: entry.codeforcesHandle,
    handle: entry.handle,
    leetcodeUsername: entry.leetcodeUsername,
    codeforcesRating: entry.codeforcesRating,
    codeforcesRank: entry.codeforcesRank,
    leetcodeStats: entry.leetcodeStats,
    score: entry.score,
    activityScore: entry.activityScore,
    problemsSolved: entry.problemsSolved,
    totalProblems: entry.totalProblems,
    streak: entry.streak,
    currentStreak: entry.currentStreak,
  }));
};

/**
 * Recalculates and persists the activity score for a single member.
 * @param {string} memberId - The member's MongoDB ObjectId
 * @returns {Promise<{ memberId: string, score: number }>}
 */
const syncMemberScore = async (memberId) => {
  const member = await Member.findById(memberId);
  if (!member) {
    const { createAppError } = require('../middleware/errorHandler');
    throw createAppError('NOT_FOUND', `Member with ID "${memberId}" not found.`);
  }

  const stats = await getMemberStats(member, 'all-time');
  const score = calculateActivityScore(stats);

  member.activityScore = score;
  member.lastSyncedAt = new Date();
  await member.save();

  return { memberId: member._id.toString(), score };
};

module.exports = {
  calculateActivityScore,
  getPeriodStartDate,
  getMemberStats,
  getLeaderboard,
  syncMemberScore,
};
