const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const User = require('../models/User');
const Post = require('../models/Post');
const jwt = require('jsonwebtoken');

// JWT Secret Key (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      status: 401,
      message: 'Access denied. No token provided.'
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(400).json({
      status: 400,
      message: 'Invalid token.'
    });
  }
};

// Helpers to build absolute profile image URLs
function buildBaseUrl(req) {
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || (req && req.protocol) || 'http';
  const host = (req && req.headers && req.headers.host) ? req.headers.host : 'localhost';
  return `${proto}://${host}`;
}

function toAbsoluteProfileUrl(value, req) {
  const baseUrl = buildBaseUrl(req);
  const uploadsPrefix = '/uploads/profile-photos/';
  const defaultUrl = `${baseUrl}/public/default_profile_image.png`;
  if (!value) return defaultUrl;
  const s = String(value);
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  let filename = s;
  if (filename.includes(uploadsPrefix)) {
    filename = filename.substring(filename.lastIndexOf(uploadsPrefix) + uploadsPrefix.length);
  }
  if (filename.includes('file:///')) {
    filename = filename.substring(filename.lastIndexOf('/') + 1);
  }
  filename = filename.substring(filename.lastIndexOf('/') + 1);
  return `${baseUrl}${uploadsPrefix}${filename}`;
}

function decorateUserImages(u, req) {
  if (!u) return u;
  const user = u.toObject ? u.toObject() : u;
  const chosen = user.profileImage || (Array.isArray(user.photos) && user.photos.length > 0 ? user.photos[0] : null) || user.profilePhoto;
  user.profileImage = toAbsoluteProfileUrl(chosen, req);
  if (user.profilePhoto) {
    user.profilePhoto = toAbsoluteProfileUrl(user.profilePhoto, req);
  }
  if (Array.isArray(user.photos)) {
    user.photos = user.photos.map(p => toAbsoluteProfileUrl(p, req));
  }
  return user;
}

