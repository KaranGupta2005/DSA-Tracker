const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { aiRateLimit } = require('../middleware/rateLimitMiddleware');
const aiController = require('../controllers/aiController');

// POST /report - Generate AI performance report (member access, rate-limited)
router.post('/report', authMiddleware, aiRateLimit, aiController.getReport);

module.exports = router;
