const express = require('express');
const router = express.Router();
const { register, login, adminLogin, createAdmin, linkLeetcode, approveMember, rejectMember, updateCodeforcesHandle } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// POST /api/auth/register - Register a new member
router.post('/register', register);

// POST /api/auth/login - Login a member
router.post('/login', login);

// POST /api/auth/admin/login - Login an admin (no auth required)
router.post('/admin/login', adminLogin);

// POST /api/auth/admin/create - Create a new admin (Head Admin only)
router.post('/admin/create', authMiddleware, adminMiddleware, createAdmin);

// PATCH /api/auth/admin/approve/:id - Approve a pending member (admin only)
router.patch('/admin/approve/:id', authMiddleware, adminMiddleware, approveMember);

// DELETE /api/auth/admin/reject/:id - Reject a pending member (admin only)
router.delete('/admin/reject/:id', authMiddleware, adminMiddleware, rejectMember);

// GET /api/auth/admin/members - List all members including pending (admin only)
router.get('/admin/members', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const Member = require('../Models/Member');
    const members = await Member.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/profile/leetcode - Link LeetCode username (member-protected)
router.patch('/profile/leetcode', authMiddleware, linkLeetcode);

// PATCH /api/auth/profile/codeforces - Update Codeforces handle (member-protected)
router.patch('/profile/codeforces', authMiddleware, updateCodeforcesHandle);

// DELETE /api/auth/admin/members/:id - Permanently remove a member (admin only)
router.delete('/admin/members/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const Member = require('../Models/Member');
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }
    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member permanently removed.' });
  } catch (err) { next(err); }
});

module.exports = router;
