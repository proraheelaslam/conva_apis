const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  label: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Activity', activitySchema);
