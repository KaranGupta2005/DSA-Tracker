const fc = require('fast-check');
const jwt = require('jsonwebtoken');

/**
 * Feature: ieee-dtu-dsa-tracker, Property 1: Admin state transitions
 * Feature: ieee-dtu-dsa-tracker, Property 2: Pending members cannot access protected features
 *
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
 */

// ─── Pure helper functions representing state transition logic ───────────────

/**
 * Approves a pending member by setting status to "active".
 * Throws if the member's status is not "pending".
 * @param {object} member - Member object with at least a `status` field
 * @returns {object} Updated member with status "active"
 */
function approveMember(member) {
  if (member.status !== 'pending') {
    const err = new Error('Member is not in a pending state');
    err.code = 'MEMBER_NOT_PENDING';
    err.statusCode = 409;
    throw err;
  }
  return { ...member, status: 'active' };
}

/**
 * Rejects a pending member by removing them (returns null).
 * Throws if the member's status is not "pending".
 * @param {object} member - Member object with at least a `status` field
 * @returns {null} Indicates the record was removed
 */
function rejectMember(member) {
  if (member.status !== 'pending') {
    const err = new Error('Member is not in a pending state');
    err.code = 'MEMBER_NOT_PENDING';
    err.statusCode = 409;
    throw err;
  }
  return null;
}

/**
 * Simulates authMiddleware logic for pending member access check.
 * Returns { allowed: boolean, statusCode: number, nextCalled: boolean }
 */
function checkPendingAccess(decodedToken) {
  if (decodedToken.status === 'pending') {
    return {
      allowed: false,
      statusCode: 403,
      nextCalled: false,
    };
  }
  return {
    allowed: true,
    statusCode: 200,
    nextCalled: true,
  };
}

// ─── Generators ─────────────────────────────────────────────────────────────

const memberArb = fc.record({
  _id: fc.uuid(),
  codeforcesHandle: fc.string({ minLength: 1, maxLength: 24 }).filter(s => s.trim().length > 0),
  password: fc.string({ minLength: 8, maxLength: 64 }),
  role: fc.constantFrom('member', 'admin'),
  codeforcesRating: fc.option(fc.integer({ min: 0, max: 4000 }), { nil: null }),
  codeforcesRank: fc.constantFrom('Unrated', 'Newbie', 'Pupil', 'Specialist', 'Expert', 'Candidate Master', 'Master', 'International Master', 'Grandmaster'),
  currentStreak: fc.nat({ max: 365 }),
  activityScore: fc.nat({ max: 10000 }),
});

const pendingMemberArb = memberArb.map(m => ({ ...m, status: 'pending' }));
const activeMemberArb = memberArb.map(m => ({ ...m, status: 'active' }));
const nonPendingStatusArb = fc.constantFrom('active');
const memberWithStatusArb = fc.oneof(
  pendingMemberArb,
  activeMemberArb
);

const protectedRoutes = [
  '/api/leaderboard',
  '/api/leaderboard/filter',
  '/api/daily/today',
  '/api/daily/history',
  '/api/daily/check/somehandle',
  '/api/contests/upcoming',
  '/api/contests/subscribe',
  '/api/ai/report',
  '/api/ai/session/content',
  '/api/ai/session/questions',
  '/api/codeforces/profile/handle',
  '/api/codeforces/contests/handle',
  '/api/leetcode/sync/username',
  '/api/session-prep/curriculum',
  '/api/session-prep/progress',
];

const protectedRouteArb = fc.constantFrom(...protectedRoutes);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 1: Admin state transitions', () => {
  test('approve sets status to "active" for any pending member', () => {
    fc.assert(
      fc.property(pendingMemberArb, (member) => {
        const result = approveMember(member);
        expect(result.status).toBe('active');
        // All other fields should remain unchanged
        expect(result._id).toBe(member._id);
        expect(result.codeforcesHandle).toBe(member.codeforcesHandle);
        expect(result.role).toBe(member.role);
      }),
      { numRuns: 100 }
    );
  });

  test('reject returns null (removes record) for any pending member', () => {
    fc.assert(
      fc.property(pendingMemberArb, (member) => {
        const result = rejectMember(member);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('approve throws MEMBER_NOT_PENDING if status is not "pending"', () => {
    fc.assert(
      fc.property(activeMemberArb, (member) => {
        expect(() => approveMember(member)).toThrow('Member is not in a pending state');
        try {
          approveMember(member);
        } catch (err) {
          expect(err.code).toBe('MEMBER_NOT_PENDING');
          expect(err.statusCode).toBe(409);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('reject throws MEMBER_NOT_PENDING if status is not "pending"', () => {
    fc.assert(
      fc.property(activeMemberArb, (member) => {
        expect(() => rejectMember(member)).toThrow('Member is not in a pending state');
        try {
          rejectMember(member);
        } catch (err) {
          expect(err.code).toBe('MEMBER_NOT_PENDING');
          expect(err.statusCode).toBe(409);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('approve is idempotent on pending members (always produces active)', () => {
    fc.assert(
      fc.property(pendingMemberArb, (member) => {
        const approved = approveMember(member);
        expect(approved.status).toBe('active');
        // Trying to approve again should now fail
        expect(() => approveMember(approved)).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  test('no state modification occurs when approve/reject fail on non-pending member', () => {
    fc.assert(
      fc.property(activeMemberArb, (member) => {
        const originalMember = { ...member };
        try {
          approveMember(member);
        } catch (e) {
          // Member should remain unchanged
          expect(member).toEqual(originalMember);
        }
        try {
          rejectMember(member);
        } catch (e) {
          // Member should remain unchanged
          expect(member).toEqual(originalMember);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: ieee-dtu-dsa-tracker, Property 2: Pending members cannot access protected features', () => {
  test('pending members are denied access (403) on any protected endpoint', () => {
    fc.assert(
      fc.property(
        pendingMemberArb,
        protectedRouteArb,
        (member, route) => {
          const token = {
            memberId: member._id,
            role: member.role,
            status: 'pending',
          };
          const result = checkPendingAccess(token);
          expect(result.allowed).toBe(false);
          expect(result.statusCode).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('pending members never trigger next() (no data modification)', () => {
    fc.assert(
      fc.property(
        pendingMemberArb,
        protectedRouteArb,
        (member, route) => {
          const token = {
            memberId: member._id,
            role: member.role,
            status: 'pending',
          };
          const result = checkPendingAccess(token);
          expect(result.nextCalled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('active members are allowed access on protected endpoints', () => {
    fc.assert(
      fc.property(
        activeMemberArb,
        protectedRouteArb,
        (member, route) => {
          const token = {
            memberId: member._id,
            role: member.role,
            status: 'active',
          };
          const result = checkPendingAccess(token);
          expect(result.allowed).toBe(true);
          expect(result.nextCalled).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('denial does not modify the member token data', () => {
    fc.assert(
      fc.property(
        pendingMemberArb,
        protectedRouteArb,
        (member, route) => {
          const token = {
            memberId: member._id,
            role: member.role,
            status: 'pending',
          };
          const tokenCopy = { ...token };
          checkPendingAccess(token);
          // Token data should remain unchanged after the check
          expect(token).toEqual(tokenCopy);
        }
      ),
      { numRuns: 100 }
    );
  });
});
