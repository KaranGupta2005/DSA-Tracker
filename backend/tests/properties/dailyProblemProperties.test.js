const fc = require('fast-check');

/**
 * Feature: ieee-dtu-dsa-tracker, Property 6: Daily problem idempotence
 * Feature: ieee-dtu-dsa-tracker, Property 7: Daily problem retention limit
 *
 * **Validates: Requirements 5.2, 5.3**
 */

// ─── Pure functions under test ──────────────────────────────────────────────

/**
 * Simulates upsert behavior (idempotence).
 * If a record with the same date exists, it is replaced. Otherwise, the new record is appended.
 * @param {Array} records - Current daily problem records
 * @param {Object} problem - The problem to upsert { contestId, index, name, rating, date }
 * @returns {Array} Updated records array
 */
function upsertDailyProblem(records, problem) {
  const updated = [...records];
  const existingIdx = updated.findIndex(r => r.date === problem.date);
  if (existingIdx !== -1) {
    updated[existingIdx] = { ...problem };
  } else {
    updated.push({ ...problem });
  }
  return updated;
}

/**
 * Simulates retention enforcement (max 7 records, keep most recent by date).
 * @param {Array} records - Current daily problem records
 * @param {number} maxRecords - Maximum records to retain (default 7)
 * @returns {Array} Records trimmed to maxRecords, keeping most recent by date
 */
function enforceRetention(records, maxRecords = 7) {
  if (records.length <= maxRecords) return [...records];
  return [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxRecords);
}

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generates a valid date string in YYYY-MM-DD format within 2024-2025 range.
 */
const dateArb = fc.tuple(
  fc.integer({ min: 2024, max: 2025 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 }) // Use 28 to avoid invalid dates
).map(([year, month, day]) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
);

const contestIdArb = fc.integer({ min: 1, max: 2000 });

const problemIndexArb = fc.constantFrom(
  'A', 'B', 'C', 'D', 'E', 'F', 'A1', 'A2', 'B1', 'B2', 'C1'
);

const problemNameArb = fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0);

const ratingArb = fc.integer({ min: 800, max: 3500 });

/**
 * Generates a valid daily problem record.
 */
const dailyProblemArb = fc.record({
  contestId: contestIdArb,
  index: problemIndexArb,
  name: problemNameArb,
  rating: ratingArb,
  date: dateArb,
});

/**
 * Generates a daily problem record pinned to a specific date.
 */
const dailyProblemForDateArb = (date) => fc.record({
  contestId: contestIdArb,
  index: problemIndexArb,
  name: problemNameArb,
  rating: ratingArb,
  date: fc.constant(date),
});

/**
 * Generates a sequence of daily problem operations all targeting the same date.
 */
const sameDateOpsArb = dateArb.chain((date) =>
  fc.array(dailyProblemForDateArb(date), { minLength: 1, maxLength: 20 })
    .map((ops) => ({ date, ops }))
);

/**
 * Generates a sequence of daily problem operations across unique dates.
 */
const multiDateOpsArb = fc.uniqueArray(dateArb, { minLength: 1, maxLength: 20, comparator: (a, b) => a === b })
  .chain((dates) =>
    fc.tuple(
      ...dates.map((date) => dailyProblemForDateArb(date))
    ).map((problems) => problems)
  );

