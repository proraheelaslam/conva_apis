const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  lastMessageAt: { type: Date },
}, {
  timestamps: true
});

// Always keep a unique pair regardless of order
matchSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Helper to keep pair order consistent (smaller id first)
matchSchema.pre('validate', function(next) {
  if (this.user1 && this.user2 && this.user1.toString() > this.user2.toString()) {
    const tmp = this.user1;
    this.user1 = this.user2;
    this.user2 = tmp;
  }
  next();
});

module.exports = mongoose.model('Match', matchSchema);
