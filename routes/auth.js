const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP (mock function - replace with actual SMS service)
async function sendOTP(phoneNumber, otp) {
  // In production, integrate with SMS service like Twilio, AWS SNS, etc.
  console.log(`OTP ${otp} sent to ${phoneNumber}`);
  return true;
}

// Request OTP for phone registration
router.post('/request-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ status: 400, message: 'Phone number is required.', data: null });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ status: 400, message: 'User already exists with this phone number.', data: null });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing unused OTPs for this phone number
    await OTP.deleteMany({ phoneNumber, isUsed: false });

    // Save new OTP
    const otpRecord = new OTP({
      phoneNumber,
      otp,
      expiresAt
    });
    await otpRecord.save();

    // Send OTP (mock)
    await sendOTP(phoneNumber, otp);

    res.status(200).json({ 
      status: 200, 
      message: 'OTP sent successfully.', 
      data: { 
        phoneNumber,
        expiresIn: '10 minutes'
      } 
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Verify OTP for phone registration
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ status: 400, message: 'Phone number and OTP are required.', data: null });
    }

    // Find the OTP record in database
    const otpRecord = await OTP.findOne({ 
      phoneNumber, 
      otp, 
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ status: 400, message: 'Invalid or expired OTP.', data: null });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Success response
    res.status(200).json({
      status: 200,
      message: 'Phone verification successful. Proceed with registration.',
      data: {
        phoneNumber,
        isVerified: true
      }
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ status: 400, message: 'Phone number is required.', data: null });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ status: 400, message: 'User already exists with this phone number.', data: null });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing unused OTPs for this phone number
    await OTP.deleteMany({ phoneNumber, isUsed: false });

    // Save new OTP
    const otpRecord = new OTP({
      phoneNumber,
      otp,
      expiresAt
    });
    await otpRecord.save();

    // Send OTP (mock)
    await sendOTP(phoneNumber, otp);

    res.status(200).json({ 
      status: 200, 
      message: 'OTP resent successfully.', 
      data: { 
        phoneNumber,
        expiresIn: '10 minutes'
      } 
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Phone login (if user already exists)
router.post('/phone-login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    
    if (!phoneNumber || !password) {
      return res.status(400).json({ status: 400, message: 'Phone number and password are required.', data: null });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({ status: 401, message: 'Invalid phone number or password.', data: null });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 401, message: 'Invalid phone number or password.', data: null });
    }

    // Issue JWT token (non-expiring)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.status(200).json({ 
      status: 200, 
      message: 'Login successful.', 
      data: { 
        token,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          email: user.email,
          role: user.role,
          profileType: user.profileType,
          registrationStep: user.registrationStep,
          isRegistrationComplete: user.isRegistrationComplete
        }
      } 
    });
  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Register user with phone after OTP verification
router.post('/register-phone', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ status: 400, message: 'Phone number is required.', data: null });
    }
    // Simulate sending code (no actual SMS logic here)
    res.status(200).json({
      status: 200,
      message: 'Code has been sent to your phone number.',
      data: { phoneNumber }
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Refresh token: returns a new non-expiring JWT from an existing token (even if expired)
router.post('/refresh', async (req, res) => {
  try {
    // Accept token from Authorization header or body.token
    let token = req.headers.authorization?.split(' ')[1] || req.body?.token;
    if (!token) {
      return res.status(400).json({ status: 400, message: 'Token is required.', data: null });
    }

    // Decode while ignoring expiration
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    } catch (e) {
      // If signature invalid, fallback to decode for error clarity
      try { decoded = jwt.decode(token); } catch {}
      return res.status(401).json({ status: 401, message: 'Invalid token.', data: null });
    }

    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return res.status(401).json({ status: 401, message: 'Invalid token payload.', data: null });
    }

    // Ensure user still exists and is active
    const user = await User.findById(userId).select('_id');
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }

    // Issue new non-expiring token
    const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    return res.status(200).json({
      status: 200,
      message: 'Token refreshed successfully.',
      data: { token: newToken }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Mint token by userId (admin use)
router.post('/mint-token', async (req, res) => {
  try {
    const { userId, adminSecret } = req.body || {};
    if (!userId) {
      return res.status(400).json({ status: 400, message: 'userId is required.', data: null });
    }
    if (process.env.ADMIN_SECRET) {
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ status: 401, message: 'Unauthorized.', data: null });
      }
    }
    const user = await User.findById(userId).select('_id');
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    return res.status(200).json({ status: 200, message: 'Token minted successfully.', data: { token } });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

module.exports = router;
