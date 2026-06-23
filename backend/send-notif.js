require('dotenv').config();
const webPush = require('web-push');
const mongoose = require('mongoose');
webPush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
const title = process.argv[2] || 'IEEE DTU DSA Tracker';
const body = process.argv[3] || 'Push notifications live! Contest reminders 2hrs before every CF and LC contest.';
console.log('Connecting...');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Member = require('./src/Models/Member');
  const members = await Member.find({ status: 'active' });
  const subscribed = members.filter(m => m.pushSubscription != null);
  console.log('Subscribed:', subscribed.length);
  const payload = JSON.stringify({ title, body, url: '/contests' });
  let sent = 0;
  for (const m of subscribed) {
    try {
      await webPush.sendNotification(m.pushSubscription, payload);
      console.log('OK:', m.codeforcesHandle);
      sent++;
    } catch (err) {
      console.log('FAIL:', m.codeforcesHandle, err.statusCode || err.message);
      if (err.statusCode === 410 || err.statusCode === 404) { m.pushSubscription = null; await m.save(); }
    }
  }
  console.log('Sent:', sent);
  process.exit(0);
}).catch(err => { console.error('Error:', err.message); process.exit(1); });
