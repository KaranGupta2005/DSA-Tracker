const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const codeforcesController = require('../controllers/codeforcesController');

// GET /api/codeforces/profile/:handle - Fetch CF profile (rating, rank, avatar)
router.get('/profile/:handle', authMiddleware, codeforcesController.getProfile);

// GET /api/codeforces/contests/:handle - Fetch recent contest history (max 5)
router.get('/contests/:handle', authMiddleware, codeforcesController.getContestHistory);

// POST /api/codeforces/check-problem - Check if a handle solved a specific problem
router.post('/check-problem', authMiddleware, codeforcesController.checkProblem);

// POST /api/codeforces/check-all - Check all active members for problem completion (admin only)
router.post('/check-all', authMiddleware, adminMiddleware, codeforcesController.checkAll);

module.exports = router;
