const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const contestController = require('../controllers/contestController');

// GET /api/contests/upcoming - Fetch upcoming CF + LC contests (member)
router.get('/upcoming', authMiddleware, contestController.getUpcoming);

// POST /api/contests/subscribe - Subscribe to push notifications (member)
router.post('/subscribe', authMiddleware, contestController.subscribe);

module.exports = router;
