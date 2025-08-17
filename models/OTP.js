const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  otp: { type: String, required: true },
  isUsed: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 }
}, { timestamps: true });

// Index for quick lookup and automatic cleanup
otpSchema.index({ phoneNumber: 1, isUsed: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
