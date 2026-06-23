const fc = require('fast-check');
const { calculateActivityScore, getPeriodStartDate } = require('../../src/services/leaderboardService');

/**
 * Feature: ieee-dtu-dsa-tracker, Property 9: Activity score formula correctness
 * Feature: ieee-dtu-dsa-tracker, Property 10: Leaderboard ranking correctness
 * Feature: ieee-dtu-dsa-tracker, Property 11: Leaderboard time-period filter
 *
 * **Validates: Requirements 7.1, 7.2, 7.5**
 */

// ─── Pure functions for ranking logic ───────────────────────────────────────

/**
 * Ranks members by score descending, with ties broken by most recent lastSyncedAt.
 * @param {Array<{ score: number, lastSyncedAt: Date|string }>} members
 * @returns {Array} Sorted members
 */
function rankMembers(members) {
  return [...members].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.lastSyncedAt) - new Date(a.lastSyncedAt);
  });
}

/**
 * Filters activities to only those within the given period.
 * @param {Array<{ timestamp: Date }>} activities
 * @param {string} period - "weekly" | "monthly" | "all-time"
 * @returns {Array} Filtered activities
 */
function filterActivitiesByPeriod(activities, period) {
  const periodStart = getPeriodStartDate(period);
  if (periodStart === null) return activities; // all-time
  return activities.filter((a) => new Date(a.timestamp) >= periodStart);
}

// ─── Generators ─────────────────────────────────────────────────────────────

const nonNegIntArb = fc.integer({ min: 0, max: 1000 });

const statsArb = fc.record({
  problemsSolved: nonNegIntArb,
  streak: nonNegIntArb,
  contestsLast30Days: nonNegIntArb,
  dailyCompletions: nonNegIntArb,
});

const scoreArb = fc.integer({ min: 0, max: 10000 });

// Generate dates within a reasonable range (last year to now)
const recentDateArb = fc.date({
  min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  max: new Date(),
});

const memberArb = fc.record({
  score: scoreArb,
  lastSyncedAt: recentDateArb,
});

const memberListArb = fc.array(memberArb, { minLength: 0, maxLength: 50 });

const periodArb = fc.constantFrom('weekly', 'monthly', 'all-time');

// Activity with a timestamp within the last 60 days (covers weekly and monthly)
const activityArb = fc.record({
  timestamp: fc.date({
    min: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    max: new Date(),
  }),
  value: fc.integer({ min: 1, max: 10 }),
});

const activityListArb = fc.array(activityArb, { minLength: 0, maxLength: 30 });

