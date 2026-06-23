const contestService = require('../services/contestService');

/**
 * GET /api/contests/upcoming
 * Fetches upcoming contests from Codeforces and LeetCode with caching.
 */
const getUpcoming = async (req, res, next) => {
  try {
    const result = await contestService.getUpcomingContests();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/contests/subscribe
 * Subscribes the authenticated member to push notifications for contests.
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 */
const subscribe = async (req, res, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid push subscription object with an endpoint is required.',
          details: {},
        },
      });
    }

    await contestService.subscribeMember(req.user.memberId, subscription);
    res.json({ message: 'Successfully subscribed to contest notifications.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUpcoming, subscribe };
