const { calculateActivityScore, getPeriodStartDate } = require('./leaderboardService');

describe('Leaderboard Service', () => {
  describe('calculateActivityScore', () => {
    it('calculates score correctly with all components', () => {
      const stats = {
        problemsSolved: 10,
        streak: 5,
        contestsLast30Days: 3,
        dailyCompletions: 7,
      };
      // (10*1) + (5*2) + (3*5) + (7*3) = 10 + 10 + 15 + 21 = 56
      expect(calculateActivityScore(stats)).toBe(56);
    });

    it('returns 0 when all inputs are zero', () => {
      const stats = {
        problemsSolved: 0,
        streak: 0,
        contestsLast30Days: 0,
        dailyCompletions: 0,
      };
      expect(calculateActivityScore(stats)).toBe(0);
    });

    it('handles undefined/null inputs as 0', () => {
      expect(calculateActivityScore({})).toBe(0);
      expect(calculateActivityScore({ problemsSolved: null, streak: undefined })).toBe(0);
    });

    it('handles negative inputs by clamping to 0', () => {
      const stats = {
        problemsSolved: -5,
        streak: -3,
        contestsLast30Days: -1,
        dailyCompletions: -2,
      };
      expect(calculateActivityScore(stats)).toBe(0);
    });

    it('floors decimal values', () => {
      const stats = {
        problemsSolved: 10.9,
        streak: 5.5,
        contestsLast30Days: 3.7,
        dailyCompletions: 7.2,
      };
      // floor(10.9)=10, floor(5.5)=5, floor(3.7)=3, floor(7.2)=7
      // (10*1) + (5*2) + (3*5) + (7*3) = 10 + 10 + 15 + 21 = 56
      expect(calculateActivityScore(stats)).toBe(56);
    });

    it('applies correct weights: problems=1, streak=2, contests=5, daily=3', () => {
      // Test each weight individually
      expect(calculateActivityScore({ problemsSolved: 1, streak: 0, contestsLast30Days: 0, dailyCompletions: 0 })).toBe(1);
      expect(calculateActivityScore({ problemsSolved: 0, streak: 1, contestsLast30Days: 0, dailyCompletions: 0 })).toBe(2);
      expect(calculateActivityScore({ problemsSolved: 0, streak: 0, contestsLast30Days: 1, dailyCompletions: 0 })).toBe(5);
      expect(calculateActivityScore({ problemsSolved: 0, streak: 0, contestsLast30Days: 0, dailyCompletions: 1 })).toBe(3);
    });
  });

  describe('getPeriodStartDate', () => {
    it('returns null for "all-time"', () => {
      expect(getPeriodStartDate('all-time')).toBeNull();
    });

    it('returns a date 6 days ago for "weekly"', () => {
      const start = getPeriodStartDate('weekly');
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const expectedStart = new Date(today);
      expectedStart.setUTCDate(expectedStart.getUTCDate() - 6);
      expect(start.toISOString()).toBe(expectedStart.toISOString());
    });

    it('returns a date 29 days ago for "monthly"', () => {
      const start = getPeriodStartDate('monthly');
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const expectedStart = new Date(today);
      expectedStart.setUTCDate(expectedStart.getUTCDate() - 29);
      expect(start.toISOString()).toBe(expectedStart.toISOString());
    });

    it('returns null for unknown period', () => {
      expect(getPeriodStartDate('unknown')).toBeNull();
    });
  });
});
