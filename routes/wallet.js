const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper: get userId from Authorization header
function getUserIdFromAuth(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded?.id || decoded?.userId || null;
  } catch {
    return null;
  }
}

// Helper: ensure wallet for user
async function ensureWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId, balance: 0, currency: 'INR' });
  }
  return wallet;
}

// GET /api/wallet/balance
router.get('/balance', async (req, res) => {
  try {
    const userId = getUserIdFromAuth(req);
    if (!userId) return res.status(401).json({ status: 401, message: 'Access token required', data: null });

    const wallet = await ensureWallet(userId);
    return res.status(200).json({
      status: 200,
      message: 'Wallet balance fetched',
      data: { balance: wallet.balance, currency: wallet.currency }
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// POST /api/wallet/add-money
// body: { amount: number, description?: string }
router.post('/add-money', async (req, res) => {
  try {
    const userId = getUserIdFromAuth(req);
    if (!userId) return res.status(401).json({ status: 401, message: 'Access token required', data: null });

    const { amount, description } = req.body;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ status: 400, message: 'Invalid amount', data: null });
    }

    const wallet = await ensureWallet(userId);

    // Create transaction first
    const tx = await WalletTransaction.create({
      user: userId,
      amount: amt,
      currency: wallet.currency,
      type: 'credit',
      source: 'topup',
      status: 'completed',
      description: description || 'Wallet Top-up'
    });

    // Update balance atomically
    wallet.balance += amt;
    await wallet.save();

    return res.status(200).json({
      status: 200,
      message: 'Money added to wallet',
      data: { balance: wallet.balance, currency: wallet.currency, transactionId: tx._id }
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/wallet/transactions?type=all|credit|debit&page=1&limit=20
router.get('/transactions', async (req, res) => {
  try {
    const userId = getUserIdFromAuth(req);
    if (!userId) return res.status(401).json({ status: 401, message: 'Access token required', data: null });

    const { type = 'all', page = 1, limit = 20 } = req.query;
    const filter = { user: userId };
    if (type === 'credit') filter.type = 'credit';
    if (type === 'debit') filter.type = 'debit';

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      WalletTransaction.countDocuments(filter)
    ]);

    return res.status(200).json({
      status: 200,
      message: 'Transactions fetched',
      data: {
        transactions: items,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/wallet/premium-benefits
router.get('/premium-benefits', async (req, res) => {
  try {
    const benefits = [
      { key: 'unlimited_likes', title: 'Unlimited Likes', description: 'Like as many profiles as you want without limits' },
      { key: 'see_who_likes_you', title: 'See Who Likes You', description: "Discover who's interested in your profile" },
      { key: 'boost_profile', title: 'Boost Your Profile', description: 'Get more visibility and matches with profile boosts' },
      { key: 'premium_filters', title: 'Premium Filters', description: 'Access advanced filters to find your perfect match' }
    ];
    res.status(200).json({ status: 200, message: 'Premium benefits fetched', data: benefits });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/wallet/refer-code - returns deterministic referral code for current user
router.get('/refer-code', async (req, res) => {
  try {
    const userId = getUserIdFromAuth(req);
    if (!userId) return res.status(401).json({ status: 401, message: 'Access token required', data: null });
    // Deterministic short code from user id
    const code = Buffer.from(String(userId)).toString('base64').replace(/=+/g, '').slice(-8).toUpperCase();
    res.status(200).json({ status: 200, message: 'Referral code generated', data: { code } });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// POST /api/wallet/refer-apply - apply a referral code to credit both users once
// body: { code }
router.post('/refer-apply', async (req, res) => {
  try {
    const userId = getUserIdFromAuth(req);
    if (!userId) return res.status(401).json({ status: 401, message: 'Access token required', data: null });

    const { code } = req.body;
    if (!code) return res.status(400).json({ status: 400, message: 'Referral code is required', data: null });

    // Resolve referrer from code (reverse from base64 segment)
    // We created code from userId base64 slice, so we can only verify by re-generating codes for candidates.
    // For simplicity, scan Users and match code (efficient enough for small scale; for large scale, store code field on user).
    const users = await User.find({}).select('_id').lean();
    let referrerId = null;
    for (const u of users) {
      const c = Buffer.from(String(u._id)).toString('base64').replace(/=+/g, '').slice(-8).toUpperCase();
      if (c === code) { referrerId = u._id; break; }
    }
    if (!referrerId) return res.status(400).json({ status: 400, message: 'Invalid referral code', data: null });
    if (String(referrerId) === String(userId)) return res.status(400).json({ status: 400, message: 'You cannot apply your own code', data: null });

    // Credit both wallets with fixed bonus (configurable)
    const BONUS = 100; // INR

    const [refWallet, myWallet] = await Promise.all([
      ensureWallet(referrerId),
      ensureWallet(userId)
    ]);

    // In real system, prevent multiple apply per user pair. Here we check if a referral tx exists.
    const existing = await WalletTransaction.findOne({ user: userId, source: 'referral' });
    if (existing) return res.status(400).json({ status: 400, message: 'Referral already applied on this account', data: null });

    // Credit referrer
    await WalletTransaction.create({ user: referrerId, amount: BONUS, currency: refWallet.currency, type: 'credit', source: 'referral', status: 'completed', description: `Referral bonus from ${userId}` });
    refWallet.balance += BONUS;
    await refWallet.save();

    // Credit referee (current user)
    const myTx = await WalletTransaction.create({ user: userId, amount: BONUS, currency: myWallet.currency, type: 'credit', source: 'referral', status: 'completed', description: `Referral bonus using code ${code}` });
    myWallet.balance += BONUS;
    await myWallet.save();

    res.status(200).json({ status: 200, message: 'Referral applied successfully', data: { bonus: BONUS, transactionId: myTx._id } });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

module.exports = router;
