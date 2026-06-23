const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getCurriculum, getProgress, completeModule, getTimeline } = require('../controllers/sessionPrepController');

// GET /api/session-prep/curriculum - Member: get structured curriculum
router.get('/curriculum', authMiddleware, getCurriculum);

// GET /api/session-prep/progress - Member: get session progress
router.get('/progress', authMiddleware, getProgress);

// POST /api/session-prep/complete - Member: mark a module as complete
router.post('/complete', authMiddleware, completeModule);

// GET /api/session-prep/timeline - Member: get milestone timeline
router.get('/timeline', authMiddleware, getTimeline);

module.exports = router;
