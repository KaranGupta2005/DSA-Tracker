const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Comprehensive unit tests for Auth Service.
 * Covers JWT generation, password hashing, registration with invalid CF handle,
 * login with pending member, and admin creation by non-Head-Admin.
 *
 * **Validates: Requirements 1.1, 1.2, 1.5, 2.6, 2.7**
 */

// ─── Mock setup ─────────────────────────────────────────────────────────────

const TEST_SECRET = 'test-secret-key-for-auth-tests';

jest.mock('../src/config', () => ({ jwtSecret: 'test-secret-key-for-auth-tests' }));
jest.mock('../src/services/codeforcesService', () => ({ verifyHandle: jest.fn() }));
jest.mock('../src/services/leetcodeService', () => ({ verifyUsername: jest.fn() }));
jest.mock('../src/Models/Member');
jest.mock('../src/Models/Admin');

const Member = require('../src/Models/Member');
const Admin = require('../src/Models/Admin');
const { verifyHandle } = require('../src/services/codeforcesService');
const { register, login, createAdmin } = require('../src/controllers/authController');

// ─── Helper ─────────────────────────────────────────────────────────────────

function createMocks(body = {}, user = null) {
  const req = { body, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

// ─── JWT Generation Tests ───────────────────────────────────────────────────

describe('JWT generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('token contains correct memberId, role, and status in payload', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    Member.findOne.mockResolvedValue({
      _id: 'member-abc',
      codeforcesHandle: 'testuser',
      password: hashedPassword,
      status: 'active',
      role: 'member',
      codeforcesRating: 1200,
      codeforcesRank: 'Pupil',
    });

    const { req, res, next } = createMocks({
      codeforcesHandle: 'testuser',
      password: 'password123',
    });

    await login(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const token = res.json.mock.calls[0][0].token;
    const decoded = jwt.verify(token, TEST_SECRET);

    expect(decoded.memberId).toBe('member-abc');
    expect(decoded.role).toBe('member');
    expect(decoded.status).toBe('active');
  });

  test('token expiry is approximately 30 days', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    Member.findOne.mockResolvedValue({
      _id: 'member-abc',
      codeforcesHandle: 'testuser',
      password: hashedPassword,
      status: 'active',
      role: 'member',
      codeforcesRating: 1200,
      codeforcesRank: 'Pupil',
    });

    const { req, res, next } = createMocks({
      codeforcesHandle: 'testuser',
      password: 'password123',
    });

    await login(req, res, next);

    const token = res.json.mock.calls[0][0].token;
    const decoded = jwt.verify(token, TEST_SECRET);

    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    const expectedExp = Math.floor(Date.now() / 1000) + thirtyDaysInSeconds;
    // Allow 5 seconds tolerance for test execution time
    expect(Math.abs(decoded.exp - expectedExp)).toBeLessThan(5);
  });

  test('token can be verified with the correct secret', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    Member.findOne.mockResolvedValue({
      _id: 'member-abc',
      codeforcesHandle: 'testuser',
      password: hashedPassword,
      status: 'active',
      role: 'member',
      codeforcesRating: 1200,
      codeforcesRank: 'Pupil',
    });

    const { req, res, next } = createMocks({
      codeforcesHandle: 'testuser',
      password: 'password123',
    });

    await login(req, res, next);

    const token = res.json.mock.calls[0][0].token;

    // Should verify successfully with correct secret
    expect(() => jwt.verify(token, TEST_SECRET)).not.toThrow();

    // Should throw with wrong secret
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });
});

// ─── Password Hashing Tests ────────────────────────────────────────────────

describe('Password hashing', () => {
  test('bcrypt hash is different from plaintext', async () => {
    const plaintext = 'mySecurePassword';
    const hash = await bcrypt.hash(plaintext, 10);

    expect(hash).not.toBe(plaintext);
    expect(hash.length).toBeGreaterThan(plaintext.length);
  });

  test('bcrypt compare returns true for correct password', async () => {
    const plaintext = 'correctPassword';
    const hash = await bcrypt.hash(plaintext, 10);

    const result = await bcrypt.compare(plaintext, hash);
    expect(result).toBe(true);
  });

  test('bcrypt compare returns false for wrong password', async () => {
    const plaintext = 'correctPassword';
    const hash = await bcrypt.hash(plaintext, 10);

    const result = await bcrypt.compare('wrongPassword', hash);
    expect(result).toBe(false);
  });

  test('salt rounds are 10 (hash starts with $2b$10$)', async () => {
    const plaintext = 'testPassword';
    const hash = await bcrypt.hash(plaintext, 10);

    // bcrypt hashes with 10 rounds start with $2b$10$ or $2a$10$
    expect(hash).toMatch(/^\$2[ab]\$10\$/);
  });
});

// ─── Registration with Invalid CF Handle ────────────────────────────────────

describe('Registration with invalid Codeforces handle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns HANDLE_NOT_FOUND error when CF handle does not exist', async () => {
    Member.findOne.mockResolvedValue(null);

    const cfError = new Error('Codeforces handle "fakeuser999" was not found.');
    cfError.code = 'HANDLE_NOT_FOUND';
    cfError.statusCode = 404;
    cfError.details = {};
    verifyHandle.mockRejectedValue(cfError);

    const { req, res, next } = createMocks({
      codeforcesHandle: 'fakeuser999',
      password: 'password123',
    });

    await register(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'HANDLE_NOT_FOUND',
        statusCode: 404,
      })
    );
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── Login with Pending Member ──────────────────────────────────────────────

describe('Login with pending member', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns FORBIDDEN (403) when member status is pending', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    Member.findOne.mockResolvedValue({
      _id: 'pending-member-id',
      codeforcesHandle: 'pendinguser',
      password: hashedPassword,
      status: 'pending',
      role: 'member',
    });

    const { req, res, next } = createMocks({
      codeforcesHandle: 'pendinguser',
      password: 'password123',
    });

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FORBIDDEN',
        statusCode: 403,
      })
    );
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── Admin Creation by Non-Head-Admin ───────────────────────────────────────

describe('Admin creation by non-Head-Admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns FORBIDDEN (403) when req.user.isHeadAdmin is false', async () => {
    const { req, res, next } = createMocks(
      { username: 'newadmin', email: 'admin@test.com', password: 'pass123' },
      { memberId: 'admin-1', role: 'admin', isHeadAdmin: false }
    );

    await createAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FORBIDDEN',
        statusCode: 403,
        message: 'Only Head Admin can create new admin accounts',
      })
    );
    expect(Admin.create).not.toHaveBeenCalled();
  });

  test('returns FORBIDDEN (403) when req.user is null', async () => {
    const { req, res, next } = createMocks(
      { username: 'newadmin', email: 'admin@test.com', password: 'pass123' },
      null
    );

    await createAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FORBIDDEN',
        statusCode: 403,
      })
    );
    expect(Admin.create).not.toHaveBeenCalled();
  });

  test('allows admin creation when req.user.isHeadAdmin is true', async () => {
    Admin.findOne.mockResolvedValue(null);
    Admin.create.mockResolvedValue({
      _id: 'new-admin-id',
      username: 'newadmin',
      email: 'admin@test.com',
      isHeadAdmin: false,
    });

    const { req, res, next } = createMocks(
      { username: 'newadmin', email: 'admin@test.com', password: 'pass123' },
      { memberId: 'head-admin-1', role: 'admin', isHeadAdmin: true }
    );

    await createAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Admin account created successfully.',
        admin: expect.objectContaining({
          id: 'new-admin-id',
          username: 'newadmin',
          email: 'admin@test.com',
        }),
      })
    );
  });
});
