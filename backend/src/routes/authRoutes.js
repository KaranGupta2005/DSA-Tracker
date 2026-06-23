const express = require('express');
const router = express.Router();
const { register, login, adminLogin, createAdmin, linkLeetcode, approveMember, rejectMember } = require('../controllers/authController');
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

// PATCH /api/auth/profile/leetcode - Link LeetCode username (member-protected)
router.patch('/profile/leetcode', authMiddleware, linkLeetcode);

module.exports = router;
