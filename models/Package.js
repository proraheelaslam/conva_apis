const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: String,
    required: true,
    enum: ['1M', '3M', '6M', '1Y'], // 1 Month, 3 Months, 6 Months, 1 Year
    default: '1M'
  },
  features: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: ''
    }
  }],
  packageType: {
    type: String,
    enum: ['basic', 'premium', 'full'],
    default: 'basic'
  },
  isBestValue: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
packageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Package', packageSchema);
