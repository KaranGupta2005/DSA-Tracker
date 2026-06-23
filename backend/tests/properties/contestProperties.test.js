const fc = require('fast-check');
const { filterCodeforcesContests, filterLeetcodeContests } = require('../../src/services/contestService');

/**
 * Feature: ieee-dtu-dsa-tracker, Property 8: Contest list filtering and ordering
 *
 * **Validates: Requirements 6.1, 6.2**
 *
 * For any list of contests from Codeforces or LeetCode, the filtered output
 * contains only contests with start times strictly in the future, sorted in
 * ascending order by start time, limited to 10 (CF) or 4 (LC) entries.
 */

// ─── Generators ─────────────────────────────────────────────────────────────

const cfPhaseArb = fc.constantFrom('BEFORE', 'FINISHED', 'RUNNING');

// Reference time for testing — a fixed point to reason about past/future
const refTimeArb = fc.integer({ min: 1700000000000, max: 1800000000000 }).map((ms) => new Date(ms));

// CF contest: startTimeSeconds is in epoch seconds
const cfContestArb = (refTimeMs) =>
  fc.record({
    id: fc.integer({ min: 1, max: 5000 }),
    name: fc.string({ minLength: 1, maxLength: 40 }),
    phase: cfPhaseArb,
    // Spread around the reference time: some past, some future
    startTimeSeconds: fc.integer({
      min: Math.floor(refTimeMs / 1000) - 86400 * 30,
      max: Math.floor(refTimeMs / 1000) + 86400 * 30,
    }),
    durationSeconds: fc.integer({ min: 3600, max: 36000 }),
  });

const cfContestListArb = (refTimeMs) =>
  fc.array(cfContestArb(refTimeMs), { minLength: 0, maxLength: 25 });

// LC contest: startTime is a Date
const lcContestArb = (refTimeMs) =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 40 }),
    startTime: fc.integer({
      min: refTimeMs - 86400000 * 30,
      max: refTimeMs + 86400000 * 30,
    }).map((ms) => new Date(ms)),
    duration: fc.integer({ min: 3600, max: 10800 }),
    url: fc.constant('https://leetcode.com/contest/test'),
  });

const lcContestListArb = (refTimeMs) =>
  fc.array(lcContestArb(refTimeMs), { minLength: 0, maxLength: 15 });

// ─── Property Tests: Codeforces Contest Filtering ───────────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 8: Contest list filtering and ordering', () => {
  describe('Codeforces contest filtering', () => {
    test('all contests in output have startTime > now (future only)', () => {
      fc.assert(
        fc.property(
          refTimeArb.chain((now) =>
            cfContestListArb(now.getTime()).map((contests) => ({ contests, now }))
          ),
          ({ contests, now }) => {
            const result = filterCodeforcesContests(contests, now);

            for (const contest of result) {
              expect(contest.startTime.getTime()).toBeGreaterThan(now.getTime());
            }
          }
        ),
        { numRuns: 150 }
      );
    });

    test('output contains at most 10 entries', () => {
      fc.assert(
        fc.property(
          refTimeArb.chain((now) =>
            cfContestListArb(now.getTime()).map((contests) => ({ contests, now }))
          ),
          ({ contests, now }) => {
            const result = filterCodeforcesContests(contests, now);
            expect(result.length).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 150 }
      );
    });

    test('output is sorted ascending by start time', () => {
      fc.assert(
        fc.property(
          refTimeArb.chain((now) =>
            cfContestListArb(now.getTime()).map((contests) => ({ contests, now }))
          ),
          ({ contests, now }) => {
            const result = filterCodeforcesContests(contests, now);

            for (let i = 1; i < result.length; i++) {
              expect(result[i - 1].startTime.getTime())
                .toBeLessThanOrEqual(result[i].startTime.getTime());
            }
          }
        ),
        { numRuns: 150 }
      );
    });

    test('every included entry start time <= every excluded future entry start time (most imminent kept)', () => {
      fc.assert(
        fc.property(
          refTimeArb.chain((now) =>
            cfContestListArb(now.getTime()).map((contests) => ({ contests, now }))
          ),
          ({ contests, now }) => {
            const result = filterCodeforcesContests(contests, now);

            // Compute all future contests with phase BEFORE that pass the filter criteria
            const allFuture = contests
              .filter(
                (c) =>
                  c.phase === 'BEFORE' &&
                  new Date(c.startTimeSeconds * 1000) > now
              )
              .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

            // The excluded ones are those beyond the first 10
            const excluded = allFuture.slice(10);

            if (result.length > 0 && excluded.length > 0) {
              const maxIncludedTime = result[result.length - 1].startTime.getTime();
              for (const exc of excluded) {
                expect(new Date(exc.startTimeSeconds * 1000).getTime())
                  .toBeGreaterThanOrEqual(maxIncludedTime);
              }
            }
          }
        ),
        { numRuns: 150 }
      );
    });
  });

  // ─── Property Tests: LeetCode Contest Filtering ─────────────────────────────

  describe('LeetCode contest filtering', () => {
    test('all contests in output have startTime > now (future only)', () => {
      fc.assert(
        fc.property(
          refTimeArb.chain((now) =>
            lcContestListArb(now.getTime()).map((contests) => ({ contests, now }))
          ),
          ({ contests, now }) => {
            const result = filterLeetcodeContests(contests, now);

            for (const contest of result) {
              expect(contest.startTime.getTime()).toBeGreaterThan(now.getTime());
            }
          }
        ),
        { numRuns: 150 }
      );
    });

    test('output contains at most 4 entries', () => {
      fc.assert(
        fc.property(
          refTimeArb.chain((now) =>
            lcContestListArb(now.getTime()).map((contests) => ({ contests, now }))
          ),
          ({ contests, now }) => {
            const result = filterLeetcodeContests(contests, now);
            expect(result.length).toBeLessThanOrEqual(4);
          }
        ),
        { numRuns: 150 }
      );
    });

    test('output is sorted ascending by start time', () => {
      fc.assert(
        fc.property(
          refTimeArb.chain((now) =>
            lcContestListArb(now.getTime()).map((contests) => ({ contests, now }))
          ),
          ({ contests, now }) => {
            const result = filterLeetcodeContests(contests, now);

            for (let i = 1; i < result.length; i++) {
              expect(result[i - 1].startTime.getTime())
                .toBeLessThanOrEqual(result[i].startTime.getTime());
            }
          }
        ),
        { numRuns: 150 }
      );
    });

    test('every included entry start time <= every excluded future entry start time (most imminent kept)', () => {
      fc.assert(
        fc.property(
          refTimeArb.chain((now) =>
            lcContestListArb(now.getTime()).map((contests) => ({ contests, now }))
          ),
          ({ contests, now }) => {
            const result = filterLeetcodeContests(contests, now);

            // Compute all future contests
            const allFuture = contests
              .filter((c) => c.startTime > now)
              .sort((a, b) => a.startTime - b.startTime);

            // The excluded ones are those beyond the first 4
            const excluded = allFuture.slice(4);

            if (result.length > 0 && excluded.length > 0) {
              const maxIncludedTime = result[result.length - 1].startTime.getTime();
              for (const exc of excluded) {
                expect(exc.startTime.getTime())
                  .toBeGreaterThanOrEqual(maxIncludedTime);
              }
            }
          }
        ),
        { numRuns: 150 }
      );
    });
  });
});
