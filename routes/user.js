const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const mongoose = require('mongoose');
const auth = require('../middlewares/auth');
const Swipe = require('../models/Swipe');
const Match = require('../models/Match');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const Work = require('../models/Work');
const Interest = require('../models/Interest');
const CommunicationStyle = require('../models/CommunicationStyle');
const LoveLanguage = require('../models/LoveLanguage');
const Orientation = require('../models/Orientation');
const Gender = require('../models/Gender');
const ZodiacSign = require('../models/ZodiacSign');
const Industry = require('../models/Industry');
const NetworkingGoals = require('../models/NetworkingGoals');
const ArtisticIdentity = require('../models/ArtisticIdentity');
const PrimaryMediums = require('../models/PrimaryMediums');
const SkillsAndTechniques = require('../models/SkillsAndTechniques');
const ToolsAndSoftware = require('../models/ToolsAndSoftware');
const CollaborationGoals = require('../models/CollaborationGoals');

// Multer configuration for profile image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/profile-photos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// GET /api/users/like/sent -> alias of likes sent
router.get(['/like/sent', '/users/like/sent'], auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pipeline = [
      { $match: { swiper: new mongoose.Types.ObjectId(userId), action: { $in: ['like', 'superlike'] } } },
      { $lookup: { from: 'users', localField: 'target', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 0, user: { _id: '$user._id', name: '$user.name', currentCity: '$user.currentCity', profileType: '$user.profileType', distance: '$user.distance', profileImage: '$user.profileImage', photos: '$user.photos' }, createdAt: 1 } },
      { $sort: { createdAt: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    ];

    const results = await Swipe.aggregate(pipeline);
    const data = results.map(r => ({
      id: r.user._id,
      name: r.user.name,
      currentCity: r.user.currentCity || null,
      profileType: r.user.profileType || 'personal',
      distance: r.user.distance || '2 miles away',
      profileImage: absoluteProfileImage(r.user, req)
    }));

    return res.status(200).json({ status: 200, message: 'Likes sent list fetched', data });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

const profileUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// JWT Secret Key (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      role: user.role 
    },
    JWT_SECRET
  );
};

// Helper function to calculate age from birthday
const calculateAge = (birthday) => {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (user) => {
  const requiredFields = [
    'name', 'birthday', 'workId', 'pronounce', 'genderId', 
    'orientation', 'communicationStyle', 'loveLanguage'
  ];
  const optionalFields = [
    'currentCity', 'homeTown', 'interests', 'icebreakerPrompts', 'photos'
  ];
  
  let completedRequired = 0;
  let completedOptional = 0;
  
  // Check required fields (70% weight)
  requiredFields.forEach(field => {
    if (user[field] && (Array.isArray(user[field]) ? user[field].length > 0 : true)) {
      completedRequired++;
    }
  });
  
  // Check optional fields (30% weight)
  optionalFields.forEach(field => {
    if (user[field] && (Array.isArray(user[field]) ? user[field].length > 0 : true)) {
      completedOptional++;
    }
  });
  
  const requiredPercentage = (completedRequired / requiredFields.length) * 70;
  const optionalPercentage = (completedOptional / optionalFields.length) * 30;
  
  return Math.round(requiredPercentage + optionalPercentage);
};

// Helper function to get profile image URL
const getProfileImageUrl = (photos, req) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    // Return default image URL
    return `${baseUrl}/public/default_profile_image.png`;
  }
  
  // Return first photo URL
  const firstPhoto = photos[0];
  return `${baseUrl}/uploads/profile-photos/${firstPhoto}`;
};

