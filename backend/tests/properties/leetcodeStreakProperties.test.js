const fc = require('fast-check');
const { calculateStreak } = require('../../src/services/leetcodeService');

/**
 * Feature: ieee-dtu-dsa-tracker, Property 5: LeetCode streak calculation
 *
 * For any submission calendar (date→count map), the calculated streak equals the count
 * of consecutive UTC calendar days ending on/before current UTC date with count > 0.
 * A gap breaks the streak.
 *
 * **Validates: Requirements 4.4**
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the start-of-day UTC timestamp (in seconds) for a given day offset from today.
 * @param {number} daysAgo - Number of days before today (0 = today)
 * @returns {number} Unix timestamp in seconds
 */
function getTimestampForDaysAgo(daysAgo) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // today UTC YYYY-MM-DD
  const todayStart = new Date(dateStr + 'T00:00:00Z');
  todayStart.setUTCDate(todayStart.getUTCDate() - daysAgo);
  return Math.floor(todayStart.getTime() / 1000);
}

/**
 * Builds a submission calendar object from an array of { daysAgo, count } entries.
 * @param {Array<{daysAgo: number, count: number}>} entries
 * @returns {object} Calendar mapping timestamp strings to counts
 */
function buildCalendar(entries) {
  const calendar = {};
  for (const { daysAgo, count } of entries) {
    const ts = getTimestampForDaysAgo(daysAgo);
    calendar[String(ts)] = count;
  }
  return calendar;
}

/**
 * Reference implementation of streak calculation for verification.
 * Matches the actual implementation's behavior: if today has no submissions,
 * start counting from yesterday.
 * @param {object} calendar - submission calendar
 * @returns {number} Expected streak
 */
function referenceStreak(calendar) {
  if (!calendar || typeof calendar !== 'object') return 0;

  // Build set of date strings that have submissions
  const datesWithSubmissions = new Set();
  for (const [timestamp, count] of Object.entries(calendar)) {
    if (count > 0) {
      const date = new Date(parseInt(timestamp, 10) * 1000);
      const dateStr = date.toISOString().split('T')[0];
      datesWithSubmissions.add(dateStr);
    }
  }

  if (datesWithSubmissions.size === 0) return 0;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  let currentDate = new Date(todayStr + 'T00:00:00Z');

  // If today has no submissions, start from yesterday
  if (!datesWithSubmissions.has(todayStr)) {
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    const yesterdayStr = currentDate.toISOString().split('T')[0];
    if (!datesWithSubmissions.has(yesterdayStr)) {
      return 0;
    }
  }

  let streak = 0;
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
}

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generates a random submission calendar with days relative to today.
 * Keys are Unix timestamps (seconds) as strings, values are non-negative counts.
 */
const submissionCalendarArb = fc.array(
  fc.record({
    daysAgo: fc.integer({ min: 0, max: 60 }),
    count: fc.integer({ min: 0, max: 10 }),
  }),
  { minLength: 0, maxLength: 30 }
).map((entries) => {
  // Deduplicate by daysAgo (keep last entry for each day)
  const seen = new Map();
  for (const entry of entries) {
    seen.set(entry.daysAgo, entry.count);
  }
  const deduped = Array.from(seen.entries()).map(([daysAgo, count]) => ({ daysAgo, count }));
  return buildCalendar(deduped);
});

/**
 * Generates a calendar that guarantees a consecutive streak of K days starting from
 * today or yesterday (to cover both cases the implementation handles).
 */