// Send connection request
router.post('/connect', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const requesterId = req.user.id;

    // Validate that requesterId exists
    if (!requesterId) {
      return res.status(401).json({
        status: 401,
        message: 'User not authenticated properly'
      });
    }

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'User ID is required'
      });
    }

    const recipientId = userId;

    // Debug log to check if requesterId is being set
    console.log('Requester ID:', requesterId);
    console.log('Recipient ID:', recipientId);

    // Check if user is trying to connect to themselves
    if (requesterId === recipientId) {
      return res.status(400).json({
        status: 400,
        message: 'You cannot connect to yourself'
      });
    }

    // Check if recipient user exists
    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      return res.status(404).json({
        status: 404,
        message: 'User not found'
      });
    }

    // Check if connection request already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (existingConnection) {
      // Block creating a new record if any relationship already exists in either direction
      if (existingConnection.status === 'accepted') {
        return res.status(400).json({
          status: 400,
          message: 'You are already connected with this user'
        });
      }
      if (existingConnection.status === 'pending') {
        const youAreRequester = String(existingConnection.requester) === String(requesterId);
        const msg = youAreRequester
          ? 'Connection request already sent to this user'
          : 'This user has already sent you a connection request. Please accept or reject it.';
        return res.status(400).json({
          status: 400,
          message: msg
        });
      }
      // If rejected exists, prevent duplicate records and ask user to resend after cleanup if needed
      return res.status(400).json({
        status: 400,
        message: 'A connection record already exists between you and this user'
      });
    }

    // Create new connection request
    const connection = new Connection({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending'
    });

    await connection.save();

    // Populate the connection with user details
    await connection.populate([
      { path: 'requester', select: 'name' },
      { path: 'recipient', select: 'name' }
    ]);

    // Get updated connection count for recipient
    const connectionCount = await Connection.countDocuments({
      recipient: recipientId,
      status: 'pending'
    });

    res.status(200).json({
      status: 200,
      message: 'Connection request sent successfully',
      data: {
        connection,
        connectionRequests: connectionCount
      }
    });

  } catch (error) {
    console.error('Connection request error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get connection requests received by user
router.get('/requests/received', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'pending', page = 1, limit = 10 } = req.query;

    const filter = { recipient: userId };
    if (status) {
      filter.status = status;
    }

    const connections = await Connection.find(filter)
      .populate('requester', 'name profileType profileImage profilePhoto photos')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const decorated = connections.map(c => {
      const obj = c.toObject();
      obj.requester = decorateUserImages(obj.requester, req);
      return obj;
    });

    const total = await Connection.countDocuments(filter);

    res.status(200).json({
      status: 200,
      message: 'Connection requests fetched successfully',
      data: {
        connections: decorated,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get received requests error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get connection requests sent by user
router.get('/requests/sent', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { requester: userId };
    if (status) {
      filter.status = status;
    }

    const connections = await Connection.find(filter)
      .populate('recipient', 'name profileType profileImage profilePhoto photos')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const decorated = connections.map(c => {
      const obj = c.toObject();
      obj.recipient = decorateUserImages(obj.recipient, req);
      return obj;
    });

    const total = await Connection.countDocuments(filter);

    res.status(200).json({
      status: 200,
      message: 'Sent connection requests fetched successfully',
      data: {
        connections: decorated,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get both received and sent connection requests in one response
router.get('/requests/all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const receivedFilter = { recipient: userId };
    const sentFilter = { requester: userId };
    if (status) {
      receivedFilter.status = status;
      sentFilter.status = status;
    }

    const [received, receivedTotal, sent, sentTotal] = await Promise.all([
      Connection.find(receivedFilter)
        .populate('requester', 'name profileType profileImage profilePhoto photos')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit),
      Connection.countDocuments(receivedFilter),
      Connection.find(sentFilter)
        .populate('recipient', 'name profileType profileImage profilePhoto photos')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit),
      Connection.countDocuments(sentFilter)
    ]);

    const receivedDecorated = received.map(c => {
      const obj = c.toObject();
      obj.requester = decorateUserImages(obj.requester, req);
      return obj;
    });
    const sentDecorated = sent.map(c => {
      const obj = c.toObject();
      obj.recipient = decorateUserImages(obj.recipient, req);
      return obj;
    });

    res.status(200).json({
      status: 200,
      message: 'Received and sent connection requests fetched successfully',
      data: {
        received: {
          connections: receivedDecorated,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(receivedTotal / limit),
            totalItems: receivedTotal,
            itemsPerPage: parseInt(limit)
          }
        },
        sent: {
          connections: sentDecorated,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(sentTotal / limit),
            totalItems: sentTotal,
            itemsPerPage: parseInt(limit)
          }
        }
      }
    });

  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error',
      error: error.message
    });
  }
});

// Accept/Reject connection request
router.put('/requests/:connectionId', verifyToken, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'
    const userId = req.user.id;

    // Validate status
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        status: 400,
        message: 'Status must be either "accepted" or "rejected"'
      });
    }

    // Find the connection request
    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({
        status: 404,
        message: 'Connection request not found'
      });
    }

    // Check if user is the recipient of this request
    if (connection.recipient.toString() !== userId) {
      return res.status(403).json({
        status: 403,
        message: 'You can only respond to connection requests sent to you'
      });
    }

    // Check if request is still pending
    if (connection.status !== 'pending') {
      return res.status(400).json({
        status: 400,
        message: 'This connection request has already been responded to'
      });
    }

    // Update the connection status
    connection.status = status;
    connection.updatedAt = new Date();
    await connection.save();

    // Populate the connection with user details
    await connection.populate([
      { path: 'requester', select: 'name' },
      { path: 'recipient', select: 'name' }
    ]);

    res.status(200).json({
      status: 200,
      message: `Connection request ${status} successfully`,
      data: connection
    });

  } catch (error) {
    console.error('Update connection request error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get connection count for a specific user (for posts API)
router.get('/count/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const count = await Connection.countDocuments({
      recipient: userId,
      status: 'pending'
    });

    res.status(200).json({
      status: 200,
      message: 'Connection count fetched successfully',
      data: { connectionRequests: count }
    });

  } catch (error) {
    console.error('Get connection count error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
