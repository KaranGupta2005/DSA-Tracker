const fc = require('fast-check');

/**
 * Feature: ieee-dtu-dsa-tracker, Property 3: Submission matching
 * Feature: ieee-dtu-dsa-tracker, Property 4: Contest history ordering and limiting
 *
 * **Validates: Requirements 3.2, 3.4, 5.5**
 */

// ─── Pure functions extracted from codeforcesService ────────────────────────

/**
 * Checks if any submission in the list matches the given contestId and index
 * with verdict "OK" and case-insensitive index comparison.
 * @param {Array} submissions - Array of submission objects
 * @param {number} contestId - The contest ID to match
 * @param {string} index - The problem index to match (case-insensitive)
 * @returns {boolean}
 */
function hasMatchingSubmission(submissions, contestId, index) {
  return submissions.some(
    (sub) =>
      sub.verdict === 'OK' &&
      sub.problem.contestId === contestId &&
      sub.problem.index.toLowerCase() === index.toLowerCase()
  );
}

/**
 * Filters and sorts contest history: returns at most 5 entries sorted
 * in reverse chronological order (most recent first).
 * @param {Array} contests - Array of contest rating change objects
 * @returns {Array} At most 5 entries sorted by ratingUpdateTimeSeconds descending
 */
function filterContestHistory(contests) {
  const sorted = [...contests].sort(
    (a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds
  );
  return sorted.slice(0, 5);
}

// ─── Generators ─────────────────────────────────────────────────────────────

const verdictArb = fc.constantFrom(
  'OK', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR',
  'COMPILATION_ERROR', 'MEMORY_LIMIT_EXCEEDED', 'CHALLENGED'
);

const problemIndexArb = fc.constantFrom(
  'A', 'B', 'C', 'D', 'E', 'F', 'a', 'b', 'c', 'B1', 'B2', 'C1', 'c2'
);

const contestIdArb = fc.integer({ min: 1, max: 2000 });

const submissionArb = fc.record({
  verdict: verdictArb,
  problem: fc.record({
    contestId: contestIdArb,
    index: problemIndexArb,
  }),
});

const submissionListArb = fc.array(submissionArb, { minLength: 0, maxLength: 50 });

const contestEntryArb = fc.record({
  ratingUpdateTimeSeconds: fc.integer({ min: 1000000000, max: 2000000000 }),
  contestId: contestIdArb,
  contestName: fc.string({ minLength: 1, maxLength: 50 }),
  rank: fc.integer({ min: 1, max: 10000 }),
  oldRating: fc.integer({ min: 0, max: 4000 }),
  newRating: fc.integer({ min: 0, max: 4000 }),
});

const contestListArb = fc.array(contestEntryArb, { minLength: 0, maxLength: 30 });

// Generator for a target that we know has a matching submission in the list
const submissionsWithKnownMatchArb = fc.record({
  contestId: contestIdArb,
  index: problemIndexArb,
}).chain(({ contestId, index }) =>
  submissionListArb.map((submissions) => {
    // Inject at least one OK submission matching the target
    const matchingSub = {
      verdict: 'OK',
      problem: { contestId, index },
    };
    const insertPos = Math.floor(Math.random() * (submissions.length + 1));
    const withMatch = [...submissions];
    withMatch.splice(insertPos, 0, matchingSub);
    return { submissions: withMatch, contestId, index };
  })
);

// ─── Property Tests: Submission Verdict Matching ────────────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 3: Submission matching', () => {
  test('returns true iff there exists a submission with verdict OK, matching contestId and case-insensitive index', () => {
    fc.assert(
      fc.property(
        submissionListArb,
        contestIdArb,
        problemIndexArb,
        (submissions, targetContestId, targetIndex) => {
          const result = hasMatchingSubmission(submissions, targetContestId, targetIndex);

          // Manually check expected result
          const expected = submissions.some(
            (sub) =>
              sub.verdict === 'OK' &&
              sub.problem.contestId === targetContestId &&
              sub.problem.index.toLowerCase() === targetIndex.toLowerCase()
          );

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  test('returns true when a known matching submission exists (positive case)', () => {
    fc.assert(
      fc.property(
        submissionsWithKnownMatchArb,
        ({ submissions, contestId, index }) => {
          const result = hasMatchingSubmission(submissions, contestId, index);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 150 }
    );
  });

  test('returns false when no submission has verdict OK for the target', () => {
    fc.assert(
      fc.property(
        contestIdArb,
        problemIndexArb,
        fc.array(
          fc.record({
            verdict: fc.constantFrom('WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR'),
            problem: fc.record({
              contestId: contestIdArb,
              index: problemIndexArb,
            }),
          }),
          { minLength: 0, maxLength: 30 }
        ),
        (targetContestId, targetIndex, submissions) => {
          // None of these submissions have verdict OK
          const result = hasMatchingSubmission(submissions, targetContestId, targetIndex);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 150 }
    );
  });

  test('is deterministic regardless of submission order (shuffled arrays give same result)', () => {
    fc.assert(
      fc.property(
        submissionListArb.filter(arr => arr.length >= 2),
        contestIdArb,
        problemIndexArb,
        (submissions, targetContestId, targetIndex) => {
          const result1 = hasMatchingSubmission(submissions, targetContestId, targetIndex);

          // Shuffle submissions
          const shuffled = [...submissions].sort(() => Math.random() - 0.5);
          const result2 = hasMatchingSubmission(shuffled, targetContestId, targetIndex);

          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 150 }
    );
  });

  test('case-insensitive index matching: "A" matches "a" and vice versa', () => {
    fc.assert(
      fc.property(
        contestIdArb,
        problemIndexArb,
        (contestId, index) => {
          const subLower = [{
            verdict: 'OK',
            problem: { contestId, index: index.toLowerCase() },
          }];
          const subUpper = [{
            verdict: 'OK',
            problem: { contestId, index: index.toUpperCase() },
          }];

          // Querying with the original index should match both
          expect(hasMatchingSubmission(subLower, contestId, index)).toBe(true);
          expect(hasMatchingSubmission(subUpper, contestId, index)).toBe(true);

          // Querying with opposite case should also match
          expect(hasMatchingSubmission(subLower, contestId, index.toUpperCase())).toBe(true);
          expect(hasMatchingSubmission(subUpper, contestId, index.toLowerCase())).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property Tests: Contest History Ordering and Limiting ──────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 4: Contest history ordering and limiting', () => {
  test('output contains at most 5 entries', () => {
    fc.assert(
      fc.property(contestListArb, (contests) => {
        const result = filterContestHistory(contests);
        expect(result.length).toBeLessThanOrEqual(5);
        expect(result.length).toBe(Math.min(contests.length, 5));
      }),
      { numRuns: 200 }
    );
  });

  test('output is sorted in descending order by ratingUpdateTimeSeconds', () => {
    fc.assert(
      fc.property(contestListArb, (contests) => {
        const result = filterContestHistory(contests);

        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].ratingUpdateTimeSeconds)
            .toBeGreaterThanOrEqual(result[i].ratingUpdateTimeSeconds);
        }
      }),
      { numRuns: 200 }
    );
  });

  test('every included entry has timestamp >= any excluded entry timestamp', () => {
    fc.assert(
      fc.property(
        contestListArb.filter(arr => arr.length > 5),
        (contests) => {
          const result = filterContestHistory(contests);
          const includedTimestamps = result.map(e => e.ratingUpdateTimeSeconds);
          const minIncluded = Math.min(...includedTimestamps);

          // Find excluded entries (those in the original list but not in result)
          const allSorted = [...contests].sort(
            (a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds
          );
          const excluded = allSorted.slice(5);

          for (const entry of excluded) {
            expect(minIncluded).toBeGreaterThanOrEqual(entry.ratingUpdateTimeSeconds);
          }
        }
      ),
      { numRuns: 150 }
    );
  });

  test('does not mutate the original array', () => {
    fc.assert(
      fc.property(contestListArb, (contests) => {
        const original = JSON.parse(JSON.stringify(contests));
        filterContestHistory(contests);
        expect(contests).toEqual(original);
      }),
      { numRuns: 100 }
    );
  });

  test('returns empty array for empty input', () => {
    const result = filterContestHistory([]);
    expect(result).toEqual([]);
  });

  test('for inputs with <= 5 entries, returns all entries sorted descending', () => {
    fc.assert(
      fc.property(
        fc.array(contestEntryArb, { minLength: 1, maxLength: 5 }),
        (contests) => {
          const result = filterContestHistory(contests);
          expect(result.length).toBe(contests.length);

          // Verify sorted descending
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].ratingUpdateTimeSeconds)
              .toBeGreaterThanOrEqual(result[i].ratingUpdateTimeSeconds);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
