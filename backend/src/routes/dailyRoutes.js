const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { setProblem, getToday, getHistory } = require('../controllers/dailyProblemController');

// POST /api/daily/set - Admin only: set today's daily problem
router.post('/set', authMiddleware, adminMiddleware, setProblem);

// GET /api/daily/today - Member: get today's problem
router.get('/today', authMiddleware, getToday);

// GET /api/daily/history - Member: get last 7 problems
router.get('/history', authMiddleware, getHistory);

module.exports = router;
