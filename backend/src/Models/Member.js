const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  codeforcesHandle: { type: String, required: true, unique: true },
  leetcodeUsername: { type: String, default: null },
  password: { type: String, required: true },
  status: { type: String, enum: ['pending', 'active'], default: 'pending' },
  role: { type: String, enum: ['member', 'admin'], default: 'member' },
  avatar: { type: String },
  codeforcesRating: { type: Number, default: null },
  codeforcesRank: { type: String, default: 'Unrated' },
  leetcodeRating: { type: Number, default: 0 },
  leetcodeStats: {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
    tags: { type: Map, of: Number, default: {} }
  },
  currentStreak: { type: Number, default: 0 },
  activityScore: { type: Number, default: 0 },
  lastSyncedAt: { type: Date, default: null },
  pushSubscription: { type: Object, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Member', memberSchema);
