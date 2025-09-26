const mongoose = require('mongoose');

const swipeSchema = new mongoose.Schema({
  swiper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['like', 'dislike', 'superlike'], required: true },
}, {
  timestamps: true
});

// A user can only have one swipe decision per other user
swipeSchema.index({ swiper: 1, target: 1 }, { unique: true });
// For fast queries
swipeSchema.index({ target: 1, action: 1 });

module.exports = mongoose.model('Swipe', swipeSchema);
