const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { setProblem, getToday, getHistory, checkCompletion } = require('../controllers/dailyProblemController');

// POST /api/daily/set - Admin only: set today's daily problem
router.post('/set', authMiddleware, adminMiddleware, setProblem);

// DELETE /api/daily/today - Admin only: delete today's daily problem
router.delete('/today', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const DailyProblem = require('../Models/DailyProblem');
    const todayStr = new Date().toISOString().split('T')[0];
    const result = await DailyProblem.findOneAndDelete({ date: todayStr });
    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No daily problem set for today.' } });
    }
    res.json({ message: 'Today\'s daily problem deleted successfully.' });
  } catch (err) { next(err); }
});

// GET /api/daily/today - Member: get today's problem
router.get('/today', authMiddleware, getToday);

// GET /api/daily/history - Member: get last 7 problems
router.get('/history', authMiddleware, getHistory);

// GET /api/daily/check/:handle - Member: check daily problem completion
router.get('/check/:handle', authMiddleware, checkCompletion);

// GET /api/daily/completions - Admin only: get today's completions with member handles
router.get('/completions', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const DailyProblem = require('../Models/DailyProblem');
    const Member = require('../Models/Member');
    const todayStr = new Date().toISOString().split('T')[0];
    const problem = await DailyProblem.findOne({ date: todayStr });
    if (!problem) return res.json({ completions: [], total: 0 });

    // Populate member handles from completions
    const completionsWithHandles = await Promise.all(
      problem.completions.map(async (c) => {
        const member = await Member.findById(c.memberId).select('codeforcesHandle leetcodeUsername');
        return {
          memberId: c.memberId,
          codeforcesHandle: member?.codeforcesHandle || 'Unknown',
          leetcodeUsername: member?.leetcodeUsername || null,
          completedAt: c.completedAt,
        };
      })
    );

    res.json({ completions: completionsWithHandles, total: completionsWithHandles.length, problemName: problem.name });
  } catch (err) { next(err); }
});

// POST /api/daily/self-complete - Member: self-report completion for LeetCode problems
router.post('/self-complete', authMiddleware, async (req, res, next) => {
  try {
    const DailyProblem = require('../Models/DailyProblem');
    const todayStr = new Date().toISOString().split('T')[0];
    const problem = await DailyProblem.findOne({ date: todayStr });
    if (!problem) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No daily problem set for today.' } });

    const alreadyCompleted = problem.completions.some(c => c.memberId.toString() === req.user.memberId.toString());
    if (alreadyCompleted) return res.json({ message: 'Already marked as completed.', solved: true });

    problem.completions.push({ memberId: req.user.memberId, completedAt: new Date() });
    await problem.save();
    res.json({ message: 'Marked as completed!', solved: true });
  } catch (err) { next(err); }
});

module.exports = router;