// ─── Property 9: Activity Score Formula Correctness ─────────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 9: Activity score formula correctness', () => {
  test('Activity_Score equals (problems×1) + (streak×2) + (contests_30d×5) + (daily_completions×3) for any non-negative inputs', () => {
    fc.assert(
      fc.property(statsArb, (stats) => {
        const result = calculateActivityScore(stats);
        const expected =
          (stats.problemsSolved * 1) +
          (stats.streak * 2) +
          (stats.contestsLast30Days * 5) +
          (stats.dailyCompletions * 3);

        expect(result).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  test('Activity_Score is always non-negative for any non-negative inputs', () => {
    fc.assert(
      fc.property(statsArb, (stats) => {
        const result = calculateActivityScore(stats);
        expect(result).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 }
    );
  });

  test('Activity_Score is always an integer for integer inputs', () => {
    fc.assert(
      fc.property(statsArb, (stats) => {
        const result = calculateActivityScore(stats);
        expect(Number.isInteger(result)).toBe(true);
      }),
      { numRuns: 150 }
    );
  });

  test('Activity_Score is zero when all inputs are zero', () => {
    const result = calculateActivityScore({
      problemsSolved: 0,
      streak: 0,
      contestsLast30Days: 0,
      dailyCompletions: 0,
    });
    expect(result).toBe(0);
  });

  test('Activity_Score increases monotonically when any input increases', () => {
    fc.assert(
      fc.property(
        statsArb,
        fc.constantFrom('problemsSolved', 'streak', 'contestsLast30Days', 'dailyCompletions'),
        fc.integer({ min: 1, max: 100 }),
        (stats, field, increment) => {
          const baseScore = calculateActivityScore(stats);
          const increased = { ...stats, [field]: stats[field] + increment };
          const increasedScore = calculateActivityScore(increased);
          expect(increasedScore).toBeGreaterThan(baseScore);
        }
      ),
      { numRuns: 150 }
    );
  });
});

// ─── Property 10: Leaderboard Ranking Correctness ───────────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 10: Leaderboard ranking correctness', () => {
  test('leaderboard is ordered by score descending', () => {
    fc.assert(
      fc.property(memberListArb, (members) => {
        const ranked = rankMembers(members);

        for (let i = 1; i < ranked.length; i++) {
          expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
        }
      }),
      { numRuns: 200 }
    );
  });

  test('ties are broken by most recent lastSyncedAt (more recent ranks higher)', () => {
    fc.assert(
      fc.property(
        memberListArb.filter((members) => members.length >= 2),
        (members) => {
          const ranked = rankMembers(members);

          for (let i = 1; i < ranked.length; i++) {
            if (ranked[i - 1].score === ranked[i].score) {
              // Same score: earlier in the list should have more recent timestamp
              expect(new Date(ranked[i - 1].lastSyncedAt).getTime())
                .toBeGreaterThanOrEqual(new Date(ranked[i].lastSyncedAt).getTime());
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  test('ranking preserves all members (no members lost or duplicated)', () => {
    fc.assert(
      fc.property(memberListArb, (members) => {
        const ranked = rankMembers(members);
        expect(ranked.length).toBe(members.length);
      }),
      { numRuns: 150 }
    );
  });

  test('ranking does not mutate the original array', () => {
    fc.assert(
      fc.property(memberListArb, (members) => {
        const originalScores = members.map((m) => m.score);
        const originalTimestamps = members.map((m) => new Date(m.lastSyncedAt).getTime());
        rankMembers(members);
        // Verify scores and timestamps remain in same order
        expect(members.map((m) => m.score)).toEqual(originalScores);
        expect(members.map((m) => new Date(m.lastSyncedAt).getTime())).toEqual(originalTimestamps);
      }),
      { numRuns: 100 }
    );
  });

  test('a member with a strictly higher score always ranks above a member with a lower score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 1, max: 5000 }),
        recentDateArb,
        recentDateArb,
        (scoreA, gap, dateA, dateB) => {
          const scoreB = scoreA + gap; // B has higher score
          const members = [
            { score: scoreA, lastSyncedAt: dateA },
            { score: scoreB, lastSyncedAt: dateB },
          ];
          const ranked = rankMembers(members);
          expect(ranked[0].score).toBe(scoreB);
          expect(ranked[1].score).toBe(scoreA);
        }
      ),
      { numRuns: 150 }
    );
  });
});

// ─── Property 11: Leaderboard Time-Period Filter ────────────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 11: Leaderboard time-period filter', () => {
  test('"all-time" includes all activities regardless of timestamp', () => {
    fc.assert(
      fc.property(activityListArb, (activities) => {
        const filtered = filterActivitiesByPeriod(activities, 'all-time');
        expect(filtered.length).toBe(activities.length);
      }),
      { numRuns: 150 }
    );
  });

  test('"weekly" only includes activities from the last 7 days', () => {
    fc.assert(
      fc.property(activityListArb, (activities) => {
        const filtered = filterActivitiesByPeriod(activities, 'weekly');
        const periodStart = getPeriodStartDate('weekly');

        // Every included activity must be within the period
        for (const activity of filtered) {
          expect(new Date(activity.timestamp).getTime())
            .toBeGreaterThanOrEqual(periodStart.getTime());
        }

        // Every excluded activity must be before the period
        const excluded = activities.filter(
          (a) => !filtered.includes(a)
        );
        for (const activity of excluded) {
          expect(new Date(activity.timestamp).getTime())
            .toBeLessThan(periodStart.getTime());
        }
      }),
      { numRuns: 150 }
    );
  });

  test('"monthly" only includes activities from the last 30 days', () => {
    fc.assert(
      fc.property(activityListArb, (activities) => {
        const filtered = filterActivitiesByPeriod(activities, 'monthly');
        const periodStart = getPeriodStartDate('monthly');

        // Every included activity must be within the period
        for (const activity of filtered) {
          expect(new Date(activity.timestamp).getTime())
            .toBeGreaterThanOrEqual(periodStart.getTime());
        }

        // Every excluded activity must be before the period
        const excluded = activities.filter(
          (a) => !filtered.includes(a)
        );
        for (const activity of excluded) {
          expect(new Date(activity.timestamp).getTime())
            .toBeLessThan(periodStart.getTime());
        }
      }),
      { numRuns: 150 }
    );
  });

  test('getPeriodStartDate returns null for "all-time"', () => {
    expect(getPeriodStartDate('all-time')).toBeNull();
  });

  test('getPeriodStartDate("weekly") returns a date 6 days before today (7 days inclusive)', () => {
    const start = getPeriodStartDate('weekly');
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const expectedStart = new Date(todayUTC);
    expectedStart.setUTCDate(expectedStart.getUTCDate() - 6);

    expect(start.getTime()).toBe(expectedStart.getTime());
  });

  test('getPeriodStartDate("monthly") returns a date 29 days before today (30 days inclusive)', () => {
    const start = getPeriodStartDate('monthly');
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const expectedStart = new Date(todayUTC);
    expectedStart.setUTCDate(expectedStart.getUTCDate() - 29);

    expect(start.getTime()).toBe(expectedStart.getTime());
  });

  test('weekly period is strictly contained within monthly period', () => {
    fc.assert(
      fc.property(activityListArb, (activities) => {
        const weeklyFiltered = filterActivitiesByPeriod(activities, 'weekly');
        const monthlyFiltered = filterActivitiesByPeriod(activities, 'monthly');

        // Everything in weekly must also be in monthly
        for (const activity of weeklyFiltered) {
          expect(monthlyFiltered).toContain(activity);
        }

        // Monthly count >= weekly count
        expect(monthlyFiltered.length).toBeGreaterThanOrEqual(weeklyFiltered.length);
      }),
      { numRuns: 150 }
    );
  });

  test('for any period, filtered count <= total activity count', () => {
    fc.assert(
      fc.property(activityListArb, periodArb, (activities, period) => {
        const filtered = filterActivitiesByPeriod(activities, period);
        expect(filtered.length).toBeLessThanOrEqual(activities.length);
      }),
      { numRuns: 150 }
    );
  });
});
