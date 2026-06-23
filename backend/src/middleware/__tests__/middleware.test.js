const jwt = require('jsonwebtoken');
const authMiddleware = require('../authMiddleware');
const adminMiddleware = require('../adminMiddleware');
const { createRateLimit } = require('../rateLimitMiddleware');
const { errorHandler, createAppError } = require('../errorHandler');

// Mock config
jest.mock('../../config', () => ({
  jwtSecret: 'test-secret-key',
}));

// Helper to create mock req/res/next
const createMocks = (overrides = {}) => {
  const req = {
    headers: {},
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('authMiddleware', () => {
  const validPayload = { memberId: '123', role: 'member', status: 'active' };

  test('returns 401 when no Authorization header is present', () => {
    const { req, res, next } = createMocks();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: 'AUTH_REQUIRED' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header does not start with Bearer', () => {
    const { req, res, next } = createMocks({
      headers: { authorization: 'Basic abc123' },
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: 'AUTH_REQUIRED' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for an invalid/malformed token', () => {
    const { req, res, next } = createMocks({
      headers: { authorization: 'Bearer invalidtoken' },
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: 'AUTH_REQUIRED' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 for a pending member', () => {
    const token = jwt.sign(
      { memberId: '123', role: 'member', status: 'pending' },
      'test-secret-key'
    );
    const { req, res, next } = createMocks({
      headers: { authorization: `Bearer ${token}` },
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: 'FORBIDDEN' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches user info and calls next for valid active member token', () => {
    const token = jwt.sign(validPayload, 'test-secret-key');
    const { req, res, next } = createMocks({
      headers: { authorization: `Bearer ${token}` },
    });

    authMiddleware(req, res, next);

    expect(req.user).toEqual({
      memberId: '123',
      role: 'member',
      status: 'active',
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('attaches user info and calls next for valid admin token', () => {
    const token = jwt.sign(
      { memberId: 'admin1', role: 'admin', status: 'active' },
      'test-secret-key'
    );
    const { req, res, next } = createMocks({
      headers: { authorization: `Bearer ${token}` },
    });

    authMiddleware(req, res, next);

    expect(req.user).toEqual({
      memberId: 'admin1',
      role: 'admin',
      status: 'active',
    });
    expect(next).toHaveBeenCalled();
  });
});

describe('adminMiddleware', () => {
  test('returns 403 when req.user is not set', () => {
    const { req, res, next } = createMocks();

    adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: 'FORBIDDEN' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when user role is not admin', () => {
    const { req, res, next } = createMocks();
    req.user = { memberId: '123', role: 'member', status: 'active' };

    adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next when user role is admin', () => {
    const { req, res, next } = createMocks();
    req.user = { memberId: 'admin1', role: 'admin', status: 'active' };

    adminMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('rateLimitMiddleware', () => {
  test('allows requests within the limit', () => {
    const limiter = createRateLimit(60000, 3);
    const { req, res, next } = createMocks();

    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('blocks requests exceeding the limit', () => {
    const limiter = createRateLimit(60000, 2);

    // First two should pass
    for (let i = 0; i < 2; i++) {
      const { req, res, next } = createMocks();
      limiter(req, res, next);
      expect(next).toHaveBeenCalled();
    }

    // Third should be blocked
    const { req, res, next } = createMocks();
    limiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: 'RATE_LIMITED' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('resets after the time window expires', () => {
    jest.useFakeTimers();
    const windowMs = 1000;
    const limiter = createRateLimit(windowMs, 1);

    // First request passes
    const { req: req1, res: res1, next: next1 } = createMocks();
    limiter(req1, res1, next1);
    expect(next1).toHaveBeenCalled();

    // Second request blocked within window
    const { req: req2, res: res2, next: next2 } = createMocks();
    limiter(req2, res2, next2);
    expect(res2.status).toHaveBeenCalledWith(429);

    // Advance past the window
    jest.advanceTimersByTime(windowMs + 1);

    // Third request passes (new window)
    const { req: req3, res: res3, next: next3 } = createMocks();
    limiter(req3, res3, next3);
    expect(next3).toHaveBeenCalled();

    jest.useRealTimers();
  });
});

describe('errorHandler', () => {
  test('formats a known application error correctly', () => {
    const err = createAppError('NOT_FOUND', 'Resource not found', { id: '123' });
    const { req, res, next } = createMocks();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: { id: '123' },
      },
    });
  });

  test('formats an unknown error with 500 status', () => {
    const err = new Error('Something went wrong');
    const { req, res, next } = createMocks();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        details: {},
      },
    });
  });

  test('createAppError sets correct status code from ERROR_STATUS_MAP', () => {
    const err = createAppError('RATE_LIMITED', 'Too many requests');
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
  });

  test('createAppError defaults details to empty object', () => {
    const err = createAppError('FORBIDDEN', 'Access denied');
    expect(err.details).toEqual({});
  });
});
