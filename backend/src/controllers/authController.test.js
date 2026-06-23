const { register } = require('./authController');

// Mock dependencies
jest.mock('../Models/Member');
jest.mock('../services/codeforcesService');
jest.mock('bcrypt');

const Member = require('../Models/Member');
const { verifyHandle } = require('../services/codeforcesService');
const bcrypt = require('bcrypt');

describe('authController - register', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should return 400 when codeforcesHandle is missing', async () => {
    req.body = { password: 'test123' };

    await register(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      })
    );
  });

  it('should return 400 when password is missing', async () => {
    req.body = { codeforcesHandle: 'tourist' };

    await register(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      })
    );
  });

  it('should return 400 when handle already exists in database', async () => {
    req.body = { codeforcesHandle: 'tourist', password: 'test123' };
    Member.findOne.mockResolvedValue({ codeforcesHandle: 'tourist' });

    await register(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        message: expect.stringContaining('already exists'),
      })
    );
  });

  it('should propagate HANDLE_NOT_FOUND error from codeforcesService', async () => {
    req.body = { codeforcesHandle: 'nonexistent', password: 'test123' };
    Member.findOne.mockResolvedValue(null);

    const cfError = new Error('Codeforces handle "nonexistent" was not found.');
    cfError.code = 'HANDLE_NOT_FOUND';
    cfError.statusCode = 404;
    cfError.details = {};
    verifyHandle.mockRejectedValue(cfError);

    await register(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'HANDLE_NOT_FOUND' })
    );
  });

  it('should create a pending member on successful registration', async () => {
    req.body = { codeforcesHandle: 'tourist', password: 'test123' };
    Member.findOne.mockResolvedValue(null);
    verifyHandle.mockResolvedValue({
      handle: 'tourist',
      rating: 3979,
      rank: 'legendary grandmaster',
      avatar: 'https://userpic.codeforces.org/tourist.jpg',
    });
    bcrypt.hash.mockResolvedValue('hashed_password');
    Member.create.mockResolvedValue({
      _id: 'member123',
      codeforcesHandle: 'tourist',
      status: 'pending',
      codeforcesRating: 3979,
      codeforcesRank: 'legendary grandmaster',
    });

    await register(req, res, next);

    expect(bcrypt.hash).toHaveBeenCalledWith('test123', 10);
    expect(Member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        codeforcesHandle: 'tourist',
        password: 'hashed_password',
        status: 'pending',
        role: 'member',
        avatar: 'https://userpic.codeforces.org/tourist.jpg',
        codeforcesRating: 3979,
        codeforcesRank: 'legendary grandmaster',
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Registration successful. Awaiting admin approval.',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should propagate EXTERNAL_SERVICE_UNAVAILABLE error when CF API is down', async () => {
    req.body = { codeforcesHandle: 'tourist', password: 'test123' };
    Member.findOne.mockResolvedValue(null);

    const cfError = new Error('Unable to reach Codeforces API.');
    cfError.code = 'EXTERNAL_SERVICE_UNAVAILABLE';
    cfError.statusCode = 503;
    cfError.details = {};
    verifyHandle.mockRejectedValue(cfError);

    await register(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'EXTERNAL_SERVICE_UNAVAILABLE' })
    );
  });
});
