/**
 * VAPID Key Generation Utility
 *
 * Run this script once to generate VAPID keys for web push notifications:
 *   node src/utils/generateVapidKeys.js
 *
 * Then add the output to your .env file.
 */
const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@ieeedtu.in`);
