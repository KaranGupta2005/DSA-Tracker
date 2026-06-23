const fc = require('fast-check');
const { calculateCompletionPercentage, getTimeline } = require('../../src/services/sessionPrepService');

/**
 * Feature: ieee-dtu-dsa-tracker, Property 14: Session progress completion percentage
 * Feature: ieee-dtu-dsa-tracker, Property 15: Session timeline milestone distribution
 *
 * **Validates: Requirements 9.3, 9.5**
 */

// ─── Generators ─────────────────────────────────────────────────────────────

// Total modules: positive integer between 1 and 100
const totalArb = fc.integer({ min: 1, max: 100 });

// Completed modules: between 0 and total (generated relative to total)
const completedTotalArb = totalArb.chain((total) =>
  fc.integer({ min: 0, max: total }).map((completed) => ({ completed, total }))
);

// Dates from Jan 2024 to Aug 2026 (before Sep 2026)
const dateBeforeSep2026Arb = fc.date({
  min: new Date(2024, 0, 1),
  max: new Date(2026, 7, 31), // Aug 31, 2026
});

// ─── Property 14: Session Progress Completion Percentage ────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 14: Session progress completion percentage', () => {
  test('percentage equals Math.round(completed / total * 100) for any valid inputs', () => {
    fc.assert(
      fc.property(completedTotalArb, ({ completed, total }) => {
        const result = calculateCompletionPercentage(completed, total);
        const expected = Math.round((completed / total) * 100);
        expect(result).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  test('percentage is always between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(completedTotalArb, ({ completed, total }) => {
        const result = calculateCompletionPercentage(completed, total);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 }
    );
  });

  test('percentage is always an integer', () => {
    fc.assert(
      fc.property(completedTotalArb, ({ completed, total }) => {
        const result = calculateCompletionPercentage(completed, total);
        expect(Number.isInteger(result)).toBe(true);
      }),
      { numRuns: 150 }
    );
  });

  test('completed === 0 yields 0%', () => {
    fc.assert(
      fc.property(totalArb, (total) => {
        const result = calculateCompletionPercentage(0, total);
        expect(result).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  test('completed === total yields 100%', () => {
    fc.assert(
      fc.property(totalArb, (total) => {
        const result = calculateCompletionPercentage(total, total);
        expect(result).toBe(100);
      }),
      { numRuns: 100 }
    );
  });

  test('percentage increases monotonically as completed increases', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }).chain((total) =>
          fc.integer({ min: 0, max: total - 1 }).map((completed) => ({ completed, total }))
        ),
        ({ completed, total }) => {
          const current = calculateCompletionPercentage(completed, total);
          const next = calculateCompletionPercentage(completed + 1, total);
          expect(next).toBeGreaterThanOrEqual(current);
        }
      ),
      { numRuns: 150 }
    );
  });
});

// ─── Property 15: Session Timeline Milestone Distribution ───────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 15: Session timeline milestone distribution', () => {
  test('timeline contains at least one milestone per calendar month from current through Sep 2026', () => {
    fc.assert(
      fc.property(dateBeforeSep2026Arb, (currentDate) => {
        const milestones = getTimeline(currentDate);

        // Calculate expected months from currentDate through Sep 2026
        const startYear = currentDate.getFullYear();
        const startMonth = currentDate.getMonth(); // 0-based
        const endYear = 2026;
        const endMonth = 8; // September (0-based)

        let expectedMonths = 0;
        let y = startYear;
        let m = startMonth;
        while (y < endYear || (y === endYear && m <= endMonth)) {
          expectedMonths++;
          m++;
          if (m > 11) {
            m = 0;
            y++;
          }
        }

        expect(milestones.length).toBeGreaterThanOrEqual(expectedMonths);
      }),
      { numRuns: 150 }
    );
  });

  test('each milestone has a valid month string in YYYY-MM format', () => {
    fc.assert(
      fc.property(dateBeforeSep2026Arb, (currentDate) => {
        const milestones = getTimeline(currentDate);
        const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

        for (const milestone of milestones) {
          expect(milestone.month).toMatch(monthPattern);
        }
      }),
      { numRuns: 150 }
    );
  });

  test('each milestone has a non-empty title and description', () => {
    fc.assert(
      fc.property(dateBeforeSep2026Arb, (currentDate) => {
        const milestones = getTimeline(currentDate);

        for (const milestone of milestones) {
          expect(typeof milestone.title).toBe('string');
          expect(milestone.title.length).toBeGreaterThan(0);
          expect(typeof milestone.description).toBe('string');
          expect(milestone.description.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 150 }
    );
  });

  test('milestones are in chronological order', () => {
    fc.assert(
      fc.property(dateBeforeSep2026Arb, (currentDate) => {
        const milestones = getTimeline(currentDate);

        for (let i = 1; i < milestones.length; i++) {
          expect(milestones[i].month >= milestones[i - 1].month).toBe(true);
        }
      }),
      { numRuns: 150 }
    );
  });

  test('timeline covers every month from start through Sep 2026 without gaps', () => {
    fc.assert(
      fc.property(dateBeforeSep2026Arb, (currentDate) => {
        const milestones = getTimeline(currentDate);
        const months = milestones.map((m) => m.month);

        // Build expected months
        const expectedMonths = [];
        let y = currentDate.getFullYear();
        let m = currentDate.getMonth();
        while (y < 2026 || (y === 2026 && m <= 8)) {
          expectedMonths.push(`${y}-${String(m + 1).padStart(2, '0')}`);
          m++;
          if (m > 11) {
            m = 0;
            y++;
          }
        }

        // Every expected month should appear in the timeline
        for (const expected of expectedMonths) {
          expect(months).toContain(expected);
        }
      }),
      { numRuns: 150 }
    );
  });

  test('timeline is non-empty for any date before Sep 2026', () => {
    fc.assert(
      fc.property(dateBeforeSep2026Arb, (currentDate) => {
        const milestones = getTimeline(currentDate);
        expect(milestones.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
