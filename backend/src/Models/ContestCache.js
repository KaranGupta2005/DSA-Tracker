const mongoose = require('mongoose');

const contestCacheSchema = new mongoose.Schema({
  platform: { type: String, enum: ['codeforces', 'leetcode'], required: true },
  contests: [{
    name: String,
    startTime: Date,
    duration: Number, // in seconds
    url: String
  }],
  lastFetchedAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ContestCache', contestCacheSchema);