// Register user with email (Multi-step registration)
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      phoneNumber,
      name,
      birthday,
      workId,
      currentCity,
      homeTown,
      pronounce,
      genderId,
      orientation,
      interests,
      communicationStyle,
      loveLanguage,
      icebreakerPrompts,
      photos,
      role = 'user',
      profileType = 'personal',
      latitude,
      longitude,
      platformtype, // new parameter
      social_id     // new parameter
    } = req.body;

    // Validate all required registration steps
    const validationErrors = [];
    
    // Step 1: Email or Phone
    if (!email && !phoneNumber) {
      validationErrors.push('Either email or phone number is required for registration.');
    }
    
    // Step 2: Name
    if (!name) {
      validationErrors.push('Name is required.');
    }
    
    // Step 3: Birthday
    if (!birthday) {
      validationErrors.push('Birthday is required.');
    }
    
    // Step 4: Work
    if (!workId) {
      validationErrors.push('Work information is required.');
    }
    
    // Step 5: Location
    if (!currentCity && !homeTown) {
      validationErrors.push('Either current city or hometown is required.');
    }
    
    // Step 6: Pronounce
    if (!pronounce) {
      validationErrors.push('Pronoun is required.');
    }
    
    // Step 7: Gender
    if (!genderId) {
      validationErrors.push('Gender is required.');
    }
    
    // Step 8: Orientation
    if (!orientation) {
      validationErrors.push('Orientation is required.');
    }
    
    // Step 9: Interests
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      validationErrors.push('At least one interest is required.');
    }
    
    // Step 10: Communication Style
    if (!communicationStyle) {
      validationErrors.push('Communication style is required.');
    }
    
    // Step 11: Love Language
    if (!loveLanguage) {
      validationErrors.push('Love language is required.');
    }
    
    // Step 12: Icebreaker Prompts
    if (!icebreakerPrompts || !Array.isArray(icebreakerPrompts) || icebreakerPrompts.length === 0) {
      validationErrors.push('At least one icebreaker prompt is required.');
    }
    
    // Step 13: Photos - REMOVED validation to make it optional

    // Return validation errors if any step is missing
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        status: 400, 
        message: 'Please complete all registration steps.', 
        data: { errors: validationErrors } 
      });
    }

    // Check if user already exists by email or phoneNumber
    let existingUser = null;
    if (email) {
      existingUser = await User.findOne({ email });
    } else if (phoneNumber) {
      existingUser = await User.findOne({ phoneNumber });
    }
    if (existingUser) {
      return res.status(400).json({ status: 400, message: 'User already exists with this email or phone number.', data: null });
    }

    // Prepare user data
    const userData = {
      name,
      birthday: new Date(birthday),
      workId,
      currentCity,
      homeTown,
      pronounce,
      genderId,
      orientation,
      interests,
      communicationStyle,
      loveLanguage,
      icebreakerPrompts,
      role,
      profileType,
      platformtype,
      social_id
    };
    
    // Add photos only if provided
    if (photos && Array.isArray(photos) && photos.length > 0) {
      userData.photos = photos;
    }

    // Add latitude/longitude if provided
    if (latitude !== undefined) userData.latitude = Number(latitude);
    if (longitude !== undefined) userData.longitude = Number(longitude);
    
    if (email) {
      userData.email = email;
    } else if (phoneNumber) {
      // Generate a random email for phone-only registration
      const randomStr = Math.random().toString(36).substring(2, 10);
      userData.email = `a${randomStr}@bby.com`;
    }
    if (phoneNumber) userData.phoneNumber = phoneNumber;

    // All steps are completed
    userData.registrationStep = 13;
    userData.isRegistrationComplete = true;

    // Create user
    const user = new User(userData);
    await user.save();

    // Populate referenced fields to get actual names instead of IDs
    await user.populate([
      { path: 'interests', select: 'name' },
      { path: 'communicationStyle', select: 'name' },
      { path: 'loveLanguage', select: 'name' },
      { path: 'orientation', select: 'name' },
      { path: 'genderId', select: 'name' },
      { path: 'workId', select: 'name' }
    ]);

    // Set profile image (first photo filename or null for default)
    if (photos && Array.isArray(photos) && photos.length > 0) {
      user.profileImage = photos[0]; // Store only filename
    }
    await user.save();

    // Calculate profile completion percentage
    const profileCompletionPercentage = calculateProfileCompletion(user);
    user.profileCompletion = profileCompletionPercentage;
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // Calculate age from birthday
    const age = calculateAge(user.birthday);

    // Format plan object with all required fields
    const planResponse = {
      planType: 'free',
      name: 'Free',
      totalSwipes: 10,
      remainingSwipes: 10, // Set default to 10 for free plan
      activatedAt: new Date().toISOString(),
      is_enable_post: false,
      is_enable_diary: false
    };
    
    // Update user's plan in the database
    user.plan = planResponse;
    user.is_enable_post = false;
    user.is_enable_diary = false;
    await user.save();

    // Return user data without password
    const userResponse = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      age: age,
      work: user.workId ? { id: user.workId._id, name: user.workId.name } : null,
      currentCity: user.currentCity,
      homeTown: user.homeTown,
      plan: planResponse,
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
      pronounce: user.pronounce,
      gender: user.genderId ? { id: user.genderId._id, name: user.genderId.name } : null,
      orientation: user.orientation ? { id: user.orientation._id, name: user.orientation.name } : null,
      interests: user.interests?.map(interest => ({ id: interest._id, name: interest.name })) || [],
      communicationStyle: user.communicationStyle ? { id: user.communicationStyle._id, name: user.communicationStyle.name } : null,
      loveLanguage: user.loveLanguage ? { id: user.loveLanguage._id, name: user.loveLanguage.name } : null,
      icebreakerPrompts: user.icebreakerPrompts,
      role: user.role,
      profileType: user.profileType,
      registrationStep: user.registrationStep,
      isRegistrationComplete: user.isRegistrationComplete,
      isPremium: user.isPremium,
      verificationStatus: user.verificationStatus,
      profileImage: getProfileImageUrl(user.photos, req),
      profileCompletion: user.profileCompletion,
      memberSince: user.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), // Format as "January 2025"
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes,
      platformtype: user.platformtype,
      social_id: user.social_id
    };
    
    // Add photos with full URLs to response only if they exist
    if (user.photos && user.photos.length > 0) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      userResponse.photos = user.photos.map(photo => `${baseUrl}/uploads/profile-photos/${photo}`);
    }
    
    if (email) {
      userResponse.email = user.email;
    }

    // Attach plan info (only essential fields)
    userResponse.plan = user.plan ? {
      planType: user.plan.planType,
      totalSwipes: user.plan.totalSwipes,
      activatedAt: user.plan.activatedAt ? new Date(user.plan.activatedAt).toISOString() : null
    } : null;

    res.status(200).json({ 
      status: 200, 
      message: 'Registration completed successfully.', 
      data: { 
        user: userResponse,
        token 
      } 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 400, message: 'Email is required.', data: null });
    }
    
    const user = await User.findOne({ email })
      .populate('interests', 'name')
      .populate('communicationStyle', 'name')
      .populate('loveLanguage', 'name')
      .populate('orientation', 'name')
      .populate('genderId', 'name')
      .populate('workId', 'name')
      .select('-password -__v');
      
    if (!user) {
      return res.status(401).json({ status: 401, message: 'User not found.', data: null });
    }
    
    // Calculate age from birthday
    const age = calculateAge(user.birthday);

    // Format user response with relational data
    const userResponse = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      age: age,
      work: user.workId ? { id: user.workId._id, name: user.workId.name } : null,
      currentCity: user.currentCity,
      homeTown: user.homeTown,
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
      pronounce: user.pronounce,
      gender: user.genderId ? { id: user.genderId._id, name: user.genderId.name } : null,
      orientation: user.orientation ? { id: user.orientation._id, name: user.orientation.name } : null,
      interests: user.interests?.map(interest => ({ id: interest._id, name: interest.name })) || [],
      communicationStyle: user.communicationStyle ? { id: user.communicationStyle._id, name: user.communicationStyle.name } : null,
      loveLanguage: user.loveLanguage ? { id: user.loveLanguage._id, name: user.loveLanguage.name } : null,
      icebreakerPrompts: user.icebreakerPrompts,
      role: user.role,
      profileType: user.profileType,
      registrationStep: user.registrationStep,
      isRegistrationComplete: user.isRegistrationComplete,
      isPremium: user.isPremium,
      verificationStatus: user.verificationStatus,
      profileImage: user.profileImage ? `${req.protocol}://${req.get('host')}/uploads/profile-photos/${user.profileImage}` : getProfileImageUrl(user.photos, req),
      profileCompletion: user.profileCompletion,
      memberSince: user.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes
    };

    // Add photos with full URLs to response only if they exist
    if (user.photos && user.photos.length > 0) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      userResponse.photos = user.photos.map(photo => `${baseUrl}/uploads/profile-photos/${photo}`);
    }
    
    if (user.email) {
      userResponse.email = user.email;
    }
    // Attach plan info (only essential fields)
    userResponse.plan = user.plan ? {
      planType: user.plan.planType,
      totalSwipes: user.plan.totalSwipes,
      activatedAt: user.plan.activatedAt ? new Date(user.plan.activatedAt).toISOString() : null
    } : null;
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.status(200).json({ 
      status: 200, 
      message: 'Login successful.', 
      data: {
        user: userResponse,
        token: token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get all users (requires token)
router.get('/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ status: 401, message: 'Access token required.', data: null });
    }
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ status: 401, message: 'Invalid token.', data: null });
    }

    // Decode token to get current user id
    const decoded = jwt.verify(token, JWT_SECRET);
    const currentUser = await User.findById(decoded.id).select('latitude longitude');

    // Local Haversine distance helper in miles
    const haversineMiles = (lat1, lon1, lat2, lon2) => {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 3958.8; // Earth radius in miles
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const users = await User.find().select('-__v -password');

    // Build response with dynamic distance when possible
    const processed = users.map((u) => {
      const userObj = u.toObject();
      try {
        if (
          currentUser?.latitude != null && currentUser?.longitude != null &&
          userObj?.latitude != null && userObj?.longitude != null
        ) {
          const miles = haversineMiles(
            currentUser.latitude,
            currentUser.longitude,
            userObj.latitude,
            userObj.longitude
          );
          const rounded = Math.max(0, Math.round(miles));
          userObj.distance = `${rounded} miles away`;
        }
      } catch (_) { /* ignore */ }
      return userObj;
    });

    res.status(200).json({ status: 200, message: 'Users fetched successfully.', data: processed });
  } catch (error) {
    res.status(500).json({ status: 500, message: 'Server error', data: error });
  }
});

