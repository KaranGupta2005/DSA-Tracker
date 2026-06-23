const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const leaderboardController = require('../controllers/leaderboardController');

// GET / - Get ranked leaderboard (all-time, member access)
router.get('/', authMiddleware, leaderboardController.getLeaderboard);

// GET /filter - Get filtered leaderboard by period (member access)
router.get('/filter', authMiddleware, leaderboardController.getFilteredLeaderboard);

// POST /sync/:memberId - Trigger score recalculation (system/authenticated access)
router.post('/sync/:memberId', authMiddleware, leaderboardController.syncScore);

module.exports = router;
