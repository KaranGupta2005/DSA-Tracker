const mongoose = require('mongoose');

const sessionProgressSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  completedModules: [{
    moduleId: { type: String, required: true },
    completedAt: { type: Date, required: true }
  }],
  totalModules: { type: Number, required: true },
  completionPercentage: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SessionProgress', sessionProgressSchema);