// Admin: Get all users (no token required) — same response shape
router.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find().select('-__v -password');
    res.status(200).json({ status: 200, message: 'Users fetched successfully.', data: users });
  } catch (error) {
    res.status(500).json({ status: 500, message: 'Server error', data: error });
  }
});

// Get user detail by ID
router.get('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate if ID is provided
    if (!userId) {
      return res.status(400).json({ status: 400, message: 'User ID is required.', data: null });
    }

    // Find user by ID and populate referenced fields
    const user = await User.findById(userId)
      .populate('interests', 'name')
      .populate('communicationStyle', 'name')
      .populate('loveLanguage', 'name')
      .populate('orientation', 'name')
      .populate('genderId', 'name')
      .populate('workId', 'name')
      .select('-password -__v');
    
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }

    // Calculate age from birthday
    const age = calculateAge(user.birthday);

    // Format user response with all fields
    const userResponse = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      age: age,
      work: user.workId ? { id: user.workId._id, name: user.workId.name } : null,
      currentCity: user.currentCity,
      homeTown: user.homeTown,
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
      pronounce: user.pronounce,
      gender: user.genderId ? { id: user.genderId._id, name: user.genderId.name } : null,
      orientation: user.orientation ? { id: user.orientation._id, name: user.orientation.name } : null,
      interests: user.interests?.map(interest => ({ id: interest._id, name: interest.name })) || [],
      communicationStyle: user.communicationStyle ? { id: user.communicationStyle._id, name: user.communicationStyle.name } : null,
      loveLanguage: user.loveLanguage ? { id: user.loveLanguage._id, name: user.loveLanguage.name } : null,
      icebreakerPrompts: user.icebreakerPrompts,
      role: user.role,
      profileType: user.profileType,
      registrationStep: user.registrationStep,
      isRegistrationComplete: user.isRegistrationComplete,
      isPremium: user.isPremium,
      verificationStatus: user.verificationStatus,
      profileImage: user.profileImage ? `${req.protocol}://${req.get('host')}/uploads/profile-photos/${user.profileImage}` : getProfileImageUrl(user.photos, req),
      profileCompletion: user.profileCompletion,
      memberSince: user.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes
    };

    // Add photos with full URLs to response only if they exist
    if (user.photos && user.photos.length > 0) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      userResponse.photos = user.photos.map(photo => `${baseUrl}/uploads/profile-photos/${photo}`);
    }
    
    if (user.email) {
      userResponse.email = user.email;
    }

    // Attach plan info (only essential fields) with default free fallback
    const defaultPlan = {
      planType: 'free',
      totalSwipes: 10,
      activatedAt: new Date(user.memberSince || Date.now()).toISOString()
    };
    userResponse.plan = user.plan ? {
      planType: user.plan.planType,
      totalSwipes: user.plan.totalSwipes,
      activatedAt: user.plan.activatedAt ? new Date(user.plan.activatedAt).toISOString() : defaultPlan.activatedAt
    } : defaultPlan;

    res.status(200).json({ status: 200, message: 'User details fetched successfully.', data: userResponse });
  } catch (error) {
    console.error('Get user by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ status: 400, message: 'Invalid user ID format.', data: null });
    }
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get user profile by token
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token
    if (!token) {
      return res.status(401).json({ status: 401, message: 'Access token required.', data: null });
    }

    // Verify token and get user with subscription info
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = await User.findById(decoded.id)
      .populate('interests', 'name')
      .populate('communicationStyle', 'name')
      .populate('loveLanguage', 'name')
      .populate('orientation', 'name')
      .populate('genderId', 'name')
      .populate('workId', 'name')
      .select('-password -__v');
      
    // Check for active subscription
    const activeSubscription = await Subscription.findOne({
      user: decoded.id,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('package', 'name packageType');
    
    // If user has an active subscription but plan data is not updated, update it
    if (activeSubscription && user.isPremium) {
      // Determine plan type and name based on package
      let planType, planName;
      const packageName = activeSubscription.package?.name?.toLowerCase() || '';
      
      if (packageName.includes('convo++')) {
        planType = 'vip';
        planName = 'Convo++';
      } else if (packageName.includes('convo+')) {
        planType = 'premium';
        planName = 'Convo+';
      } else {
        planType = 'basic';
        planName = 'Convo';
      }
      
      // Update user's plan if it doesn't match the subscription
      if (!user.plan || 
          user.plan.planType !== planType || 
          user.plan.name !== planName ||
          user.plan.expiresAt !== activeSubscription.endDate) {
            
        await User.findByIdAndUpdate(decoded.id, {
          $set: {
            isPremium: true,
            'plan.planType': planType,
            'plan.name': planName,
            'plan.totalSwipes': 0, // 0 means unlimited
            'plan.remainingSwipes': 0, // 0 means unlimited
            'plan.activatedAt': activeSubscription.startDate || new Date(),
            'plan.expiresAt': activeSubscription.endDate,
            'isPostEnabled': true,
            'isDiaryEnabled': true,
            'is_enable_post': true,
            'is_enable_diary': true
          }
        });
        
        // Refresh user data
        user = await User.findById(decoded.id)
          .populate('interests', 'name')
          .populate('communicationStyle', 'name')
          .populate('loveLanguage', 'name')
          .populate('orientation', 'name')
          .populate('genderId', 'name')
          .populate('workId', 'name')
          .select('-password -__v');
      }
    }
    
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }

    // Calculate age from birthday
    const age = calculateAge(user.birthday);

    // Format user response with all fields
    const userResponse = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      age: age,
      work: user.workId ? { id: user.workId._id, name: user.workId.name } : null,
      currentCity: user.currentCity,
      homeTown: user.homeTown,
      pronounce: user.pronounce,
      gender: user.genderId ? { id: user.genderId._id, name: user.genderId.name } : null,
      orientation: user.orientation ? { id: user.orientation._id, name: user.orientation.name } : null,
      interests: user.interests?.map(interest => ({ id: interest._id, name: interest.name })) || [],
      communicationStyle: user.communicationStyle ? { id: user.communicationStyle._id, name: user.communicationStyle.name } : null,
      loveLanguage: user.loveLanguage ? { id: user.loveLanguage._id, name: user.loveLanguage.name } : null,
      icebreakerPrompts: user.icebreakerPrompts,
      role: user.role,
      profileType: user.profileType,
      registrationStep: user.registrationStep,
      isRegistrationComplete: user.isRegistrationComplete,
      isPremium: user.isPremium,
      verificationStatus: user.verificationStatus,
      profileImage: user.profileImage ? `${req.protocol}://${req.get('host')}/uploads/profile-photos/${user.profileImage}` : getProfileImageUrl(user.photos, req),
      profileCompletion: user.profileCompletion,
      memberSince: user.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes
    };

    // Add photos with full URLs to response only if they exist
    if (user.photos && user.photos.length > 0) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      userResponse.photos = user.photos.map(photo => `${baseUrl}/uploads/profile-photos/${photo}`);
    }
    
    if (user.email) {
      userResponse.email = user.email;
    }

    // Attach plan info with default free fallback
    const defaultPlanProfile = {
      planType: 'free',
      name: 'Free',
      totalSwipes: 10,
      remainingSwipes: 10,
      activatedAt: new Date(user.memberSince || Date.now()).toISOString(),
      expiresAt: null,
      is_enable_post: false,
      is_enable_diary: false
    };
    
    userResponse.plan = user.plan ? {
      planType: user.plan.planType || 'free',
      name: user.plan.name || (user.plan.planType === 'free' ? 'Free' : 'Basic'),
      totalSwipes: user.plan.totalSwipes || 0, // 0 means unlimited
      remainingSwipes: user.plan.remainingSwipes || 0, // 0 means unlimited
      activatedAt: user.plan.activatedAt ? new Date(user.plan.activatedAt).toISOString() : defaultPlanProfile.activatedAt,
      expiresAt: user.plan.expiresAt ? new Date(user.plan.expiresAt).toISOString() : null,
      is_enable_post: user.is_enable_post || false,
      is_enable_diary: user.is_enable_diary || false
    } : defaultPlanProfile;

    res.status(200).json({ status: 200, message: 'Profile fetched successfully.', data: userResponse });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 401, message: 'Invalid token.', data: null });
    }
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

 
// Update profile by ID (with optional photo upload)
router.put('/profile/:id', profileUpload.single('photo'), async (req, res) => {
  try {
    const {
      username,
      email,
      phoneNumber,
      notificationsEnabled,
      snoozeMode,
      profileVisibility,
    } = req.body;

    const updates = {
      username,
      email,
      phoneNumber,
      notificationsEnabled,
      snoozeMode,
      profileVisibility,
    };

    // Remove undefined fields so they don't overwrite existing data
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    if (req.file) {
      updates.profilePhoto = req.file.filename;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, select: '-password -__v' });

    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }

    // Add full photo URL if profilePhoto exists
    const userObj = user.toObject();
    if (userObj.profilePhoto) {
      userObj.profilePhoto = `${req.protocol}://${req.get('host')}/uploads/profile-photos/${userObj.profilePhoto}`;
    }
    // Add absolute URL for profileImage if present (stored as filename)
    if (userObj.profileImage) {
      userObj.profileImage = `${req.protocol}://${req.get('host')}/uploads/profile-photos/${userObj.profileImage}`;
    }
    // Map photos array to absolute URLs if present
    if (Array.isArray(userObj.photos) && userObj.photos.length > 0) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      userObj.photos = userObj.photos.map(p => `${baseUrl}/uploads/profile-photos/${p}`);
    }
    // Add id field mirroring _id for client convenience
    userObj.id = userObj._id;
    // Remove raw _id from response
    delete userObj._id;

    res.status(200).json({ status: 200, message: 'Profile updated successfully.', data: userObj });
  } catch (error) {
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Update registration progress by ID (for step-by-step registration)
router.put('/register/update/:id', async (req, res) => {
  try {
    const {
      // Step 1: Email or Phone
      email,
      phoneNumber,
      
      // Step 2: Name
      name,
      
      // Step 3: Birthday
      birthday,
      
      // Step 4: Work
      workId,
      
      // Step 5: Location
      currentCity,
      homeTown,
      
      // Step 6: Pronounce
      pronounce,
      
      // Step 7: Gender
      genderId,
      
      // Step 8: Orientation
      orientation,
      
      // Step 9: Interests (multiple selection)
      interests,
      
      // Step 10: Communication Style
      communicationStyle,
      
      // Step 11: Love Language
      loveLanguage,
      
      // Step 12: Icebreaker Prompts
      icebreakerPrompts,
      
      // Step 13: Photos
      photos,
      
      // Profile Type
      profileType
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }

    // Update user data
    const updates = {};
    if (email !== undefined) updates.email = email;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (name !== undefined) updates.name = name;
    if (birthday !== undefined) updates.birthday = new Date(birthday);
    if (workId !== undefined) updates.workId = workId;
    if (currentCity !== undefined) updates.currentCity = currentCity;
    if (homeTown !== undefined) updates.homeTown = homeTown;
    if (pronounce !== undefined) updates.pronounce = pronounce;
    if (genderId !== undefined) updates.genderId = genderId;
    if (orientation !== undefined) updates.orientation = orientation;
    if (interests !== undefined) updates.interests = Array.isArray(interests) ? interests : [];
    if (communicationStyle !== undefined) updates.communicationStyle = communicationStyle;
    if (loveLanguage !== undefined) updates.loveLanguage = loveLanguage;
    if (icebreakerPrompts !== undefined) updates.icebreakerPrompts = Array.isArray(icebreakerPrompts) ? icebreakerPrompts : [];
    if (photos !== undefined) updates.photos = Array.isArray(photos) ? photos : [];
    if (profileType !== undefined) updates.profileType = profileType;

    // Determine registration step and completion status
    const filledSteps = [
      !!(updates.email || user.email || updates.phoneNumber || user.phoneNumber), // Step 1
      !!(updates.name || user.name), // Step 2
      !!(updates.birthday || user.birthday), // Step 3
      !!(updates.workId || user.workId), // Step 4
      !!((updates.currentCity || user.currentCity) || (updates.homeTown || user.homeTown)), // Step 5
      !!(updates.pronounce || user.pronounce), // Step 6
      !!(updates.genderId || user.genderId), // Step 7
      !!(updates.orientation || user.orientation), // Step 8
      (updates.interests || user.interests) && (updates.interests || user.interests).length > 0, // Step 9
      !!(updates.communicationStyle || user.communicationStyle), // Step 10
      !!(updates.loveLanguage || user.loveLanguage), // Step 11
      (updates.icebreakerPrompts || user.icebreakerPrompts) && (updates.icebreakerPrompts || user.icebreakerPrompts).length > 0, // Step 12
      (updates.photos || user.photos) && (updates.photos || user.photos).length > 0 // Step 13
    ];

    const lastCompletedStep = filledSteps.lastIndexOf(true) + 1;
    const isComplete = lastCompletedStep === 13;

    updates.registrationStep = lastCompletedStep;
    updates.isRegistrationComplete = isComplete;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true, select: '-password -__v' });

    res.status(200).json({ 
      status: 200, 
      message: isComplete ? 'Registration completed successfully.' : `Registration step ${lastCompletedStep} completed.`, 
      data: updatedUser 
    });
  } catch (error) {
    console.error('Update registration error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get all reference data for mobile app (grouped by category for work and interests)
router.get('/reference-data', async (req, res) => {
  try {
    // Import all models
    const express = require('express');
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');
    const router = express.Router();
    const User = require('../models/User');
    const Work = require('../models/Work');
    const Interest = require('../models/Interest');
    const CommunicationStyle = require('../models/CommunicationStyle');
    const LoveLanguage = require('../models/LoveLanguage');
    const Orientation = require('../models/Orientation');
    const Gender = require('../models/Gender');
    const ZodiacSign = require('../models/ZodiacSign');

    // Fetch all data in parallel
    const [
      workData,
      genderData,
      orientationData,
      interestData,
      communicationStyleData,
      loveLanguageData,
      zodiacSignData
    ] = await Promise.all([
      Work.find({ isActive: true }).select('name category').lean(),
      Gender.find({ isActive: true }).select('name').lean(),
      Orientation.find({ isActive: true }).select('name').lean(),
      Interest.find({ isActive: true }).select('name category').lean(),
      CommunicationStyle.find({ isActive: true }).select('name').lean(),
      LoveLanguage.find({ isActive: true }).select('name').lean(),
      ZodiacSign.find({ isActive: true }).select('name').lean()
    ]);

    // Helper to group by category as array of { title, data }
    function groupByCategory(dataArr) {
      const grouped = {};
      dataArr.forEach(item => {
        const cat = item.category || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ id: item._id, name: item.name });
      });
      return Object.entries(grouped).map(([title, data]) => ({ title, data }));
    }

    const referenceData = {
      work: groupByCategory(workData),
      gender: genderData.map(item => ({ id: item._id, name: item.name })),
      orientation: orientationData.map(item => ({ id: item._id, name: item.name })),
      interests: groupByCategory(interestData),
      communicationStyle: communicationStyleData.map(item => ({ id: item._id, name: item.name })),
      loveLanguage: loveLanguageData.map(item => ({ id: item._id, name: item.name })),
      zodiacSign: zodiacSignData.map(item => ({ id: item._id, name: item.name }))
    };

    res.status(200).json({
      status: 200,
      message: 'Reference data fetched successfully',
      data: referenceData
    });

  } catch (error) {
    console.error('Reference data fetch error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error',
      data: error.message || error
    });
  }
});

