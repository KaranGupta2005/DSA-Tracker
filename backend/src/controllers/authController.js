const bcrypt = require('bcrypt');
const Member = require('../Models/Member');
const { verifyHandle } = require('../services/codeforcesService');
const { createAppError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 10;

/**
 * Register a new member with Codeforces handle verification.
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { codeforcesHandle, password } = req.body;

    // Validate required fields
    if (!codeforcesHandle || !password) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Codeforces handle and password are required.',
        { fields: { codeforcesHandle: !codeforcesHandle, password: !password } }
      );
    }

    // Check for duplicate handle
    const existingMember = await Member.findOne({ codeforcesHandle });
    if (existingMember) {
      throw createAppError(
        'VALIDATION_ERROR',
        'A member with this Codeforces handle already exists.',
        { field: 'codeforcesHandle' }
      );
    }

    // Verify Codeforces handle exists via CF API
    const cfData = await verifyHandle(codeforcesHandle);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create member with pending status
    const member = await Member.create({
      codeforcesHandle: cfData.handle,
      password: hashedPassword,
      status: 'pending',
      role: 'member',
      avatar: cfData.avatar,
      codeforcesRating: cfData.rating,
      codeforcesRank: cfData.rank,
    });

    res.status(201).json({
      message: 'Registration successful. Awaiting admin approval.',
      member: {
        id: member._id,
        codeforcesHandle: member.codeforcesHandle,
        status: member.status,
        codeforcesRating: member.codeforcesRating,
        codeforcesRank: member.codeforcesRank,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register };
