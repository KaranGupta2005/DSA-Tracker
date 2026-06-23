const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Unit tests for the login handler logic.
 * Tests validate credential checking, status gating, and JWT issuance.
 *
 * **Validates: Requirements 1.5, 2.5**
 */

// ─── Mock setup ─────────────────────────────────────────────────────────────

const mockConfig = { jwtSecret: 'test-secret-key-for-jwt' };

jest.mock('../src/config', () => mockConfig);
jest.mock('../src/services/codeforcesService', () => ({
  verifyHandle: jest.fn(),
}));

const Member = require('../src/Models/Member');
jest.mock('../src/Models/Member');

const { login } = require('../src/controllers/authController');

// ─── Helper to create mock req/res/next ─────────────────────────────────────

function createMocks(body = {}) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 when codeforcesHandle is missing', async () => {
    const { req, res, next } = createMocks({ password: 'somepass' });

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      })
    );
  });

  test('returns 400 when password is missing', async () => {
    const { req, res, next } = createMocks({ codeforcesHandle: 'user1' });

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      })
    );
  });

  test('returns 401 when member is not found', async () => {
    Member.findOne.mockResolvedValue(null);

    const { req, res, next } = createMocks({
      codeforcesHandle: 'nonexistent',
      password: 'somepass',
    });

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AUTH_REQUIRED',
        statusCode: 401,
        message: 'Invalid credentials',
      })
    );
  });

  test('returns 401 when password does not match', async () => {
    const hashedPassword = await bcrypt.hash('correctpass', 10);
    Member.findOne.mockResolvedValue({
      _id: 'member123',
      codeforcesHandle: 'user1',
      password: hashedPassword,
      status: 'active',
      role: 'member',
    });

    const { req, res, next } = createMocks({
      codeforcesHandle: 'user1',
      password: 'wrongpass',
    });

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AUTH_REQUIRED',
        statusCode: 401,
        message: 'Invalid credentials',
      })
    );
  });

  test('returns 403 when member status is pending', async () => {
    const hashedPassword = await bcrypt.hash('mypassword', 10);
    Member.findOne.mockResolvedValue({
      _id: 'member123',
      codeforcesHandle: 'user1',
      password: hashedPassword,
      status: 'pending',
      role: 'member',
    });

    const { req, res, next } = createMocks({
      codeforcesHandle: 'user1',
      password: 'mypassword',
    });

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FORBIDDEN',
        statusCode: 403,
        message: 'Your account is pending approval',
      })
    );
  });

  test('returns 200 with token and member info on successful login', async () => {
    const hashedPassword = await bcrypt.hash('mypassword', 10);
    const mockMember = {
      _id: 'member123',
      codeforcesHandle: 'user1',
      password: hashedPassword,
      status: 'active',
      role: 'member',
      codeforcesRating: 1500,
      codeforcesRank: 'Specialist',
    };
    Member.findOne.mockResolvedValue(mockMember);

    const { req, res, next } = createMocks({
      codeforcesHandle: 'user1',
      password: 'mypassword',
    });

    await login(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        member: {
          id: 'member123',
          codeforcesHandle: 'user1',
          role: 'member',
          status: 'active',
          codeforcesRating: 1500,
          codeforcesRank: 'Specialist',
        },
      })
    );
  });

  test('JWT token contains correct payload with 30-day expiry', async () => {
    const hashedPassword = await bcrypt.hash('mypassword', 10);
    const mockMember = {
      _id: 'member123',
      codeforcesHandle: 'user1',
      password: hashedPassword,
      status: 'active',
      role: 'member',
      codeforcesRating: 1500,
      codeforcesRank: 'Specialist',
    };
    Member.findOne.mockResolvedValue(mockMember);

    const { req, res, next } = createMocks({
      codeforcesHandle: 'user1',
      password: 'mypassword',
    });

    await login(req, res, next);

    const token = res.json.mock.calls[0][0].token;
    const decoded = jwt.verify(token, mockConfig.jwtSecret);

    expect(decoded.memberId).toBe('member123');
    expect(decoded.role).toBe('member');
    expect(decoded.status).toBe('active');
    // Check 30-day expiry (with some tolerance for test execution time)
    const expectedExpiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    expect(decoded.exp).toBeCloseTo(expectedExpiry, -1);
  });
});
