const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

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

    // Generate JWT token
    const token = generateToken(user);

    // Return user data without password
    const userResponse = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      birthday: user.birthday,
      workId: user.workId,
      currentCity: user.currentCity,
      homeTown: user.homeTown,
      pronounce: user.pronounce,
      genderId: user.genderId,
      orientation: user.orientation,
      interests: user.interests,
      communicationStyle: user.communicationStyle,
      loveLanguage: user.loveLanguage,
      icebreakerPrompts: user.icebreakerPrompts,
      role: user.role,
      profileType: user.profileType,
      registrationStep: user.registrationStep,
      isRegistrationComplete: user.isRegistrationComplete
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 400, message: 'Email and password are required.', data: null });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ status: 401, message: 'Invalid email or password.', data: null });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 401, message: 'Invalid email or password.', data: null });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.status(200).json({ 
      status: 200, 
      message: 'Login successful.', 
      data: { 
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          registrationStep: user.registrationStep, 
          isRegistrationComplete: user.isRegistrationComplete 
        },
        token 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: null });
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

// Get user profile by ID
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -__v');
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }
    res.status(200).json({ status: 200, message: 'Profile fetched successfully.', data: user });
  } catch (error) {
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