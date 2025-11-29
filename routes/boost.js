const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middlewares/auth');

// GET /api/boost/status - Get current boost status
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('boostCredits isBoostActive boostStartTime boostEndTime boostDuration totalBoostsPurchased totalBoostsUsed');
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }
    
    // Check if boost has expired
    if (user.isBoostActive && user.boostEndTime && new Date() > user.boostEndTime) {
      user.isBoostActive = false;
      user.boostStartTime = null;
      user.boostEndTime = null;
      await user.save();
    }
    
    return res.status(200).json({
      status: true,
      message: 'Boost status fetched successfully',
      data: {
      boostCredits: user.boostCredits || 0,
      isBoostActive: user.isBoostActive || false,
      boostStartTime: user.boostStartTime || null,
      boostEndTime: user.boostEndTime || null,
      boostDuration: user.boostDuration || 180,
        totalBoostsPurchased: user.totalBoostsPurchased || 0,
        totalBoostsUsed: user.totalBoostsUsed || 0,
        remainingTime: user.isBoostActive && user.boostEndTime 
          ? Math.max(0, Math.ceil((new Date(user.boostEndTime) - new Date()) / 1000 / 60))
          : 0
      }
    });
  } catch (error) {
    console.error('Get boost status error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/boost/purchase - Purchase boost credits and auto-activate
router.post('/purchase', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { package: packageType, paymentMethod, transactionId, duration } = req.body;
    
    // Validate package type
    const packages = {
      'boost_3': { credits: 3, price: 99, name: '₹99 for 3 Boosts' },
      'boost_5': { credits: 5, price: 149, name: '₹149 for 5 Boosts' },
      'boost_10': { credits: 10, price: 249, name: '₹249 for 10 Boosts' }
    };
    
    const selectedPackage = packages[packageType];
    
    if (!selectedPackage) {
      return res.status(400).json({
        status: false,
        message: 'Invalid package type. Available: boost_3, boost_5, boost_10'
      });
    }
    
    // TODO: Verify payment here with payment gateway
    // For now, just adding credits
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }
    
    // Check for duplicate purchase (if transactionId is provided)
    if (transactionId) {
      const existingTransactions = user.boostPurchaseTransactions || [];
      if (existingTransactions.includes(transactionId)) {
        return res.status(400).json({
          status: false,
          message: 'This purchase has already been processed.',
          data: {
            transactionId: transactionId,
            alreadyPurchased: true
          }
        });
      }
    }
    
    // Generate transaction ID if not provided
    const finalTransactionId = transactionId || 'demo_transaction_' + Date.now();
    
    // Add boost credits
    const oldCredits = user.boostCredits || 0;
    user.boostCredits = oldCredits + selectedPackage.credits;
    user.totalBoostsPurchased = (user.totalBoostsPurchased || 0) + selectedPackage.credits;
    
    // Save transaction ID to prevent duplicate purchases
    if (!user.boostPurchaseTransactions) {
      user.boostPurchaseTransactions = [];
    }
    user.boostPurchaseTransactions.push(finalTransactionId);
    
    // Always activate new boost on purchase (even if one is already active)
    // This ensures user appears at top every time they purchase
    let boostActivated = false;
    let boostData = null;
    const hadActiveBoost = user.isBoostActive && user.boostEndTime && new Date() < new Date(user.boostEndTime);
    
    // Set boost duration (default 180 minutes = 3 hours)
    const boostDuration = duration || user.boostDuration || 180;
    const now = new Date();
    const endTime = new Date(now.getTime() + boostDuration * 60 * 1000);
    
    // Activate boost (consume 1 credit)
    if (user.boostCredits > 0) {
      // End current boost if active (new purchase = new boost activation)
      user.isBoostActive = false;
      user.boostStartTime = null;
      user.boostEndTime = null;
      
      // Activate new boost
      user.boostCredits -= 1;
      user.isBoostActive = true;
      user.boostStartTime = now;
      user.boostEndTime = endTime;
      user.boostDuration = boostDuration;
      user.totalBoostsUsed = (user.totalBoostsUsed || 0) + 1;
      boostActivated = true;
      
      boostData = {
        isBoostActive: true,
        boostStartTime: user.boostStartTime,
        boostEndTime: user.boostEndTime,
        boostDuration: boostDuration,
        remainingMinutes: boostDuration,
        previousBoostEnded: hadActiveBoost
      };
    }
    
    await user.save();
    
    return res.status(200).json({
      status: true,
      message: boostActivated 
        ? (hadActiveBoost 
          ? 'Boost credits purchased and new boost activated (previous boost ended)' 
          : 'Boost credits purchased and activated successfully')
        : 'Boost credits purchased successfully',
      data: {
        package: selectedPackage.name,
        creditsAdded: selectedPackage.credits,
        totalCredits: user.boostCredits,
        price: selectedPackage.price,
        transactionId: finalTransactionId,
        boostActivated: boostActivated,
        boost: boostData
      }
    });
  } catch (error) {
    console.error('Purchase boost error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/boost/activate - Activate boost
router.post('/activate', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { duration } = req.body; // Duration in minutes (default 180 = 3 hours)
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }
    
    // Check if user has boost credits
    if (!user.boostCredits || user.boostCredits <= 0) {
      return res.status(400).json({
        status: false,
        message: 'No boost credits available. Please purchase boost credits first.',
        data: {
          boostCredits: 0
        }
      });
    }
    
    // Check if boost is already active
    if (user.isBoostActive && user.boostEndTime && new Date() < user.boostEndTime) {
      const remainingMinutes = Math.ceil((new Date(user.boostEndTime) - new Date()) / 1000 / 60);
      return res.status(400).json({
        status: false,
        message: 'Boost is already active',
        data: {
          isBoostActive: true,
          remainingMinutes: remainingMinutes,
          boostEndTime: user.boostEndTime
        }
      });
    }
    
    // Set boost duration (default 180 minutes = 3 hours)
    const boostDuration = duration || user.boostDuration || 180;
    const now = new Date();
    const endTime = new Date(now.getTime() + boostDuration * 60 * 1000);
    
    // Activate boost
    user.boostCredits -= 1;
    user.isBoostActive = true;
    user.boostStartTime = now;
    user.boostEndTime = endTime;
    user.boostDuration = boostDuration;
    user.totalBoostsUsed = (user.totalBoostsUsed || 0) + 1;
    await user.save();
    
    return res.status(200).json({
      status: true,
      message: 'Boost activated successfully',
      data: {
        isBoostActive: true,
        boostStartTime: user.boostStartTime,
        boostEndTime: user.boostEndTime,
        boostDuration: boostDuration,
        remainingCredits: user.boostCredits
      }
    });
  } catch (error) {
    console.error('Activate boost error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/boost/deactivate - Manually deactivate boost
router.post('/deactivate', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }
    
    if (!user.isBoostActive) {
      return res.status(400).json({
        status: false,
        message: 'No active boost to deactivate'
      });
    }
    
    // Deactivate boost
    user.isBoostActive = false;
    user.boostStartTime = null;
    user.boostEndTime = null;
    await user.save();
    
    return res.status(200).json({
      status: true,
      message: 'Boost deactivated successfully',
      data: {
        isBoostActive: false,
        remainingCredits: user.boostCredits
      }
    });
  } catch (error) {
    console.error('Deactivate boost error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/boost/packages - Get available boost packages
router.get('/packages', auth, async (req, res) => {
  try {
    const packages = [
      {
        id: 'boost_3',
        name: '3 Boosts',
        price: 99,
        currency: 'INR',
        credits: 3,
        description: 'Get 3 boost credits',
        popular: false
      },
      {
        id: 'boost_5',
        name: '5 Boosts',
        price: 149,
        currency: 'INR',
        credits: 5,
        description: 'Get 5 boost credits',
        popular: true,
        savings: '₹20 saved'
      },
      {
        id: 'boost_10',
        name: '10 Boosts',
        price: 249,
        currency: 'INR',
        credits: 10,
        description: 'Get 10 boost credits',
        popular: false,
        savings: '₹81 saved'
      }
    ];
    
    return res.status(200).json({
      status: true,
      message: 'Boost packages fetched successfully',
      data: packages
    });
  } catch (error) {
    console.error('Get packages error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;

