const webPush = require('web-push');
const Member = require('../Models/Member');
const ContestCache = require('../Models/ContestCache');

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Sends a push notification to a single subscription.
 * @param {object} subscription - The PushSubscription object { endpoint, keys: { p256dh, auth } }
 * @param {object} payload - The notification payload { title, body, url }
 * @returns {Promise<boolean>} true if sent successfully, false if subscription is invalid
 */
async function sendPushNotification(subscription, payload) {
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    // 410 Gone or 404 means the subscription is no longer valid
    if (error.statusCode === 410 || error.statusCode === 404) {
      return false;
    }
    // For other errors, log but don't remove the subscription
    console.error('Push notification error:', error.message);
    return false;
  }
}

/**
 * Finds contests starting within 1 hour and sends push notifications
 * to all subscribed members.
 */
async function notifyUpcomingContests() {
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Fetch cached contests from both platforms
  const cachedContests = await ContestCache.find({});
  const upcomingContests = [];

  for (const cache of cachedContests) {
    for (const contest of cache.contests) {
      const startTime = new Date(contest.startTime);
      // Contest starts within 2 hours but hasn't started yet
      if (startTime > now && startTime <= twoHoursFromNow) {
        upcomingContests.push({
          name: contest.name,
          startTime: contest.startTime,
          duration: contest.duration,
          url: contest.url,
          platform: cache.platform,
        });
      }
    }
  }

  if (upcomingContests.length === 0) {
    return { notified: 0, contests: 0 };
  }

  // Find all members with push subscriptions
  const subscribedMembers = await Member.find({
    pushSubscription: { $ne: null },
    status: 'active',
  });

  let notifiedCount = 0;
  const invalidSubscriptionIds = [];

  for (const contest of upcomingContests) {
    const startTime = new Date(contest.startTime);
    const now = new Date();
    const minsUntil = Math.round((startTime - now) / (60 * 1000));
    const timeStr = minsUntil >= 60
      ? `${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`
      : `${minsUntil} min`;

    const platformName = contest.platform === 'codeforces' ? 'Codeforces' : 'LeetCode';

    const payload = {
      title: `⏰ ${platformName} Contest in ${timeStr}!`,
      body: `${contest.name} starts soon. Get ready!`,
      url: contest.url || '/contests',
    };

    for (const member of subscribedMembers) {
      const success = await sendPushNotification(member.pushSubscription, payload);
      if (success) {
        notifiedCount++;
      } else {
        if (!invalidSubscriptionIds.includes(member._id.toString())) {
          invalidSubscriptionIds.push(member._id.toString());
        }
      }
    }
  }

  // Remove invalid subscriptions
  if (invalidSubscriptionIds.length > 0) {
    await Member.updateMany(
      { _id: { $in: invalidSubscriptionIds } },
      { $set: { pushSubscription: null } }
    );
  }

  return {
    notified: notifiedCount,
    contests: upcomingContests.length,
    invalidSubscriptionsRemoved: invalidSubscriptionIds.length,
  };
}

module.exports = {
  sendPushNotification,
  notifyUpcomingContests,
};
