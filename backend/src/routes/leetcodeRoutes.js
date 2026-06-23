const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const leetcodeController = require('../controllers/leetcodeController');

// All routes require authentication
router.use(authMiddleware);

// GET /api/leetcode/sync/:username - Full profile sync
router.get('/sync/:username', leetcodeController.sync);

// GET /api/leetcode/stats/:username - Difficulty stats only
router.get('/stats/:username', leetcodeController.getStats);

// GET /api/leetcode/submissions/:username - Recent accepted submissions
router.get('/submissions/:username', leetcodeController.getSubmissions);

// GET /api/leetcode/streak/:username - Current streak
router.get('/streak/:username', leetcodeController.getStreak);

module.exports = router;
