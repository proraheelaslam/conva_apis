const mongoose = require('mongoose');

const industrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for name and category to ensure uniqueness within category
industrySchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Industry', industrySchema);
