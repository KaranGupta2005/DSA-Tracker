const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const contestController = require('../controllers/contestController');

// GET /api/contests/upcoming - Fetch upcoming CF + LC contests (member)
router.get('/upcoming', authMiddleware, contestController.getUpcoming);

// POST /api/contests/subscribe - Subscribe to push notifications (member)
router.post('/subscribe', authMiddleware, contestController.subscribe);

// POST /api/contests/test-notification - Send a test push notification (admin)
router.post('/test-notification', authMiddleware, async (req, res, next) => {
  try {
    const { sendPushNotification } = require('../services/pushNotificationService');
    const Member = require('../Models/Member');
    
    const member = await Member.findById(req.user.memberId);
    if (!member || !member.pushSubscription) {
      return res.status(400).json({ error: { code: 'NO_SUBSCRIPTION', message: 'No push subscription found. Subscribe to notifications first.' } });
    }

    const payload = {
      title: '🔔 Test Notification',
      body: 'Push notifications are working! You will receive contest reminders here.',
      url: '/contests',
    };

    const success = await sendPushNotification(member.pushSubscription, payload);
    if (success) {
      res.json({ message: 'Test notification sent successfully!' });
    } else {
      res.status(500).json({ error: { code: 'PUSH_FAILED', message: 'Failed to send notification. Your subscription may be invalid.' } });
    }
  } catch (err) { next(err); }
});

module.exports = router;
