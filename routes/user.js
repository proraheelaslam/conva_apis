const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// JWT Secret Key (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Storage config for profile photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile-photos/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename without user ID dependency
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
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
      
      // Step 13: Photos (now optional)
      photos,
      
      // Authentication
      role = 'user',
      
      // Profile Type
      profileType = 'personal'
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
      profileType
    };
    
    // Add photos only if provided
    if (photos && Array.isArray(photos) && photos.length > 0) {
      userData.photos = photos;
    }
    
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

    // Set profile image URL (first photo or default)
    const profileImageUrl = getProfileImageUrl(photos, req);
    user.profileImage = profileImageUrl;
    await user.save();

    // Calculate profile completion percentage
    const profileCompletionPercentage = calculateProfileCompletion(user);
    user.profileCompletion = profileCompletionPercentage;
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // Calculate age from birthday
    const age = calculateAge(user.birthday);

    // Return user data without password
    const userResponse = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      birthday: user.birthday,
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
      profileImage: getProfileImageUrl(user.photos, req),
      profileCompletion: user.profileCompletion,
      memberSince: user.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), // Format as "January 2025"
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes
    };
    
    // Add photos to response only if they exist
    if (user.photos) {
      userResponse.photos = user.photos;
    }
    
    if (email) {
      userResponse.email = user.email;
    }

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
      birthday: user.birthday,
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
      profileImage: getProfileImageUrl(user.photos, req),
      profileCompletion: user.profileCompletion,
      memberSince: user.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes
    };

    // Add photos to response only if they exist
    if (user.photos) {
      userResponse.photos = user.photos;
    }
    
    if (user.email) {
      userResponse.email = user.email;
    }
    
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

// Get all users (public)
router.get('/users', async (req, res) => {
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
      birthday: user.birthday,
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
      profileImage: getProfileImageUrl(user.photos, req),
      profileCompletion: user.profileCompletion,
      memberSince: user.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes
    };

    // Add photos to response only if they exist
    if (user.photos) {
      userResponse.photos = user.photos;
    }
    
    if (user.email) {
      userResponse.email = user.email;
    }

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

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id)
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
      birthday: user.birthday,
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
      profileImage: getProfileImageUrl(user.photos, req),
      profileCompletion: user.profileCompletion,
      memberSince: user.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes
    };

    // Add photos to response only if they exist
    if (user.photos) {
      userResponse.photos = user.photos;
    }
    
    if (user.email) {
      userResponse.email = user.email;
    }

    res.status(200).json({ status: 200, message: 'Profile fetched successfully.', data: userResponse });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 401, message: 'Invalid token.', data: null });
    }
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

 
// Update profile by ID (with optional photo upload)
router.put('/profile/:id', upload.single('photo'), async (req, res) => {
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
    const Work = require('../models/Work');
    const Gender = require('../models/Gender');
    const Orientation = require('../models/Orientation');
    const Interest = require('../models/Interest');
    const CommunicationStyle = require('../models/CommunicationStyle');
    const LoveLanguage = require('../models/LoveLanguage');
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

module.exports = router;