// Upload and update profile image
router.put('/:userId/profile-image', profileUpload.single('image'), async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'User ID is required.',
        data: null
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: 400,
        message: 'Image file is required.',
        data: null
      });
    }

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'User not found.',
        data: null
      });
    }

    // Update user's profile image with filename only
    user.profileImage = req.file.filename;
    await user.save();

    // Generate full URL for response
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fullImageUrl = `${baseUrl}/uploads/profile-photos/${req.file.filename}`;

    // Return updated user data
    res.status(200).json({
      status: 200,
      message: 'Profile image uploaded and updated successfully.',
      data: {
        userId: user._id,
        profileImage: fullImageUrl,
        filename: req.file.filename,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error',
      data: error.message || error
    });
  }
});

// Update profile image with filename only
router.put('/:userId/profile-image-filename', async (req, res) => {
  try {
    const { userId } = req.params;
    const { image } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'User ID is required.',
        data: null
      });
    }

    if (!image) {
      return res.status(400).json({
        status: 400,
        message: 'Image filename is required.',
        data: null
      });
    }

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'User not found.',
        data: null
      });
    }

    // Generate full image URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const profileImageUrl = `${baseUrl}/uploads/profile-photos/${image}`;

    // Update user's profile image
    user.profileImage = profileImageUrl;
    await user.save();

    // Return updated user data
    res.status(200).json({
      status: 200,
      message: 'Profile image updated successfully.',
      data: {
        userId: user._id,
        profileImage: user.profileImage,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error',
      data: error.message || error
    });
  }
});

