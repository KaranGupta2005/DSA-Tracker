require('dotenv').config();
const webPush = require('web-push');
const mongoose = require('mongoose');

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Member = require('./src/Models/Member');

  const members = await Member.find({ pushSubscription: { $ne: null }, status: 'active' });
  console.log(`Subscribers: ${members.length}\n`);

  const payload = JSON.stringify({
    title: '🎯 IEEE DTU DSA Tracker',
    body: 'App updated! Visit your dashboard to sync your LC & CF ratings. Leaderboard now sorts by CF Rating & LC Rating. Contest reminders coming soon!',
    url: '/dashboard'
  });

  let sent = 0, failed = 0;
  for (const m of members) {
    try {
      await webPush.sendNotification(m.pushSubscription, payload);
      console.log(`✅ ${m.codeforcesHandle}`);
      sent++;
    } catch (err) {
      console.log(`❌ ${m.codeforcesHandle} - ${err.statusCode || err.message}`);
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        await Member.findByIdAndUpdate(m._id, { pushSubscription: null });
      }
    }
  }

  console.log(`\nDone: ${sent} sent, ${failed} failed`);
  await mongoose.disconnect();
}

run();
