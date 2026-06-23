const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { aiRateLimit } = require('../middleware/rateLimitMiddleware');
const aiController = require('../controllers/aiController');

// POST /report - Generate AI performance report (member access, rate-limited)
router.post('/report', authMiddleware, aiRateLimit, aiController.getReport);

// POST /session/content - Generate AI-powered topic content (member access, rate-limited)
// Body: { topic: string }
// Returns: { topic, explanations, talkingPoints, exampleCode, generatedAt }
// On AI unavailability: 503 with message and retainPrevious flag
router.post('/session/content', authMiddleware, aiRateLimit, aiController.getSessionContent);

// POST /session/questions - Generate AI-powered practice questions (member access, rate-limited)
// Body: { topic: string }
// Returns: { topic, questions: [{question, answer}], generatedAt }
// On AI unavailability: 503 with message and retainPrevious flag
router.post('/session/questions', authMiddleware, aiRateLimit, aiController.getSessionQuestions);

module.exports = router;
