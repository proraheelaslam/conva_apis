const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    source: { type: String, enum: ['topup', 'subscription', 'purchase', 'refund', 'referral', 'adjustment'], default: 'topup' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    description: { type: String, default: '' }
  },
  { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