const streakCalendarArb = fc.record({
  streakLength: fc.integer({ min: 1, max: 30 }),
  startFromToday: fc.boolean(),
  extraDays: fc.array(
    fc.record({
      daysAgo: fc.integer({ min: 31, max: 60 }),
      count: fc.integer({ min: 1, max: 10 }),
    }),
    { minLength: 0, maxLength: 5 }
  ),
}).map(({ streakLength, startFromToday, extraDays }) => {
  const entries = [];
  const startOffset = startFromToday ? 0 : 1;

  // Create consecutive days with submissions
  for (let i = 0; i < streakLength; i++) {
    entries.push({ daysAgo: startOffset + i, count: fc.sample(fc.integer({ min: 1, max: 10 }), 1)[0] });
  }

  // Add gap day right after the streak
  entries.push({ daysAgo: startOffset + streakLength, count: 0 });

  // Add non-consecutive extra days (won't affect streak)
  for (const extra of extraDays) {
    entries.push(extra);
  }

  return { calendar: buildCalendar(entries), expectedStreak: streakLength, startFromToday };
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 5: LeetCode streak calculation', () => {

  test('streak is always a non-negative integer for any calendar', () => {
    fc.assert(
      fc.property(submissionCalendarArb, (calendar) => {
        const result = calculateStreak(calendar);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  test('calculateStreak matches reference implementation for any random calendar', () => {
    fc.assert(
      fc.property(submissionCalendarArb, (calendar) => {
        const actual = calculateStreak(calendar);
        const expected = referenceStreak(calendar);
        expect(actual).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  test('a gap day (count 0) always breaks the streak', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (totalDays, gapPosition) => {
          // Ensure gapPosition is within range
          const gapDay = Math.min(gapPosition, totalDays - 1);

          // Build a calendar with a gap at gapDay offset from start
          const entries = [];
          const startFromToday = true;

          for (let i = 0; i < totalDays; i++) {
            if (i === gapDay) {
              entries.push({ daysAgo: i, count: 0 }); // Gap
            } else {
              entries.push({ daysAgo: i, count: 3 }); // Submission
            }
          }

          const calendar = buildCalendar(entries);
          const result = calculateStreak(calendar);

          // If gapDay is 0 (today) and yesterday has submissions,
          // streak starts from yesterday. Otherwise streak <= gapDay.
          if (gapDay === 0) {
            // Today has no submissions - streak starts from yesterday
            // Streak should be totalDays - 1 consecutive from day 1 onward
            // until another gap or end
            expect(result).toBeLessThanOrEqual(totalDays - 1);
          } else {
            // Streak cannot exceed the gap position (days 0..gapDay-1)
            expect(result).toBeLessThanOrEqual(gapDay);
          }
        }
      ),
      { numRuns: 150 }
    );
  });

  test('adding a submission to a gap day can only increase or maintain the streak', () => {
    fc.assert(
      fc.property(
        submissionCalendarArb,
        fc.integer({ min: 0, max: 30 }),
        (calendar, fillDaysAgo) => {
          const originalStreak = calculateStreak(calendar);

          // Add a submission to the specified day
          const ts = String(getTimestampForDaysAgo(fillDaysAgo));
          const modifiedCalendar = { ...calendar, [ts]: 5 };
          const newStreak = calculateStreak(modifiedCalendar);

          expect(newStreak).toBeGreaterThanOrEqual(originalStreak);
        }
      ),
      { numRuns: 200 }
    );
  });

  test('empty, null, and undefined calendars return 0', () => {
    expect(calculateStreak(null)).toBe(0);
    expect(calculateStreak(undefined)).toBe(0);
    expect(calculateStreak({})).toBe(0);
    expect(calculateStreak([])).toBe(0);
  });

  test('result is deterministic — same input always produces same output', () => {
    fc.assert(
      fc.property(submissionCalendarArb, (calendar) => {
        const result1 = calculateStreak(calendar);
        const result2 = calculateStreak(calendar);
        const result3 = calculateStreak({ ...calendar });
        expect(result1).toBe(result2);
        expect(result1).toBe(result3);
      }),
      { numRuns: 100 }
    );
  });

  test('consecutive days with submissions ending today produce expected streak', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        (streakLen) => {
          // Build a calendar with exactly streakLen consecutive days including today
          const entries = [];
          for (let i = 0; i < streakLen; i++) {
            entries.push({ daysAgo: i, count: 2 });
          }
          // Ensure there's a gap after the streak
          entries.push({ daysAgo: streakLen, count: 0 });

          const calendar = buildCalendar(entries);
          const result = calculateStreak(calendar);
          expect(result).toBe(streakLen);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('if today has no submissions but yesterday starts a streak, streak counts from yesterday', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        (streakLen) => {
          // Today = 0 submissions, yesterday through yesterday-streakLen+1 have submissions
          const entries = [{ daysAgo: 0, count: 0 }];
          for (let i = 1; i <= streakLen; i++) {
            entries.push({ daysAgo: i, count: 3 });
          }
          // Gap after the streak
          entries.push({ daysAgo: streakLen + 1, count: 0 });

          const calendar = buildCalendar(entries);
          const result = calculateStreak(calendar);
          expect(result).toBe(streakLen);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('calendar with only past days (no today/yesterday) returns 0', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            daysAgo: fc.integer({ min: 2, max: 60 }),
            count: fc.integer({ min: 1, max: 10 }),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        (entries) => {
          // Ensure today and yesterday have no submissions
          const allEntries = [
            { daysAgo: 0, count: 0 },
            { daysAgo: 1, count: 0 },
            ...entries,
          ];
          const calendar = buildCalendar(allEntries);
          const result = calculateStreak(calendar);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
