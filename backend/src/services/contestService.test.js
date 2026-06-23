const { filterCodeforcesContests, filterLeetcodeContests, fetchLeetcodeContests } = require('./contestService');

describe('contestService', () => {
  describe('filterCodeforcesContests', () => {
    it('should filter only future contests with phase BEFORE', () => {
      const now = new Date('2024-06-01T00:00:00Z');
      const contests = [
        { id: 1, name: 'Past Contest', phase: 'FINISHED', startTimeSeconds: 1700000000, durationSeconds: 7200 },
        { id: 2, name: 'Future Contest 1', phase: 'BEFORE', startTimeSeconds: Math.floor(now.getTime() / 1000) + 3600, durationSeconds: 7200 },
        { id: 3, name: 'Running Contest', phase: 'CODING', startTimeSeconds: Math.floor(now.getTime() / 1000) - 1000, durationSeconds: 7200 },
        { id: 4, name: 'Future Contest 2', phase: 'BEFORE', startTimeSeconds: Math.floor(now.getTime() / 1000) + 7200, durationSeconds: 9000 },
      ];

      const result = filterCodeforcesContests(contests, now);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Future Contest 1');
      expect(result[1].name).toBe('Future Contest 2');
    });

    it('should sort contests ascending by start time', () => {
      const now = new Date('2024-06-01T00:00:00Z');
      const baseTime = Math.floor(now.getTime() / 1000);
      const contests = [
        { id: 1, name: 'Later', phase: 'BEFORE', startTimeSeconds: baseTime + 7200, durationSeconds: 7200 },
        { id: 2, name: 'Sooner', phase: 'BEFORE', startTimeSeconds: baseTime + 3600, durationSeconds: 7200 },
        { id: 3, name: 'Latest', phase: 'BEFORE', startTimeSeconds: baseTime + 10800, durationSeconds: 7200 },
      ];

      const result = filterCodeforcesContests(contests, now);

      expect(result[0].name).toBe('Sooner');
      expect(result[1].name).toBe('Later');
      expect(result[2].name).toBe('Latest');
    });

    it('should limit to 10 contests', () => {
      const now = new Date('2024-06-01T00:00:00Z');
      const baseTime = Math.floor(now.getTime() / 1000);
      const contests = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `Contest ${i + 1}`,
        phase: 'BEFORE',
        startTimeSeconds: baseTime + (i + 1) * 3600,
        durationSeconds: 7200,
      }));

      const result = filterCodeforcesContests(contests, now);

      expect(result).toHaveLength(10);
    });

    it('should map contest fields correctly', () => {
      const now = new Date('2024-06-01T00:00:00Z');
      const startTime = Math.floor(now.getTime() / 1000) + 3600;
      const contests = [
        { id: 42, name: 'CF Round #123', phase: 'BEFORE', startTimeSeconds: startTime, durationSeconds: 7200 },
      ];

      const result = filterCodeforcesContests(contests, now);

      expect(result[0]).toEqual({
        name: 'CF Round #123',
        startTime: new Date(startTime * 1000),
        duration: 7200,
        url: 'https://codeforces.com/contest/42',
      });
    });

    it('should return empty array when no future contests exist', () => {
      const now = new Date('2024-06-01T00:00:00Z');
      const contests = [
        { id: 1, name: 'Past', phase: 'FINISHED', startTimeSeconds: 1700000000, durationSeconds: 7200 },
      ];

      const result = filterCodeforcesContests(contests, now);

      expect(result).toHaveLength(0);
    });
  });

  describe('filterLeetcodeContests', () => {
    it('should filter only future contests', () => {
      const now = new Date('2024-06-01T12:00:00Z');
      const contests = [
        { name: 'Past', startTime: new Date('2024-05-01T00:00:00Z'), duration: 5400, url: 'http://test' },
        { name: 'Future', startTime: new Date('2024-06-15T00:00:00Z'), duration: 5400, url: 'http://test2' },
      ];

      const result = filterLeetcodeContests(contests, now);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Future');
    });

    it('should limit to 4 contests', () => {
      const now = new Date('2024-06-01T00:00:00Z');
      const contests = Array.from({ length: 8 }, (_, i) => ({
        name: `Contest ${i + 1}`,
        startTime: new Date(now.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
        duration: 5400,
        url: `http://test${i}`,
      }));

      const result = filterLeetcodeContests(contests, now);

      expect(result).toHaveLength(4);
    });

    it('should sort ascending by start time', () => {
      const now = new Date('2024-06-01T00:00:00Z');
      const contests = [
        { name: 'Later', startTime: new Date('2024-07-01T00:00:00Z'), duration: 5400, url: 'http://a' },
        { name: 'Sooner', startTime: new Date('2024-06-15T00:00:00Z'), duration: 5400, url: 'http://b' },
      ];

      const result = filterLeetcodeContests(contests, now);

      expect(result[0].name).toBe('Sooner');
      expect(result[1].name).toBe('Later');
    });
  });

  describe('fetchLeetcodeContests', () => {
    it('should return at most 4 contests', () => {
      const result = fetchLeetcodeContests();
      expect(result.length).toBeLessThanOrEqual(4);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return contests with start times in the future', () => {
      const now = new Date();
      const result = fetchLeetcodeContests();
      result.forEach((contest) => {
        expect(contest.startTime.getTime()).toBeGreaterThan(now.getTime());
      });
    });

    it('should return contests sorted ascending by start time', () => {
      const result = fetchLeetcodeContests();
      for (let i = 1; i < result.length; i++) {
        expect(result[i].startTime.getTime()).toBeGreaterThanOrEqual(result[i - 1].startTime.getTime());
      }
    });

    it('should return contests with required fields', () => {
      const result = fetchLeetcodeContests();
      result.forEach((contest) => {
        expect(contest).toHaveProperty('name');
        expect(contest).toHaveProperty('startTime');
        expect(contest).toHaveProperty('duration');
        expect(contest).toHaveProperty('url');
        expect(contest.name).toBeTruthy();
        expect(contest.startTime instanceof Date).toBe(true);
        expect(typeof contest.duration).toBe('number');
        expect(contest.url).toContain('leetcode.com');
      });
    });
  });
});