// ─── Property Tests: Daily Problem Idempotence (Property 6) ─────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 6: Daily problem idempotence', () => {
  test('after any number of operations on the same date, exactly one record exists for that date', () => {
    fc.assert(
      fc.property(
        sameDateOpsArb,
        ({ date, ops }) => {
          let records = [];
          for (const op of ops) {
            records = upsertDailyProblem(records, op);
          }

          const recordsForDate = records.filter(r => r.date === date);
          expect(recordsForDate.length).toBe(1);
        }
      ),
      { numRuns: 200 }
    );
  });

  test('the record reflects the most recently assigned problem (last write wins)', () => {
    fc.assert(
      fc.property(
        sameDateOpsArb,
        ({ date, ops }) => {
          let records = [];
          for (const op of ops) {
            records = upsertDailyProblem(records, op);
          }

          const lastOp = ops[ops.length - 1];
          const record = records.find(r => r.date === date);

          expect(record.contestId).toBe(lastOp.contestId);
          expect(record.index).toBe(lastOp.index);
          expect(record.name).toBe(lastOp.name);
          expect(record.rating).toBe(lastOp.rating);
          expect(record.date).toBe(lastOp.date);
        }
      ),
      { numRuns: 200 }
    );
  });

  test('upserting does not affect records for other dates', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.array(dailyProblemArb, { minLength: 1, maxLength: 10 }),
        dailyProblemArb,
        (targetDate, existingRecords, newProblem) => {
          // Ensure existing records have different dates from targetDate
          const otherRecords = existingRecords
            .filter(r => r.date !== targetDate)
            .slice(0, 5);

          const problemForTarget = { ...newProblem, date: targetDate };

          let records = [...otherRecords];
          const originalOtherRecords = JSON.parse(JSON.stringify(otherRecords));

          records = upsertDailyProblem(records, problemForTarget);

          // Other records should be unchanged
          const otherRecordsAfter = records.filter(r => r.date !== targetDate);
          expect(otherRecordsAfter).toEqual(originalOtherRecords);
        }
      ),
      { numRuns: 150 }
    );
  });

  test('single operation on empty records creates exactly one record', () => {
    fc.assert(
      fc.property(
        dailyProblemArb,
        (problem) => {
          const records = upsertDailyProblem([], problem);
          expect(records.length).toBe(1);
          expect(records[0]).toEqual(problem);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property Tests: Daily Problem Retention Limit (Property 7) ─────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 7: Daily problem retention limit', () => {
  test('after any sequence of operations across different dates, total records never exceeds 7', () => {
    fc.assert(
      fc.property(
        multiDateOpsArb,
        (problems) => {
          let records = [];
          for (const problem of problems) {
            records = upsertDailyProblem(records, problem);
            records = enforceRetention(records);
          }

          expect(records.length).toBeLessThanOrEqual(7);
        }
      ),
      { numRuns: 200 }
    );
  });

  test('retained records are the 7 most recent by date', () => {
    fc.assert(
      fc.property(
        multiDateOpsArb.filter(ops => ops.length > 7),
        (problems) => {
          let records = [];
          for (const problem of problems) {
            records = upsertDailyProblem(records, problem);
            records = enforceRetention(records);
          }

          // Get all unique dates from the operations and find the 7 most recent
          const allDates = problems.map(p => p.date);
          const uniqueDates = [...new Set(allDates)].sort((a, b) => b.localeCompare(a));
          const expectedDates = uniqueDates.slice(0, 7);

          const retainedDates = records.map(r => r.date).sort((a, b) => b.localeCompare(a));

          expect(retainedDates).toEqual(expectedDates);
        }
      ),
      { numRuns: 150 }
    );
  });

  test('retention does not alter records when count is at or below 7', () => {
    fc.assert(
      fc.property(
        fc.array(dailyProblemArb, { minLength: 1, maxLength: 7 }).map((problems) => {
          // Ensure unique dates
          const seen = new Set();
          return problems.filter(p => {
            if (seen.has(p.date)) return false;
            seen.add(p.date);
            return true;
          });
        }).filter(arr => arr.length >= 1),
        (records) => {
          const result = enforceRetention(records);
          expect(result.length).toBe(records.length);

          // All original records should be present
          for (const r of records) {
            expect(result.find(res => res.date === r.date)).toBeTruthy();
          }
        }
      ),
      { numRuns: 150 }
    );
  });

  test('every retained record date is more recent than or equal to any dropped record date', () => {
    fc.assert(
      fc.property(
        fc.array(dailyProblemArb, { minLength: 8, maxLength: 20 }).map((problems) => {
          // Ensure unique dates
          const seen = new Set();
          return problems.filter(p => {
            if (seen.has(p.date)) return false;
            seen.add(p.date);
            return true;
          });
        }).filter(arr => arr.length > 7),
        (records) => {
          const retained = enforceRetention(records);
          const retainedDates = retained.map(r => r.date);
          const droppedDates = records
            .filter(r => !retainedDates.includes(r.date))
            .map(r => r.date);

          const minRetained = retainedDates.sort()[0]; // Earliest retained date

          for (const droppedDate of droppedDates) {
            expect(minRetained.localeCompare(droppedDate)).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 150 }
    );
  });

  test('enforceRetention is idempotent (applying twice gives same result)', () => {
    fc.assert(
      fc.property(
        fc.array(dailyProblemArb, { minLength: 1, maxLength: 20 }).map((problems) => {
          const seen = new Set();
          return problems.filter(p => {
            if (seen.has(p.date)) return false;
            seen.add(p.date);
            return true;
          });
        }),
        (records) => {
          const once = enforceRetention(records);
          const twice = enforceRetention(once);

          // Same records retained (sort both by date for comparison)
          const sortedOnce = [...once].sort((a, b) => a.date.localeCompare(b.date));
          const sortedTwice = [...twice].sort((a, b) => a.date.localeCompare(b.date));

          expect(sortedTwice).toEqual(sortedOnce);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Composition: Retention + Idempotence Compose Correctly ─────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 6/7: Retention + idempotence composition', () => {
  test('repeated upserts on same date followed by retention still yields exactly one record for that date', () => {
    fc.assert(
      fc.property(
        sameDateOpsArb,
        fc.array(dailyProblemArb, { minLength: 0, maxLength: 6 }),
        ({ date, ops }, otherProblems) => {
          // Seed records with other-date entries
          const otherRecords = otherProblems
            .filter(p => p.date !== date)
            .slice(0, 6);
          const seen = new Set();
          const uniqueOther = otherRecords.filter(p => {
            if (seen.has(p.date)) return false;
            seen.add(p.date);
            return true;
          });

          let records = [...uniqueOther];

          // Apply all same-date operations with retention after each
          for (const op of ops) {
            records = upsertDailyProblem(records, op);
            records = enforceRetention(records);
          }

          // Exactly one record for the target date
          const recordsForDate = records.filter(r => r.date === date);
          expect(recordsForDate.length).toBe(1);

          // Total does not exceed 7
          expect(records.length).toBeLessThanOrEqual(7);

          // The record reflects the last operation
          const lastOp = ops[ops.length - 1];
          expect(recordsForDate[0].contestId).toBe(lastOp.contestId);
          expect(recordsForDate[0].index).toBe(lastOp.index);
          expect(recordsForDate[0].name).toBe(lastOp.name);
          expect(recordsForDate[0].rating).toBe(lastOp.rating);
        }
      ),
      { numRuns: 150 }
    );
  });
});
