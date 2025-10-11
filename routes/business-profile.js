const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const BusinessProfile = require('../models/BusinessProfile');
const User = require('../models/User');
const Industry = require('../models/Industry');
const NetworkingGoals = require('../models/NetworkingGoals');

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ status: 401, message: 'Access denied. No token provided.', data: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ status: 400, message: 'Invalid token.', data: null });
  }
};

// Configure multer for business profile photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'business-profile');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload business profile photo
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 400, 
        message: 'No photo file uploaded', 
        data: null 
      });
    }

    // Return the uploaded file name
    res.status(200).json({
      status: 200,
      message: 'Business profile photo uploaded successfully',
      data: {
        filename: req.file.filename,
        size: req.file.size
      }
    });

  } catch (error) {
    res.status(500).json({ 
      status: 500, 
      message: 'Server error', 
      data: error.message || error 
    });
  }
});

// Alias: POST / (same as /create)
router.post('/', async (req, res) => {
  // Use the same logic as /create
  try {
    const {
      userId,
      jobTitle,
      company,
      industry,
      networkingGoals,
      professionalBio,
      skillsAndExpertise,
      professionalPhoto
    } = req.body;
    if (!userId) {
      return res.status(400).json({ status: 400, message: 'User ID is required.', data: null });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }
    const existingProfile = await BusinessProfile.findOne({ user: userId, isActive: true });
    if (existingProfile) {
      return res.status(400).json({ status: 400, message: 'Business profile already exists for this user.', data: null });
    }
    if (!jobTitle || !company) {
      return res.status(400).json({ status: 400, message: 'Job title and company are required.', data: null });
    }
    if (!networkingGoals || !Array.isArray(networkingGoals) || networkingGoals.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one networking goal is required.', data: null });
    }
    if (!professionalBio || professionalBio.length < 20) {
      return res.status(400).json({ status: 400, message: 'Professional bio must be at least 20 characters.', data: null });
    }
    if (!skillsAndExpertise || !Array.isArray(skillsAndExpertise) || skillsAndExpertise.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one skill/expertise is required.', data: null });
    }
    const businessProfile = new BusinessProfile({
      user: userId,
      jobTitle,
      company,
      industry,
      networkingGoals,
      professionalBio,
      skillsAndExpertise,
      professionalPhoto: professionalPhoto || '',
      isComplete: true,
      currentStep: 5
    });
    await businessProfile.save();
    user.profileType = 'business';
    await user.save();
    
    const populatedProfile = await BusinessProfile.findById(businessProfile._id)
      .populate('user', 'name email profileType profilePhoto')
      .populate('industry')
      .populate('networkingGoals');
    
    // Add complete photo URL if professionalPhoto exists
    if (populatedProfile.professionalPhoto) {
      populatedProfile.professionalPhoto = `${req.protocol}://${req.get('host')}/uploads/business-profile/${populatedProfile.professionalPhoto}`;
    }
    
    // Generate JWT token (non-expiring)
    const token = jwt.sign(
      { userId: populatedProfile.user._id, profileType: 'business' },
      JWT_SECRET
    );
    
    res.status(201).json({
      status: 201,
      message: 'Business profile created successfully.',
      data: populatedProfile,
      token: token
    });
  } catch (error) {
    console.error('Create business profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get user's business profile (token-based)
router.get('/my-profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const businessProfile = await BusinessProfile.findOne({ user: userId, isActive: true })
      .populate('user', 'name email profileType profilePhoto')
      .populate('industry')
      .populate('networkingGoals');

    if (!businessProfile) {
      return res.status(404).json({ status: 404, message: 'Business profile not found.', data: null });
    }

    // Add complete photo URL if professionalPhoto exists
    if (businessProfile.professionalPhoto) {
      businessProfile.professionalPhoto = `${req.protocol}://${req.get('host')}/uploads/business-profile/${businessProfile.professionalPhoto}`;
    }

    res.status(200).json({
      status: 200,
      message: 'Business profile fetched successfully.',
      data: businessProfile
    });
  } catch (error) {
    console.error('Get business profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Update business profile
router.put('/update/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      jobTitle,
      company,
      industry,
      networkingGoals,
      professionalBio,
      skillsAndExpertise,
      professionalPhoto
    } = req.body;

    const businessProfile = await BusinessProfile.findOne({ user: userId, isActive: true });
    if (!businessProfile) {
      return res.status(404).json({ status: 404, message: 'Business profile not found.', data: null });
    }

    // Update fields
    const updates = {};
    if (jobTitle !== undefined) updates.jobTitle = jobTitle;
    if (company !== undefined) updates.company = company;
    if (industry !== undefined) updates.industry = industry;
    if (networkingGoals !== undefined) updates.networkingGoals = Array.isArray(networkingGoals) ? networkingGoals : [];
    if (professionalBio !== undefined) updates.professionalBio = professionalBio;
    if (skillsAndExpertise !== undefined) updates.skillsAndExpertise = Array.isArray(skillsAndExpertise) ? skillsAndExpertise : [];
    if (professionalPhoto !== undefined) updates.professionalPhoto = professionalPhoto;

    const updatedProfile = await BusinessProfile.findByIdAndUpdate(
      businessProfile._id,
      updates,
      { new: true }
    ).populate('user', 'name email profileType profilePhoto')
     .populate('industry')
     .populate('networkingGoals');

    res.status(200).json({
      status: 200,
      message: 'Business profile updated successfully.',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Update business profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Delete business profile (soft delete)
router.delete('/delete/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const businessProfile = await BusinessProfile.findOne({ user: userId, isActive: true });
    if (!businessProfile) {
      return res.status(404).json({ status: 404, message: 'Business profile not found.', data: null });
    }

    businessProfile.isActive = false;
    await businessProfile.save();

    res.status(200).json({
      status: 200,
      message: 'Business profile deleted successfully.',
      data: null
    });
  } catch (error) {
    console.error('Delete business profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get all business profiles (for discovery/search)
router.get('/discover', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      industry,
      networkingGoal,
      skill
    } = req.query;

    const filter = { isActive: true, isComplete: true };

    // Apply filters
    if (industry) {
      filter.industry = { $regex: new RegExp(industry, 'i') };
    }
    if (networkingGoal) {
      filter.networkingGoals = { $in: [new RegExp(networkingGoal, 'i')] };
    }
    if (skill) {
      filter.skillsAndExpertise = { $in: [new RegExp(skill, 'i')] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const businessProfiles = await BusinessProfile.find(filter)
      .populate('user', 'name profileType profilePhoto')
      .populate('industry')
      .populate('networkingGoals')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BusinessProfile.countDocuments(filter);

    res.status(200).json({
      status: 200,
      message: 'Business profiles fetched successfully.',
      data: {
        businessProfiles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProfiles: total,
          hasNextPage: skip + businessProfiles.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Discover business profiles error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Reference data for Business Profile creation
router.get('/reference-data', async (req, res) => {
  try {
    const [industries, networkingGoals] = await Promise.all([
      Industry.find({ isActive: true }).sort({ name: 1 }),
      NetworkingGoals.find({ isActive: true }).sort({ name: 1 })
    ]);

    res.status(200).json({
      status: 200,
      message: 'Business profile reference data fetched successfully.',
      data: {
        industries,
        networkingGoals
      }
    });
  } catch (error) {
    console.error('Business reference-data error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get business profile by ID (public view)
router.get('/:id', async (req, res) => {
  try {
    const businessProfile = await BusinessProfile.findById(req.params.id)
      .populate('user', 'name profileType profilePhoto')
      .populate('industry')
      .populate('networkingGoals');

    if (!businessProfile || !businessProfile.isActive) {
      return res.status(404).json({ status: 404, message: 'Business profile not found.', data: null });
    }

    res.status(200).json({
      status: 200,
      message: 'Business profile fetched successfully.',
      data: businessProfile
    });
  } catch (error) {
    console.error('Get business profile by ID error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

module.exports = router;
