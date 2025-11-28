const express = require('express');
const router = express.Router();
const { sendNotification, sendNotificationToMultiple } = require('../helpers/notificationHelper');
const User = require('../models/User');
const auth = require('../middlewares/auth');

// POST /api/notification/test - Test notification with device token
router.post('/test', async (req, res) => {
  try {
    const { deviceToken, title, body, data } = req.body;

    // Validate device token
    if (!deviceToken || deviceToken === '') {
      return res.status(400).json({
        status: false,
        message: 'deviceToken is required for testing'
      });
    }

    // Default test notification
    const notificationData = {
      title: title || '🔔 Test Notification',
      body: body || 'This is a test notification from Conva Backend!',
      data: data || {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    // Send notification
    const result = await sendNotification(deviceToken, notificationData);

    if (result.success) {
      return res.status(200).json({
        status: true,
        message: 'Test notification sent successfully!',
        data: {
          deviceToken: deviceToken,
          notification: notificationData,
          result: result
        }
      });
    } else {
      return res.status(500).json({
        status: false,
        message: 'Failed to send test notification',
        error: result.message || result.error
      });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/notification/test-to-user - Test notification to registered user
router.post('/test-to-user', async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: false,
        message: 'userId is required'
      });
    }

    // Find user and get device token
    const user = await User.findById(userId).select('name deviceToken');

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }

    if (!user.deviceToken) {
      return res.status(400).json({
        status: false,
        message: 'User does not have a device token registered'
      });
    }

    // Send notification
    const result = await sendNotification(user.deviceToken, {
      title: title || '🔔 Test Notification',
      body: body || `Hi ${user.name}, this is a test notification!`,
      data: {
        type: 'test',
        userId: String(userId),
        timestamp: new Date().toISOString()
      }
    });

    if (result.success) {
      return res.status(200).json({
        status: true,
        message: 'Test notification sent to user successfully!',
        data: {
          user: {
            id: user._id,
            name: user.name
          },
          result: result
        }
      });
    } else {
      return res.status(500).json({
        status: false,
        message: 'Failed to send notification',
        error: result.message || result.error
      });
    }
  } catch (error) {
    console.error('Test notification to user error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/notification/test-multiple - Test notification to multiple devices
router.post('/test-multiple', async (req, res) => {
  try {
    const { deviceTokens, title, body } = req.body;

    if (!deviceTokens || !Array.isArray(deviceTokens) || deviceTokens.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'deviceTokens array is required'
      });
    }

    const result = await sendNotificationToMultiple(deviceTokens, {
      title: title || '🔔 Test Notification',
      body: body || 'This is a test notification to multiple devices!',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });

    if (result.success) {
      return res.status(200).json({
        status: true,
        message: 'Test notification sent to multiple devices',
        data: {
          totalDevices: deviceTokens.length,
          successCount: result.successCount,
          failureCount: result.failureCount
        }
      });
    } else {
      return res.status(500).json({
        status: false,
        message: 'Failed to send notifications',
        error: result.message || result.error
      });
    }
  } catch (error) {
    console.error('Test multiple notification error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/notification/user-token/:userId - Get user's device token
router.get('/user-token/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('name email phoneNumber deviceToken');

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: true,
      message: 'User device token fetched',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          deviceToken: user.deviceToken || null,
          hasDeviceToken: !!user.deviceToken
        }
      }
    });
  } catch (error) {
    console.error('Get user token error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// PUT /api/notification/update-token - Update device token for current user
router.put('/update-token', auth, async (req, res) => {
  try {
    const { deviceToken } = req.body;

    if (!deviceToken) {
      return res.status(400).json({
        status: false,
        message: 'deviceToken is required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { deviceToken: deviceToken },
      { new: true }
    ).select('name email phoneNumber deviceToken');

    return res.status(200).json({
      status: true,
      message: 'Device token updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          deviceToken: user.deviceToken
        }
      }
    });
  } catch (error) {
    console.error('Update device token error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;

