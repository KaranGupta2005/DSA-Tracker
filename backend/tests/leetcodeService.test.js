const { calculateStreak } = require('../src/services/leetcodeService');

/**
 * Unit tests for LeetCode service functions.
 * Tests the calculateStreak function with various calendar inputs.
 *
 * **Validates: Requirements 4.4, 4.7**
 */

describe('calculateStreak', () => {
  // Helper to create a Unix timestamp (seconds) for a given UTC date string
  const dateToTimestamp = (dateStr) => {
    return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000);
  };

  test('returns 0 for null input', () => {
    expect(calculateStreak(null)).toBe(0);
  });

  test('returns 0 for undefined input', () => {
    expect(calculateStreak(undefined)).toBe(0);
  });

  test('returns 0 for empty object', () => {
    expect(calculateStreak({})).toBe(0);
  });

  test('returns 0 when all counts are 0', () => {
    const today = new Date().toISOString().split('T')[0];
    const calendar = {
      [dateToTimestamp(today)]: 0,
    };
    expect(calculateStreak(calendar)).toBe(0);
  });

  test('returns 1 when only today has submissions', () => {
    const today = new Date().toISOString().split('T')[0];
    const calendar = {
      [dateToTimestamp(today)]: 3,
    };
    expect(calculateStreak(calendar)).toBe(1);
  });

  test('returns correct streak for consecutive days ending today', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const twoDaysAgo = new Date(now);
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    const calendar = {
      [dateToTimestamp(today)]: 2,
      [dateToTimestamp(yesterdayStr)]: 1,
      [dateToTimestamp(twoDaysAgoStr)]: 5,
    };

    expect(calculateStreak(calendar)).toBe(3);
  });

  test('returns correct streak for consecutive days ending yesterday (no submission today)', () => {
    const now = new Date();

    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const twoDaysAgo = new Date(now);
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    const calendar = {
      [dateToTimestamp(yesterdayStr)]: 1,
      [dateToTimestamp(twoDaysAgoStr)]: 3,
    };

    expect(calculateStreak(calendar)).toBe(2);
  });

  test('breaks streak on a gap day', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Skip yesterday, have day before yesterday
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    const calendar = {
      [dateToTimestamp(today)]: 1,
      [dateToTimestamp(twoDaysAgoStr)]: 5,
    };

    // Streak should be 1 (only today counts, yesterday is a gap)
    expect(calculateStreak(calendar)).toBe(1);
  });

  test('returns 0 when no recent submissions (gap of more than 1 day)', () => {
    const now = new Date();

    // Only submissions from 5 days ago
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];

    const calendar = {
      [dateToTimestamp(fiveDaysAgoStr)]: 2,
    };

    expect(calculateStreak(calendar)).toBe(0);
  });

  test('handles non-object input gracefully', () => {
    expect(calculateStreak('invalid')).toBe(0);
    expect(calculateStreak(42)).toBe(0);
    expect(calculateStreak([])).toBe(0);
  });
});
