const mongoose = require('mongoose');

const dailyProblemSchema = new mongoose.Schema({
  contestId: { type: Number, required: true },
  index: { type: String, required: true },
  name: { type: String, required: true },
  rating: { type: Number, default: 0 },
  url: { type: String, default: null },
  platform: { type: String, enum: ['codeforces', 'leetcode'], default: 'codeforces' },
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD (UTC)
  completions: [{ memberId: mongoose.Schema.Types.ObjectId, completedAt: Date }]
}, { timestamps: true });

module.exports = mongoose.model('DailyProblem', dailyProblemSchema);
