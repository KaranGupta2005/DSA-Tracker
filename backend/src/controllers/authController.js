const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Member = require('../Models/Member');
const Admin = require('../Models/Admin');
const config = require('../config');
const { verifyHandle } = require('../services/codeforcesService');
const { verifyUsername } = require('../services/leetcodeService');
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

/**
 * Login a member with Codeforces handle and password.
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
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

    // Find member by codeforcesHandle
    const member = await Member.findOne({ codeforcesHandle });
    if (!member) {
      throw createAppError('AUTH_REQUIRED', 'Invalid credentials');
    }

    // Compare password with stored hash
    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      throw createAppError('AUTH_REQUIRED', 'Invalid credentials');
    }

    // Check member status is active
    if (member.status !== 'active') {
      throw createAppError('FORBIDDEN', 'Your account is pending approval');
    }

    // Generate JWT token with 30-day expiry
    const token = jwt.sign(
      { memberId: member._id, role: member.role, status: member.status },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      token,
      member: {
        id: member._id,
        codeforcesHandle: member.codeforcesHandle,
        leetcodeUsername: member.leetcodeUsername,
        role: member.role,
        status: member.status,
        codeforcesRating: member.codeforcesRating,
        codeforcesRank: member.codeforcesRank,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Login an admin with username and password.
 * POST /api/auth/admin/login
 */
const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Username and password are required.',
        { fields: { username: !username, password: !password } }
      );
    }

    // Find admin by username
    const admin = await Admin.findOne({ username });
    if (!admin) {
      throw createAppError('AUTH_REQUIRED', 'Invalid credentials');
    }

    // Compare password using Admin model's matchPassword method
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      throw createAppError('AUTH_REQUIRED', 'Invalid credentials');
    }

    // Generate JWT token with 30-day expiry containing admin role
    const token = jwt.sign(
      { memberId: admin._id, role: 'admin', isHeadAdmin: admin.isHeadAdmin },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        isHeadAdmin: admin.isHeadAdmin,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new admin account (Head Admin only).
 * POST /api/auth/admin/create
 */
const createAdmin = async (req, res, next) => {
  try {
    // Only Head Admin can create new admin accounts
    if (!req.user || req.user.isHeadAdmin !== true) {
      throw createAppError(
        'FORBIDDEN',
        'Only Head Admin can create new admin accounts'
      );
    }

    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Username, email, and password are required.',
        { fields: { username: !username, email: !email, password: !password } }
      );
    }

    // Check for duplicate username or email
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }],
    });
    if (existingAdmin) {
      throw createAppError(
        'VALIDATION_ERROR',
        'An admin with this username or email already exists.',
        { field: existingAdmin.username === username ? 'username' : 'email' }
      );
    }

    // Create admin (Admin model pre-save hook hashes password with bcrypt salt 10)
    const admin = await Admin.create({ username, email, password });

    res.status(201).json({
      message: 'Admin account created successfully.',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        isHeadAdmin: admin.isHeadAdmin,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Link a LeetCode username to the authenticated member's profile.
 * PATCH /api/auth/profile/leetcode
 */
const linkLeetcode = async (req, res, next) => {
  try {
    const { leetcodeUsername } = req.body;

    if (!leetcodeUsername) {
      throw createAppError(
        'VALIDATION_ERROR',
        'LeetCode username is required.',
        { fields: { leetcodeUsername: true } }
      );
    }

    // Check if user is a member (not admin)
    if (req.user.role === 'admin') {
      throw createAppError('FORBIDDEN', 'Admins cannot link LeetCode accounts. Please login as a member.');
    }

    // Verify the LeetCode username exists via LeetCode API
    await verifyUsername(leetcodeUsername);

    // Update the member's record with the verified username
    const updatedMember = await Member.findByIdAndUpdate(
      req.user.memberId,
      { leetcodeUsername },
      { new: true }
    );

    if (!updatedMember) {
      throw createAppError('NOT_FOUND', 'Member account not found. Please login as a member.');
    }

    res.status(200).json({
      message: 'LeetCode username linked successfully.',
      member: {
        id: updatedMember._id,
        codeforcesHandle: updatedMember.codeforcesHandle,
        leetcodeUsername: updatedMember.leetcodeUsername,
        status: updatedMember.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Approve a pending member (admin only).
 * PATCH /api/auth/admin/approve/:id
 */
const approveMember = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      throw createAppError('NOT_FOUND', 'Member not found');
    }

    if (member.status !== 'pending') {
      throw createAppError(
        'MEMBER_NOT_PENDING',
        'Member is not in a pending state'
      );
    }

    member.status = 'active';
    await member.save();

    res.status(200).json({
      message: 'Member approved successfully',
      member: {
        id: member._id,
        codeforcesHandle: member.codeforcesHandle,
        status: member.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reject a pending member and remove from system (admin only).
 * DELETE /api/auth/admin/reject/:id
 */
const rejectMember = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      throw createAppError('NOT_FOUND', 'Member not found');
    }

    if (member.status !== 'pending') {
      throw createAppError(
        'MEMBER_NOT_PENDING',
        'Member is not in a pending state'
      );
    }

    await Member.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: 'Member rejected and removed from system',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update the authenticated member's Codeforces handle.
 * PATCH /api/auth/profile/codeforces
 */
const updateCodeforcesHandle = async (req, res, next) => {
  try {
    const { codeforcesHandle } = req.body;
    if (!codeforcesHandle) {
      throw createAppError('VALIDATION_ERROR', 'Codeforces handle is required.');
    }
    if (req.user.role === 'admin') {
      throw createAppError('FORBIDDEN', 'Admins cannot update Codeforces handles. Please login as a member.');
    }
    // Verify handle exists
    const cfData = await verifyHandle(codeforcesHandle);
    // Check for duplicate
    const existing = await Member.findOne({ codeforcesHandle: cfData.handle, _id: { $ne: req.user.memberId } });
    if (existing) {
      throw createAppError('VALIDATION_ERROR', 'This Codeforces handle is already registered by another member.');
    }
    const updated = await Member.findByIdAndUpdate(req.user.memberId, {
      codeforcesHandle: cfData.handle,
      avatar: cfData.avatar,
      codeforcesRating: cfData.rating,
      codeforcesRank: cfData.rank,
    }, { new: true });
    if (!updated) {
      throw createAppError('NOT_FOUND', 'Member account not found. Please login as a member.');
    }
    res.json({ message: 'Codeforces handle updated successfully.', member: { id: updated._id, codeforcesHandle: updated.codeforcesHandle, codeforcesRating: updated.codeforcesRating, codeforcesRank: updated.codeforcesRank } });
  } catch (err) { next(err); }
};

module.exports = { register, login, adminLogin, createAdmin, linkLeetcode, approveMember, rejectMember, updateCodeforcesHandle };