// Helper to build absolute image URLs
function absoluteProfileImage(u, req) {
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || (req && req.protocol) || 'http';
  const host = (req && req.headers && req.headers.host) ? req.headers.host : 'localhost';
  const baseUrl = `${proto}://${host}`;
  const uploadsPrefix = '/uploads/profile-photos/';
  const defaultUrl = `${baseUrl}/public/default_profile_image.png`;
  let raw = u?.profileImage || (Array.isArray(u?.photos) && u.photos.length > 0 ? u.photos[0] : null);
  if (!raw) return defaultUrl;
  if (typeof raw === 'string' && (raw.startsWith('http://') || raw.startsWith('https://'))) return raw;
  if (raw.includes(uploadsPrefix)) raw = raw.substring(raw.lastIndexOf(uploadsPrefix) + uploadsPrefix.length);
  if (typeof raw === 'string' && raw.includes('file:///')) {
    raw = raw.substring(raw.lastIndexOf('/') + 1);
  }
  return `${baseUrl}${uploadsPrefix}${raw}`;
}

function timeAgo(d) {
  if (!d) return null;
  const date = new Date(d);
  const diff = Math.max(0, Date.now() - date.getTime());
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day} ${day === 1 ? 'day' : 'days'} ago`;
  if (hr > 0) return `${hr} ${hr === 1 ? 'hour' : 'hours'} ago`;
  if (min > 0) return `${min} ${min === 1 ? 'minute' : 'minutes'} ago`;
  return `${sec} ${sec === 1 ? 'second' : 'seconds'} ago`;
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/users/like/list -> alias of likes received
router.get(['/like/list', '/users/like/list'], auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, sortBy = 'recent', profileType } = req.query;

    const me = await User.findById(userId).select('latitude longitude');

    const pipeline = [
      { $match: { swiper: new mongoose.Types.ObjectId(userId), action: { $in: ['like', 'superlike'] } } },
      { $lookup: { from: 'users', localField: 'target', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { 
          _id: 0, 
          user: { 
            _id: '$user._id', 
            name: '$user.name', 
            currentCity: '$user.currentCity', 
            profileType: '$user.profileType', 
            distance: '$user.distance', 
            profileImage: '$user.profileImage', 
            photos: '$user.photos',
            birthday: '$user.birthday',
            isPremium: '$user.isPremium',
            createdAt: '$user.createdAt',
            latitude: '$user.latitude',
            longitude: '$user.longitude'
          }, 
          createdAt: 1 
        } 
      },
      // Sorting and pagination will be applied after computing age/distance
    ];

    const results = await Swipe.aggregate(pipeline);
    let items = results.map(r => {
      const age = r.user.birthday ? calculateAge(r.user.birthday) : null;
      let numericDistance = Infinity;
      if (
        me?.latitude != null && me?.longitude != null &&
        r.user?.latitude != null && r.user?.longitude != null
      ) {
        try {
          numericDistance = haversineMiles(me.latitude, me.longitude, r.user.latitude, r.user.longitude);
        } catch (_) { /* ignore */ }
      }
      return {
        id: r.user._id,
        name: r.user.name,
        currentCity: r.user.currentCity || null,
        profileType: r.user.profileType || 'personal',
        distance: r.user.distance || '2 miles away',
        profileImage: absoluteProfileImage(r.user, req),
        age,
        isPremium: !!r.user.isPremium,
        createdAt: r.user.createdAt || null,
        likedAt: r.createdAt || null,
        _numericDistance: isFinite(numericDistance) ? numericDistance : null
      };
    });

    // Optional filter by profileType
    if (profileType) {
      items = items.filter(x => String(x.profileType).toLowerCase() === String(profileType).toLowerCase());
    }

    // Sorting
    if (sortBy === 'nearest') {
      items.sort((a, b) => {
        const ad = a._numericDistance ?? Number.POSITIVE_INFINITY;
        const bd = b._numericDistance ?? Number.POSITIVE_INFINITY;
        return ad - bd;
      });
    } else if (sortBy === 'age_low_high' || sortBy === 'age_low_to_high') {
      items.sort((a, b) => {
        const aa = a.age ?? Number.POSITIVE_INFINITY;
        const bb = b.age ?? Number.POSITIVE_INFINITY;
        return aa - bb;
      });
    } else if (sortBy === 'age_high_low' || sortBy === 'age_high_to_low') {
      items.sort((a, b) => {
        const aa = a.age ?? -1;
        const bb = b.age ?? -1;
        return bb - aa;
      });
    } else if (sortBy === 'profileType' || sortBy === 'business') {
      items.sort((a, b) => {
        const ap = String(a.profileType || 'personal').toLowerCase();
        const bp = String(b.profileType || 'personal').toLowerCase();
        if (ap === bp) return 0;
        if (ap === 'business') return -1;
        if (bp === 'business') return 1;
        return 0;
      });
    } else {
      // recent (default)
      items.sort((a, b) => new Date(b.likedAt || 0) - new Date(a.likedAt || 0));
    }

    // Pagination after sorting
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 20));
    const total = items.length;
    const start = (p - 1) * l;
    const end = start + l;
    const data = items.slice(start, end).map(({ _numericDistance, ...rest }) => rest);
    const pages = Math.max(1, Math.ceil(total / l));
    const meta = {
      total,
      page: p,
      limit: l,
      pages,
      hasNext: p < pages,
      hasPrev: p > 1,
      count: data.length
    };

    return res.status(200).json({ status: 200, message: 'Likes list fetched', data, meta });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/users/match/list -> alias of matches list
router.get(['/match/list', '/users/match/list'], auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, sortBy = 'recent', profileType } = req.query;

    const me = await User.findById(userId)
      .select('name currentCity profileType distance profileImage photos birthday latitude longitude');

    // Fetch all matches first (no pagination yet; we'll sort/filter and then paginate)
    const matches = await Match.find({ $or: [{ user1: userId }, { user2: userId }], isActive: true })
      .sort({ updatedAt: -1 })
      .populate('user1', 'name currentCity profileType distance profileImage photos birthday latitude longitude')
      .populate('user2', 'name currentCity profileType distance profileImage photos birthday latitude longitude');

    let items = matches.map(m => {
      const other = String(m.user1._id) === String(userId) ? m.user2 : m.user1;
      // Compute distance if possible
      let numericDistance = null;
      if (
        me?.latitude != null && me?.longitude != null &&
        other?.latitude != null && other?.longitude != null
      ) {
        try {
          numericDistance = haversineMiles(me.latitude, me.longitude, other.latitude, other.longitude);
        } catch (_) { /* ignore */ }
      }
      return {
        id: m._id,
        user: {
          id: me?._id,
          name: me?.name || null,
          age: me?.birthday ? calculateAge(me.birthday) : null,
          location: me?.currentCity || null,
          image: absoluteProfileImage(me || {}, req),
          profileType: me?.profileType || 'personal',
          distance: me?.distance || '0 miles away'
        },
        matchedUser: {
          id: other._id,
          name: other.name,
          age: other.birthday ? calculateAge(other.birthday) : null,
          location: other.currentCity || null,
          image: absoluteProfileImage(other, req),
          profileType: other.profileType || 'personal',
          distance: other.distance || '2 miles away'
        },
        lastMessageAt: m.lastMessageAt || m.updatedAt,
        matchedAt: timeAgo(m.createdAt),
        matchedAtDate: m.createdAt,
        lastMessage: null,
        unreadCount: 0,
        _numericDistance: numericDistance,
        _age: other.birthday ? calculateAge(other.birthday) : null
      };
    });

    // Optional filter by profileType (on matchedUser)
    if (profileType) {
      items = items.filter(x => String(x.matchedUser.profileType).toLowerCase() === String(profileType).toLowerCase());
    }

    // Sorting
    if (sortBy === 'nearest') {
      items.sort((a, b) => {
        const ad = a._numericDistance ?? Number.POSITIVE_INFINITY;
        const bd = b._numericDistance ?? Number.POSITIVE_INFINITY;
        return ad - bd;
      });
    } else if (sortBy === 'age_low_high' || sortBy === 'age_low_to_high') {
      items.sort((a, b) => {
        const aa = a._age ?? Number.POSITIVE_INFINITY;
        const bb = b._age ?? Number.POSITIVE_INFINITY;
        return aa - bb;
      });
    } else if (sortBy === 'age_high_low' || sortBy === 'age_high_to_low') {
      items.sort((a, b) => {
        const aa = a._age ?? -1;
        const bb = b._age ?? -1;
        return bb - aa;
      });
    } else {
      // recent (default) -> by matchedAtDate
      items.sort((a, b) => new Date(b.matchedAtDate || 0) - new Date(a.matchedAtDate || 0));
    }

    // Pagination after sorting
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 20));
    const total = items.length;
    const start = (p - 1) * l;
    const end = start + l;
    const data = items.slice(start, end).map(({ _numericDistance, _age, ...rest }) => rest);
    const pages = Math.max(1, Math.ceil(total / l));
    const meta = {
      total,
      page: p,
      limit: l,
      pages,
      hasNext: p < pages,
      hasPrev: p > 1,
      count: data.length
    };

    return res.status(200).json({ status: 200, message: 'Match list fetched', data, meta });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/users/match/availableMatches -> same as match list but without pagination
router.get(['/match/availableMatches', '/users/match/availableMatches'], auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sortBy = 'recent', profileType } = req.query;

    const me = await User.findById(userId)
      .select('name currentCity profileType distance profileImage photos birthday latitude longitude');

    const matches = await Match.find({ $or: [{ user1: userId }, { user2: userId }], isActive: true })
      .sort({ updatedAt: -1 })
      .populate('user1', 'name currentCity profileType distance profileImage photos birthday latitude longitude')
      .populate('user2', 'name currentCity profileType distance profileImage photos birthday latitude longitude');

    let items = matches.map(m => {
      const other = String(m.user1._id) === String(userId) ? m.user2 : m.user1;
      let numericDistance = null;
      if (
        me?.latitude != null && me?.longitude != null &&
        other?.latitude != null && other?.longitude != null
      ) {
        try {
          numericDistance = haversineMiles(me.latitude, me.longitude, other.latitude, other.longitude);
        } catch (_) { /* ignore */ }
      }
      return {
        id: m._id,
        user: {
          id: me?._id,
          name: me?.name || null,
          age: me?.birthday ? calculateAge(me.birthday) : null,
          location: me?.currentCity || null,
          image: absoluteProfileImage(me || {}, req),
          profileType: me?.profileType || 'personal',
          distance: me?.distance || '0 miles away'
        },
        matchedUser: {
          id: other._id,
          name: other.name,
          age: other.birthday ? calculateAge(other.birthday) : null,
          location: other.currentCity || null,
          image: absoluteProfileImage(other, req),
          profileType: other.profileType || 'personal',
          distance: other.distance || '2 miles away'
        },
        lastMessageAt: m.lastMessageAt || m.updatedAt,
        matchedAt: timeAgo(m.createdAt),
        matchedAtDate: m.createdAt,
        lastMessage: null,
        unreadCount: 0,
        _numericDistance: numericDistance,
        _age: other.birthday ? calculateAge(other.birthday) : null
      };
    });

    if (profileType) {
      items = items.filter(x => String(x.matchedUser.profileType).toLowerCase() === String(profileType).toLowerCase());
    }

    if (sortBy === 'nearest') {
      items.sort((a, b) => {
        const ad = a._numericDistance ?? Number.POSITIVE_INFINITY;
        const bd = b._numericDistance ?? Number.POSITIVE_INFINITY;
        return ad - bd;
      });
    } else if (sortBy === 'age_low_high' || sortBy === 'age_low_to_high') {
      items.sort((a, b) => {
        const aa = a._age ?? Number.POSITIVE_INFINITY;
        const bb = b._age ?? Number.POSITIVE_INFINITY;
        return aa - bb;
      });
    } else if (sortBy === 'age_high_low' || sortBy === 'age_high_to_low') {
      items.sort((a, b) => {
        const aa = a._age ?? -1;
        const bb = b._age ?? -1;
        return bb - aa;
      });
    } else {
      items.sort((a, b) => new Date(b.matchedAtDate || 0) - new Date(a.matchedAtDate || 0));
    }

    const data = items.map(it => ({
      id: String(it.matchedUser.id),
      name: it.matchedUser.name,
      image: it.matchedUser.image
    }));

    return res.status(200).json({ status: 200, message: 'Available matches fetched', data });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/initialAppData - combined reference data for personal, business, collaboration
router.get('/initialAppData', async (req, res) => {
  try {
    // Fetch all datasets in parallel
    const [
      workData,
      genderData,
      orientationData,
      interestData,
      communicationStyleData,
      loveLanguageData,
      zodiacSignData,
      industries,
      networkingGoals,
      artisticDisciplines,
      primaryMediums,
      skillsAndTechniques,
      toolsAndSoftware,
      collaborationGoals
    ] = await Promise.all([
      Work.find({ isActive: true }).select('name category').lean(),
      Gender.find({ isActive: true }).select('name').lean(),
      Orientation.find({ isActive: true }).select('name').lean(),
      Interest.find({ isActive: true }).select('name category').lean(),
      CommunicationStyle.find({ isActive: true }).select('name').lean(),
      LoveLanguage.find({ isActive: true }).select('name').lean(),
      ZodiacSign.find({ isActive: true }).select('name').lean(),
      Industry.find({ isActive: true }).sort({ name: 1 }).lean(),
      NetworkingGoals.find({ isActive: true }).sort({ name: 1 }).lean(),
      ArtisticIdentity.find({ isActive: true }).sort({ name: 1 }).lean(),
      PrimaryMediums.find({ isActive: true }).sort({ name: 1 }).lean(),
      SkillsAndTechniques.find({ isActive: true }).sort({ name: 1 }).lean(),
      ToolsAndSoftware.find({ isActive: true }).sort({ name: 1 }).lean(),
      CollaborationGoals.find({ isActive: true }).sort({ name: 1 }).lean()
    ]);

    // Grouping helper { title, data } by category
    function groupByCategory(dataArr) {
      const grouped = {};
      dataArr.forEach(item => {
        const cat = item.category || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ id: item._id, name: item.name });
      });
      return Object.entries(grouped).map(([title, data]) => ({ title, data }));
    }

    const personal = {
      work: groupByCategory(workData),
      gender: genderData.map(i => ({ id: i._id, name: i.name })),
      orientation: orientationData.map(i => ({ id: i._id, name: i.name })),
      interests: groupByCategory(interestData),
      communicationStyle: communicationStyleData.map(i => ({ id: i._id, name: i.name })),
      loveLanguage: loveLanguageData.map(i => ({ id: i._id, name: i.name })),
      zodiacSign: zodiacSignData.map(i => ({ id: i._id, name: i.name }))
    };

    const business = {
      industries: groupByCategory(industries),
      networkingGoals: networkingGoals.map(i => ({ id: i._id, name: i.name }))
    };

    const collaboration = {
      artisticDisciplines: groupByCategory(artisticDisciplines),
      primaryMediums: groupByCategory(primaryMediums),
      skillsAndTechniques: groupByCategory(skillsAndTechniques),
      toolsAndSoftware: groupByCategory(toolsAndSoftware),
      collaborationGoals: groupByCategory(collaborationGoals)
    };

    res.status(200).json({
      status: 200,
      message: 'Initial app data fetched successfully.',
      data: {
        personal,
        business,
        collaboration
      }
    });
  } catch (error) {
    console.error('initialAppData error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Check if an account is already registered (by email or phone)
router.post('/check-account', async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
      return res.status(400).json({ status: 400, message: 'Email or phone number is required.' });
    }
    let existing = null;
    let param = null;
    if (email) {
      existing = await User.findOne({ email });
      param = 'email';
    }
    if (!existing && phoneNumber) {
      existing = await User.findOne({ phoneNumber });
      param = 'phoneNumber';
    }
    if (existing) {
      return res.status(200).json({
        status: true,
        is_exist: true,
        param: param,
        message: 'Account already exists with this ' + param + '.',
      });
    } else {
      return res.status(200).json({
        status: false,
        is_exist: false,
        param: param,
        message: 'No account exists with this ' + (param || 'parameter') + '.',
      });
    }
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// DELETE /api/users/account - delete my account
router.delete(['/account', '/users/account'], auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete related swipes and matches first
    await Promise.all([
      Swipe.deleteMany({ $or: [{ swiper: userId }, { target: userId }] }),
      Match.deleteMany({ $or: [{ user1: userId }, { user2: userId }] })
    ]);

    // Delete user
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }

    return res.status(200).json({ status: 200, message: 'Account deleted successfully.', data: null });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Update Birthday
router.put('/update-birthday', async (req, res) => {
  try {
    const { user_id, birthday } = req.body;
    if (!user_id || !birthday) {
      return res.status(400).json({ status: false, message: 'user_id and birthday are required.' });
    }
    const user = await User.findByIdAndUpdate(user_id, { birthday: new Date(birthday) }, { new: true });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Birthday updated successfully.', data: { birthday: user.birthday } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// Update Work
router.put('/update-work', async (req, res) => {
  try {
    const { user_id, workId } = req.body;
    if (!user_id || !workId) {
      return res.status(400).json({ status: false, message: 'user_id and workId are required.' });
    }
    const user = await User.findByIdAndUpdate(user_id, { workId }, { new: true }).populate('workId', 'name');
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Work updated successfully.', data: { work: user.workId } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// Update Location
router.put('/update-location', async (req, res) => {
  try {
    const { user_id, currentCity, homeTown } = req.body;
    if (!user_id) {
      return res.status(400).json({ status: false, message: 'user_id is required.' });
    }
    const updates = {};
    if (currentCity !== undefined) updates.currentCity = currentCity;
    if (homeTown !== undefined) updates.homeTown = homeTown;
    const user = await User.findByIdAndUpdate(user_id, updates, { new: true });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Location updated successfully.', data: { currentCity: user.currentCity, homeTown: user.homeTown } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// Update Pronouns
router.put('/update-pronouns', async (req, res) => {
  try {
    const { user_id, pronounce } = req.body;
    if (!user_id || !pronounce) {
      return res.status(400).json({ status: false, message: 'user_id and pronounce are required.' });
    }
    const user = await User.findByIdAndUpdate(user_id, { pronounce }, { new: true });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Pronouns updated successfully.', data: { pronounce: user.pronounce } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// Update Gender
router.put('/update-gender', async (req, res) => {
  try {
    const { user_id, genderId } = req.body;
    if (!user_id || !genderId) {
      return res.status(400).json({ status: false, message: 'user_id and genderId are required.' });
    }
    const user = await User.findByIdAndUpdate(user_id, { genderId }, { new: true }).populate('genderId', 'name');
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Gender updated successfully.', data: { gender: user.genderId } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// Update Orientation
router.put('/update-orientation', async (req, res) => {
  try {
    const { user_id, orientation } = req.body;
    if (!user_id || !orientation) {
      return res.status(400).json({ status: false, message: 'user_id and orientation are required.' });
    }
    const user = await User.findByIdAndUpdate(user_id, { orientation }, { new: true }).populate('orientation', 'name');
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Orientation updated successfully.', data: { orientation: user.orientation } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// Update Interests
router.put('/update-interests', async (req, res) => {
  try {
    const { user_id, interests } = req.body;
    if (!user_id || !interests || !Array.isArray(interests)) {
      return res.status(400).json({ status: false, message: 'user_id and interests array are required.' });
    }
    const user = await User.findByIdAndUpdate(user_id, { interests }, { new: true }).populate('interests', 'name');
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Interests updated successfully.', data: { interests: user.interests } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// Update Communication Style
router.put('/update-communication-style', async (req, res) => {
  try {
    const { user_id, communicationStyle } = req.body;
    if (!user_id || !communicationStyle) {
      return res.status(400).json({ status: false, message: 'user_id and communicationStyle are required.' });
    }
    const user = await User.findByIdAndUpdate(user_id, { communicationStyle }, { new: true }).populate('communicationStyle', 'name');
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Communication style updated successfully.', data: { communicationStyle: user.communicationStyle } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// Update Love Language
router.put('/update-love-language', async (req, res) => {
  try {
    const { user_id, loveLanguage } = req.body;
    if (!user_id || !loveLanguage) {
      return res.status(400).json({ status: false, message: 'user_id and loveLanguage are required.' });
    }
    const user = await User.findByIdAndUpdate(user_id, { loveLanguage }, { new: true }).populate('loveLanguage', 'name');
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Love language updated successfully.', data: { loveLanguage: user.loveLanguage } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// Update Icebreaker Prompts
router.put('/update-icebreaker-prompts', async (req, res) => {
  try {
    const { user_id, icebreakerPrompts } = req.body;
    if (!user_id || !icebreakerPrompts || !Array.isArray(icebreakerPrompts)) {
      return res.status(400).json({ status: false, message: 'user_id and icebreakerPrompts array are required.' });
    }
    const user = await User.findByIdAndUpdate(user_id, { icebreakerPrompts }, { new: true });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    return res.status(200).json({ status: true, message: 'Icebreaker prompts updated successfully.', data: { icebreakerPrompts: user.icebreakerPrompts } });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message });
  }
});

// 1. Verify phone or email (send demo code only if user exists; add is_exist param)
router.post('/verify-phone-or-email', async (req, res) => {
  try {
    const { phoneNumber, email } = req.body;
    if (!phoneNumber && !email) {
      return res.status(400).json({ status: false, message: 'Phone number or email is required.' });
    }
    let user = null;
    if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
    } else if (email) {
      user = await User.findOne({ email });
    }
    if (user) {
      return res.status(200).json({
        status: true,
        is_exist: true,
        message: 'Code sent',
        code: '123456'
      });
    } else {
      return res.status(404).json({ status: false, is_exist: false, message: 'User not found' });
    }
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Server error', data: error.message || error });
  }
});

// 2. Verify auth user with phone number and OTP. On success, return user profile data and JWT token (like login/profile), also add is_exist param
router.post('/verify-auth-user', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ status: false, is_exist: false, message: 'Phone number and OTP are required.' });
    }
    if (otp !== '123456') {
      return res.status(400).json({ status: false, is_exist: false, message: 'Invalid or expired OTP.' });
    }
    // Find the user and return full profile + token
    const user = await User.findOne({ phoneNumber })
      .populate('interests', 'name')
      .populate('communicationStyle', 'name')
      .populate('loveLanguage', 'name')
      .populate('orientation', 'name')
      .populate('genderId', 'name')
      .populate('workId', 'name')
      .select('-password -__v');
    if (!user) {
      return res.status(404).json({ status: false, is_exist: false, message: 'User not found.' });
    }
    // Build response (same as login/profile)
    const age = user.birthday ? calculateAge(user.birthday) : null;
    const userResponse = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      age: age,
      work: user.workId ? { id: user.workId._id, name: user.workId.name } : null,
      currentCity: user.currentCity,
      homeTown: user.homeTown,
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
      pronounce: user.pronounce,
      gender: user.genderId ? { id: user.genderId._id, name: user.genderId.name } : null,
      orientation: user.orientation ? { id: user.orientation._id, name: user.orientation.name } : null,
      interests: user.interests?.map(interest => ({ id: interest._id, name: interest.name })) || [],
      communicationStyle: user.communicationStyle ? { id: user.communicationStyle._id, name: user.communicationStyle.name } : null,
      loveLanguage: user.loveLanguage ? { id: user.loveLanguage._id, name: user.loveLanguage.name } : null,
      icebreakerPrompts: user.icebreakerPrompts,
      role: user.role,
      profileType: user.profileType,
      registrationStep: user.registrationStep,
      isRegistrationComplete: user.isRegistrationComplete,
      isPremium: user.isPremium,
      verificationStatus: user.verificationStatus,
      profileImage: user.profileImage ? `${req.protocol}://${req.get('host')}/uploads/profile-photos/${user.profileImage}` : (typeof getProfileImageUrl === 'function' ? getProfileImageUrl(user.photos, req) : null),
      profileCompletion: user.profileCompletion,
      memberSince: user.memberSince ? user.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null,
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes
    };
    if (user.photos && user.photos.length > 0) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      userResponse.photos = user.photos.map(photo => `${baseUrl}/uploads/profile-photos/${photo}`);
    }
    if (user.email) {
      userResponse.email = user.email;
    }
    userResponse.plan = user.plan ? {
      planType: user.plan.planType,
      totalSwipes: user.plan.totalSwipes,
      activatedAt: user.plan.activatedAt ? new Date(user.plan.activatedAt).toISOString() : null
    } : null;
    const token = generateToken(user);
    return res.status(200).json({
      status: true,
      is_exist: true,
      message: 'User verification successful.',
      data: {
        user: userResponse,
        token: token
      }
    });
  } catch (error) {
    return res.status(500).json({ status: false, is_exist: false, message: 'Server error', data: error.message || error });
  }
});

module.exports = router;