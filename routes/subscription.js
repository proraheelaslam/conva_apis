const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Package = require('../models/Package');
const User = require('../models/User');

// Get user's active subscription
router.get('/my-subscription', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'User ID is required'
      });
    }

    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    }).populate('package', 'name description features packageType');

    if (!subscription) {
      return res.status(404).json({
        status: 404,
        message: 'No active subscription found'
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Subscription fetched successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to fetch subscription',
      error: error.message
    });
  }
});

// Create new subscription
router.post('/subscribe', async (req, res) => {
  try {
    const {
      userId,
      packageId,
      paymentMethod,
      transactionId,
      autoRenew = false
    } = req.body;

    // Validation
    if (!userId || !packageId || !paymentMethod || !transactionId) {
      return res.status(400).json({
        status: 400,
        message: 'User ID, package ID, payment method, and transaction ID are required'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'User not found'
      });
    }

    // Check if package exists
    const package = await Package.findById(packageId);
    if (!package || !package.isActive) {
      return res.status(404).json({
        status: 404,
        message: 'Package not found or inactive'
      });
    }

    // Check for existing active subscription
    const existingSubscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    });

    if (existingSubscription) {
      return res.status(400).json({
        status: 400,
        message: 'User already has an active subscription'
      });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    
    switch (package.duration) {
      case '1M':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case '3M':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case '6M':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case '1Y':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create subscription
    const subscription = new Subscription({
      user: userId,
      package: packageId,
      status: 'active',
      startDate,
      endDate,
      paymentMethod,
      transactionId,
      amount: package.price,
      features: package.features,
      autoRenew
    });

    const savedSubscription = await subscription.save();
    
    // Populate package details
    const populatedSubscription = await Subscription.findById(savedSubscription._id)
      .populate('package', 'name description features packageType')
      .populate('user', 'name email');

    res.status(200).json({
      status: 200,
      message: 'Subscription created successfully',
      data: populatedSubscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to create subscription',
      error: error.message
    });
  }
});

// Cancel subscription
router.post('/cancel', async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'User ID is required'
      });
    }

    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({
        status: 404,
        message: 'No active subscription found'
      });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason || 'User requested cancellation';
    subscription.autoRenew = false;

    await subscription.save();

    res.status(200).json({
      status: 200,
      message: 'Subscription cancelled successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
});

// Get subscription history
router.get('/history', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'User ID is required'
      });
    }

    const subscriptions = await Subscription.find({ user: userId })
      .populate('package', 'name description packageType')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 200,
      message: 'Subscription history fetched successfully',
      data: subscriptions
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to fetch subscription history',
      error: error.message
    });
  }
});

// Admin: Get all subscriptions
router.get('/admin/all', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    
    const [subscriptions, totalCount] = await Promise.all([
      Subscription.find(filter)
        .populate('user', 'name email profileType')
        .populate('package', 'name description packageType price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Subscription.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 200,
      message: 'Subscriptions fetched successfully',
      data: {
        subscriptions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: skip + subscriptions.length < totalCount,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to fetch subscriptions',
      error: error.message
    });
  }
});

// Admin: Get subscription stats
router.get('/admin/stats', async (req, res) => {
  try {
    const [
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      totalRevenue
    ] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      Subscription.aggregate([
        { $match: { status: { $in: ['active', 'expired'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const stats = {
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      totalRevenue: totalRevenue[0]?.total || 0,
      activeSubscriptionPercentage: totalSubscriptions > 0 ? 
        ((activeSubscriptions / totalSubscriptions) * 100).toFixed(2) : 0
    };

    res.status(200).json({
      status: 200,
      message: 'Subscription stats fetched successfully',
      data: stats
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to fetch subscription stats',
      error: error.message
    });
  }
});

module.exports = router;
