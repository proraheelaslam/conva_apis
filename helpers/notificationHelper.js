const admin = require('../config/firebase');

/**
 * Send push notification to a single device
 * @param {String} deviceToken - FCM device token
 * @param {Object} notification - Notification data
 * @param {String} notification.title - Notification title
 * @param {String} notification.body - Notification body
 * @param {Object} notification.data - Additional data payload (optional)
 * @returns {Promise<Object>} - Response with success status
 */
const sendNotification = async (deviceToken, notification) => {
  try {
    // Validate inputs
    if (!deviceToken || deviceToken === '') {
      return {
        success: false,
        message: 'Device token is required'
      };
    }

    if (!notification || !notification.title || !notification.body) {
      return {
        success: false,
        message: 'Notification title and body are required'
      };
    }

    // Prepare notification message
    const message = {
      token: deviceToken,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    // Send notification
    const response = await admin.messaging().send(message);
    
    console.log('✅ Notification sent successfully:', response);
    
    return {
      success: true,
      message: 'Notification sent successfully',
      response: response
    };

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errorInfo: error.errorInfo,
      name: error.name
    });
    
    return {
      success: false,
      message: 'Failed to send notification',
      error: error.message || 'Unknown error',
      errorCode: error.code || error.errorInfo?.code || 'unknown',
      errorName: error.name || 'Unknown',
      errorDetails: error.errorInfo || {},
      fullErrorMessage: error.toString(),
      stack: error.stack
    };
  }
};

/**
 * Send push notification to multiple devices
 * @param {Array<String>} deviceTokens - Array of FCM device tokens
 * @param {Object} notification - Notification data
 * @param {String} notification.title - Notification title
 * @param {String} notification.body - Notification body
 * @param {Object} notification.data - Additional data payload (optional)
 * @returns {Promise<Object>} - Response with success status
 */
const sendNotificationToMultiple = async (deviceTokens, notification) => {
  try {
    // Validate inputs
    if (!deviceTokens || !Array.isArray(deviceTokens) || deviceTokens.length === 0) {
      return {
        success: false,
        message: 'Device tokens array is required'
      };
    }

    // Filter out empty tokens
    const validTokens = deviceTokens.filter(token => token && token !== '');
    
    if (validTokens.length === 0) {
      return {
        success: false,
        message: 'No valid device tokens found'
      };
    }

    if (!notification || !notification.title || !notification.body) {
      return {
        success: false,
        message: 'Notification title and body are required'
      };
    }

    // Prepare multicast message
    const message = {
      tokens: validTokens,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    // Send multicast notification
    const response = await admin.messaging().sendMulticast(message);
    
    console.log('✅ Multicast notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount
    });
    
    return {
      success: true,
      message: 'Notifications sent',
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };

  } catch (error) {
    console.error('❌ Error sending multicast notification:', error);
    
    return {
      success: false,
      message: 'Failed to send notifications',
      error: error.message
    };
  }
};

/**
 * Send notification to a topic
 * @param {String} topic - FCM topic name
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>} - Response with success status
 */
const sendNotificationToTopic = async (topic, notification) => {
  try {
    if (!topic || topic === '') {
      return {
        success: false,
        message: 'Topic is required'
      };
    }

    if (!notification || !notification.title || !notification.body) {
      return {
        success: false,
        message: 'Notification title and body are required'
      };
    }

    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {}
    };

    const response = await admin.messaging().send(message);
    
    console.log('✅ Topic notification sent successfully:', response);
    
    return {
      success: true,
      message: 'Topic notification sent successfully',
      response: response
    };

  } catch (error) {
    console.error('❌ Error sending topic notification:', error);
    
    return {
      success: false,
      message: 'Failed to send topic notification',
      error: error.message
    };
  }
};

module.exports = {
  sendNotification,
  sendNotificationToMultiple,
  sendNotificationToTopic
};

